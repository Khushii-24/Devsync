# backend/app/api/ai.py
import json
import httpx
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.core.rag import retrieve_context
from app.core.dependencies import get_current_user
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.tasks import get_task_or_404
from app.schemas.ai import DecomposeResponse, DecomposeRequest, DigestResponse, DigestRequest, ExplainCodeRequest, ExplainCodeResponse
from app.core.digest import build_digest_input
from app.api.deps import get_project_or_404  
from app.core.ai_prompts import DECOMPOSE_SYSTEM_PROMPT, DIGEST_SYSTEM_PROMPT
from pydantic import ValidationError
from app.core.config import settings
router = APIRouter()

OLLAMA_URL = f"{settings.OLLAMA_URL.rstrip('/')}/api/generate"
OLLAMA_MODEL = settings.OLLAMA_MODEL


class ChatRequest(BaseModel):
    project_id: str
    query: str


def build_prompt(query: str, chunks: list[dict]) -> str:
    if not chunks:
        context = "No relevant project content was found."
    else:
        context = "\n\n".join(
            f"[Source: {c['source_type']} {c['chunk_id']}]\n{c['content']}"
            for c in chunks
        )
    return (
        "You are an assistant answering questions about a specific project's tasks and documents. "
        "Use ONLY the context below to answer. If the context doesn't contain the answer, say so.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {query}\n\nAnswer:"
    )


@router.post("/ai/chat")
async def chat(payload: ChatRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    chunks = retrieve_context(db, query=payload.query, project_id=payload.project_id, top_k=5)
    prompt = build_prompt(payload.query, chunks)

    async def event_stream():
        # Handle empty retrieval
        if not chunks:
            yield "event: sources\ndata: []\n\n"
            friendly_msg = "I couldn't find any relevant tasks or documents in this project to answer your question."
            yield f"event: token\ndata: {json.dumps({'text': friendly_msg})}\n\n"
            yield "event: done\ndata: {}\n\n"
            return

        # Send source citations first as a distinct SSE event, before any generation tokens
        sources_payload = json.dumps([
            {
                "chunk_id": c["chunk_id"],
                "source_type": c["source_type"],
                "source_id": c["source_id"],
                "project_id": payload.project_id,
            }
            for c in chunks
        ])
        yield f"event: sources\ndata: {sources_payload}\n\n"

        try:
            # Configure 10s timeout to avoid hanging if Ollama is unresponsive
            async with httpx.AsyncClient(timeout=10.0) as client:
                async with client.stream(
                    "POST", OLLAMA_URL,
                    json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": True},
                ) as response:
                    if response.status_code != 200:
                        raise httpx.HTTPStatusError("Ollama returned an error status code", request=None, response=response)
                    
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        chunk = json.loads(line)  # Ollama streams one JSON object per line
                        token = chunk.get("response", "")
                        if token:
                            # SSE format: "data: <payload>\n\n"
                            yield f"event: token\ndata: {json.dumps({'text': token})}\n\n"
                        if chunk.get("done"):
                            yield "event: done\ndata: {}\n\n"
                            break
        except (httpx.ConnectError, httpx.ConnectTimeout, httpx.NetworkError, httpx.RequestError) as e:
            # Ollama not running, timeout or connection failure
            yield f"event: error\ndata: {json.dumps({'message': 'Ollama service is unavailable. Please make sure Ollama is running.'})}\n\n"
        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'message': f'An unexpected error occurred: {str(e)}'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

async def _call_ollama_json(system_prompt: str, user_prompt: str) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            OLLAMA_URL.replace("/generate", "/chat"),
            json={
                "model": OLLAMA_MODEL  ,
                "format": "json",
                "stream": False,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
        )
        resp.raise_for_status()
        raw_content = resp.json()["message"]["content"]
        return json.loads(raw_content)  # format:"json" guarantees valid JSON syntax, not our schema


async def _call_ollama_prose(system_prompt: str, user_prompt: str) -> str:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            OLLAMA_URL.replace("/generate", "/chat"),
            json={
                "model": OLLAMA_MODEL,
                "stream": False,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
        )
        resp.raise_for_status()
        return resp.json()["message"]["content"]



@router.post("/ai/decompose", response_model=DecomposeResponse)
async def decompose_task(
    payload: DecomposeRequest,  # { task_id: UUID }  — ASSUMPTION: define alongside DecomposeResponse
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    task = get_task_or_404(payload.task_id, db)  # existing helper, project-scoped

    user_prompt = f"Task title: {task.title}\nTask description: {task.description or '(none)'}"

    # Retry once on schema mismatch — JSON mode guarantees syntax, not shape, so a single
    # malformed response isn't unusual with a small local model like llama3.2:3b
    last_error = None
    for attempt in range(2):
        try:
            raw = await _call_ollama_json(DECOMPOSE_SYSTEM_PROMPT, user_prompt)
            return DecomposeResponse.model_validate(raw)
        except (json.JSONDecodeError, ValidationError) as e:
            last_error = e
            continue
        except httpx.HTTPError:
            raise HTTPException(status_code=503, detail="AI service unavailable — is Ollama running?")

    raise HTTPException(status_code=502, detail=f"AI returned malformed output after retry: {last_error}")

@router.post("/ai/digest", response_model=DigestResponse)
async def generate_digest(
    payload: DigestRequest,  # { project_id: UUID } — ASSUMPTION: define alongside DigestResponse
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = get_project_or_404(payload.project_id, db)  # existing helper, access-control checked here

    digest_input = build_digest_input(db, project.id)

    if digest_input["total_events"] == 0:
        return DigestResponse(
            period_summary="No activity recorded in the past 7 days.",
            completed_tasks=[],
            blockers=[],
            top_contributors=[],
        )

    user_prompt = json.dumps(digest_input)

    last_error = None
    for attempt in range(2):
        try:
            raw = await _call_ollama_json(DIGEST_SYSTEM_PROMPT, user_prompt)  # reused from Day 3
            return DigestResponse.model_validate(raw)
        except (json.JSONDecodeError, ValidationError) as e:
            last_error = e
            continue
        except httpx.HTTPError:
            raise HTTPException(status_code=503, detail="AI service unavailable — is Ollama running?")

    raise HTTPException(status_code=502, detail=f"AI returned malformed output after retry: {last_error}")


@router.post("/ai/explain-code", response_model=ExplainCodeResponse)
async def explain_code(
    payload: ExplainCodeRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    task = get_task_or_404(payload.task_id, db)

    system_prompt = (
        "explain what the code does in 2-4 sentences in plain language, "
        "grounded in the task's title/description context, no markdown headers, "
        "don't repeat the code back."
    )

    user_prompt = (
        f"Task title: {task.title}\n"
        f"Task description: {task.description or '(none)'}\n"
        f"Code language: {payload.language or 'unknown'}\n"
        f"Code:\n{payload.code}"
    )

    try:
        explanation = await _call_ollama_prose(system_prompt, user_prompt)
        return ExplainCodeResponse(explanation=explanation)
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="AI service unavailable — is Ollama running?")