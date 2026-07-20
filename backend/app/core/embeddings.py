# backend/app/core/embeddings.py
import uuid
import hashlib
import math
import re
from sqlalchemy.orm import Session
from app.models.chunk import Chunk

CHUNK_SIZE = 500       # characters per chunk
CHUNK_OVERLAP = 50     # overlap so context isn't cut mid-thought at boundaries


def chunk_text(text: str) -> list[str]:
    """Simple sliding-window chunker. Production systems would split on sentence/paragraph
    boundaries (e.g. via a tokenizer-aware splitter) rather than raw character counts."""
    if len(text) <= CHUNK_SIZE:
        return [text] if text.strip() else []

    chunks = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        chunks.append(text[start:end])
        start = end - CHUNK_OVERLAP
    return [c for c in chunks if c.strip()]


def generate_embedding(text: str) -> list[float]:
    """Pure-python hash-based 384-dimensional embedding generator.
    Safe from AppLocker/WDAC DLL blocks, runs without torch."""
    dim = 384
    vec = [0.0] * dim
    
    # Simple tokenization: lowercase alphanumeric words and character 3-grams
    words = re.findall(r'\w+', text.lower())
    # Add char 3-grams to capture sub-word features
    char_grams = [text[i:i+3].lower() for i in range(len(text) - 2)]
    
    tokens = words + char_grams
    if not tokens:
        tokens = ["empty"]
        
    for token in tokens:
        # Generate hash for index and sign
        h = hashlib.sha256(token.encode('utf-8')).digest()
        # Use first 4 bytes for index, next 4 bytes for sign
        idx = int.from_bytes(h[:4], byteorder='big') % dim
        sign = 1 if (int.from_bytes(h[4:8], byteorder='big') % 2 == 0) else -1
        vec[idx] += sign
        
    # L2 Normalization
    norm = math.sqrt(sum(x*x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    else:
        vec = [0.0] * dim
        vec[0] = 1.0
        
    return vec



def upsert_embedding(
    db: Session,
    project_id: uuid.UUID,
    source_type: str,   # "document" | "task"
    source_id: uuid.UUID,
    text: str,
):
    """Deletes existing chunks for this source, then re-chunks + re-embeds from scratch.
    Simpler and safer than diffing old vs new chunks — acceptable cost at this data scale."""
    db.query(Chunk).filter(
        Chunk.source_type == source_type,
        Chunk.source_id == source_id,
    ).delete()

    pieces = chunk_text(text)
    for piece in pieces:
        db.add(Chunk(
            id=uuid.uuid4(),
            project_id=project_id,
            source_type=source_type,
            source_id=source_id,
            content=piece,
            embedding=generate_embedding(piece),
        ))
    db.commit()


def delete_embeddings(db: Session, source_type: str, source_id: uuid.UUID):
    """Call when a Document/Task is deleted. No FK cascade exists (source_id isn't a real FK),
    so this must be called explicitly from the delete endpoints."""
    db.query(Chunk).filter(
        Chunk.source_type == source_type,
        Chunk.source_id == source_id,
    ).delete()
    db.commit()

# backend/app/core/embeddings.py — add this helper
def extract_plain_text(tiptap_json: dict) -> str:
    """Walks TipTap's JSON doc structure and concatenates text nodes.
    Simplification: ignores marks/formatting entirely, just pulls raw text — fine for embedding purposes."""
    parts = []
    def walk(node):
        if isinstance(node, dict):
            if node.get("type") == "text":
                parts.append(node.get("text", ""))
            for child in node.get("content", []):
                walk(child)
    walk(tiptap_json)
    return " ".join(parts)
