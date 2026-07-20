# backend/scripts/test_retrieval.py — throwaway script, not part of the app
from app.db.database import SessionLocal  # adjust to your actual session factory
from app.core.rag import retrieve_context
# from app.models.project import Project
import uuid

db = SessionLocal()
project_id = uuid.UUID("7eee8a0b-78e5-4cbf-9cf3-48b06f44497a")

# Try to get the first project from the database dynamically
# project = db.query(Project).first()
# if not project:
#     print("Error: No projects found in the database. Please create or seed a project first.")
#     db.close()
#     exit(1)

# project_id = project.id
# print(f"Testing retrieval for project: '{project.name}' (ID: {project_id})")

results = retrieve_context(db, query="authentication", project_id="c76ac522-30ad-48c5-a2b7-18770f145ab3", top_k=5)

for r in results:
    print(f"[{r['distance']:.4f}] {r['source_type']} {r['source_id']}: {r['content'][:80]}")

db.close()