# backend/app/core/rag.py
import uuid
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.chunk import Chunk
from app.core.embeddings import generate_embedding


import re

def is_relevant(query: str, chunk_content: str, distance: float) -> bool:
    """Helper to determine if a chunk is relevant to the query based on distance and keyword overlap."""
    if distance < 0.85:
        return True
    if distance > 0.98:
        return False
    # Check word overlap for words of length > 3 to avoid stop word matches
    query_words = {w.lower() for w in re.findall(r"\w+", query) if len(w) > 3}
    chunk_words = {w.lower() for w in re.findall(r"\w+", chunk_content)}
    if not query_words:
        return distance < 0.95
    return bool(query_words & chunk_words)


def retrieve_context(db: Session, query: str, project_id: uuid.UUID, top_k: int = 5) -> list[dict]:
    """Embeds the query with the SAME MiniLM model used on source content, then finds
    the top_k closest chunks within the given project via pgvector cosine distance."""
    query_embedding = generate_embedding(query)

    # <=> is pgvector's cosine distance operator (smaller = more similar)
    distance = Chunk.embedding.cosine_distance(query_embedding)

    rows = (
        db.query(Chunk, distance.label("distance"))
        .filter(Chunk.project_id == project_id)  # scoped — never trust a client-supplied project_id elsewhere in the chain
        .order_by(distance)
        .limit(top_k)
        .all()
    )
    print("\n========== Retrieved Chunks ==========")
    for chunk, dist in rows:
        print(
            f"{chunk.source_type:10} | "
            f"{dist:.4f} | "
            f"{chunk.content}"
        )
    print("======================================\n")

    results = []
    for chunk, dist in rows:
        dist_val = float(dist)
        if is_relevant(query, chunk.content, dist_val):
            results.append({
                "chunk_id": str(chunk.id),
                "source_type": chunk.source_type,
                "source_id": str(chunk.source_id),
                "content": chunk.content,
                "distance": dist_val,
            })
            
    return results