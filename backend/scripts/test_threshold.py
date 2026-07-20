import sys
import os
sys.path.append(os.getcwd())

from app.db.database import SessionLocal
from app.core.rag import retrieve_context

db = SessionLocal()
queries = [
    "Who won FIFA World Cup?",
    "What is the capital of France?",
]
for q in queries:
    print(f"QUERY: {q}")
    res = retrieve_context(db, q, "7eee8a0b-78e5-4cbf-9cf3-48b06f44497a")
    for r in res:
        print(f"  -> dist: {r['distance']:.4f} | {r['source_type']} | {r['content'][:60]}")
db.close()
