"""
DevSync Database Seeding Script
================================

This script seeds a rich, realistic dataset for demonstration purposes. It populates
the database with users, workspaces, projects, board columns, tasks, documents,
RAG embeddings, activity logs, notifications, and soft-deleted items.

Usage:
------
Run locally against your database config:
    $env:DATABASE_URL = "postgresql://user:password@host:port/dbname"
    poetry run python scripts/seed.py
"""

import sys
import os
import uuid
from datetime import datetime, timedelta, timezone

# Add backend directory to path so imports work correctly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WorkspaceRole
from app.models.project import Project
from app.models.project_member import ProjectMember, ProjectRole
from app.models.column import Column
from app.models.task import Task, TaskPriority
from app.models.document import Document, DocumentVersion
from app.models.activity_log import ActivityLog, ActivityEventType
from app.models.notification import Notification, NotificationType
from app.core.security import hash_password
from app.core.embeddings import upsert_embedding
from app.core.activity import log_activity


def seed_data():
    db = SessionLocal()
    try:
        print("--- Start Seeding Process ---")
        
        # 1. Users Setup
        password_hash = hash_password("password123")
        users_data = [
            {"email": "demo@devsync.io", "username": "demo_user", "role": WorkspaceRole.OWNER},
            {"email": "sarah.chen@devsync.io", "username": "sarah_chen", "role": WorkspaceRole.ADMIN},
            {"email": "marcus.vance@devsync.io", "username": "marcus_vance", "role": WorkspaceRole.MEMBER},
        ]
        
        seeded_users = {}
        for u in users_data:
            user = db.query(User).filter(User.email == u["email"]).first()
            if not user:
                user = User(
                    email=u["email"],
                    username=u["username"],
                    hashed_password=password_hash,
                    is_active=True
                )
                db.add(user)
                db.flush()
                print(f"Created user: {u['email']}")
            else:
                print(f"User already exists: {u['email']}")
            seeded_users[u["email"]] = user

        # 2. Workspace Setup
        ws_slug = "quantum-suite"
        ws = db.query(Workspace).filter(Workspace.slug == ws_slug).first()
        if not ws:
            ws = Workspace(
                name="Quantum Product Suite",
                slug=ws_slug
            )
            db.add(ws)
            db.flush()
            print(f"Created workspace: {ws.name}")
        else:
            print(f"Workspace already exists: {ws.name}")

        # Workspace Membership Roles
        for u in users_data:
            user_obj = seeded_users[u["email"]]
            wm = db.query(WorkspaceMember).filter(
                WorkspaceMember.workspace_id == ws.id,
                WorkspaceMember.user_id == user_obj.id
            ).first()
            if not wm:
                wm = WorkspaceMember(
                    workspace_id=ws.id,
                    user_id=user_obj.id,
                    role=u["role"]
                )
                db.add(wm)
                db.flush()
                print(f"Added {u['email']} to workspace as {u['role'].value}")

        # 3. Projects Setup (2 projects)
        projects_data = [
            {
                "name": "Mobile App Revamp",
                "description": "Redesigning iOS and Android user experiences with modern dark mode and real-time sync."
            },
            {
                "name": "AI Assistant Core",
                "description": "LLM-backed intelligent task breakdown and context-aware chat assistant."
            }
        ]

        seeded_projects = {}
        for p in projects_data:
            proj = db.query(Project).filter(
                Project.workspace_id == ws.id,
                Project.name == p["name"]
            ).first()
            if not proj:
                proj = Project(
                    workspace_id=ws.id,
                    name=p["name"],
                    description=p["description"]
                )
                db.add(proj)
                db.flush()
                print(f"Created project: {p['name']}")
            else:
                print(f"Project already exists: {p['name']}")
            seeded_projects[p["name"]] = proj

        # Project Member Overrides
        # Assign 'marcus.vance@devsync.io' as VIEWER-only on Mobile App Revamp project
        member_user = seeded_users["marcus.vance@devsync.io"]
        p1_obj = seeded_projects["Mobile App Revamp"]
        pm_override = db.query(ProjectMember).filter(
            ProjectMember.project_id == p1_obj.id,
            ProjectMember.user_id == member_user.id
        ).first()
        if not pm_override:
            pm_override = ProjectMember(
                project_id=p1_obj.id,
                user_id=member_user.id,
                role=ProjectRole.VIEWER
            )
            db.add(pm_override)
            db.flush()
            print(f"Added ProjectMember override (Viewer) for {member_user.email} on {p1_obj.name}")

        # 4. Columns & Tasks Setup (25+ tasks)
        task_specs = [
            # Mobile App Revamp tasks (Project 1)
            ("Design Figma Component Library", "Build reusable dark mode UI tokens and icons.", TaskPriority.HIGH, "To Do", 0, 10, "demo@devsync.io"),
            ("Set up OAuth2 & JWT Refresh Flow", "Implement secure refresh tokens in FastAPI backend.", TaskPriority.URGENT, "In Progress", 1, 9, "sarah.chen@devsync.io"),
            ("Integrate SSE Push Notifications", "Connect frontend notification bell with Server-Sent Events stream.", TaskPriority.MEDIUM, "In Progress", 2, 8, "marcus.vance@devsync.io"),
            ("Optimize Recharts Bundle Size", "Code split heavy charting component code.", TaskPriority.LOW, "Code Review", 3, 7, "demo@devsync.io"),
            ("Audit Project Roles & Overrides", "Ensure Viewer role cannot mutate board columns.", TaskPriority.HIGH, "Done", 4, 6, "sarah.chen@devsync.io"),
            ("Write Cypress E2E Login Tests", "Automate authentication test suite for regression testing.", TaskPriority.MEDIUM, "Done", 5, 5, "marcus.vance@devsync.io"),
            ("Add App Store Assets", "Create beautiful promotional banners and app icons.", TaskPriority.LOW, "To Do", 6, 4, "demo@devsync.io"),
            ("Fix iOS Touch Target Size", "Increase touch targets to at least 44x44px for accessibility.", TaskPriority.MEDIUM, "To Do", 7, 3, "marcus.vance@devsync.io"),
            ("Setup Sentry Error Logging", "Monitor runtime frontend errors in production.", TaskPriority.HIGH, "In Progress", 8, 2, "sarah.chen@devsync.io"),
            ("Configure Docker Compose Multi-Stage", "Optimize backend Docker build sizes using multi-stage builds.", TaskPriority.LOW, "Done", 9, 1, "demo@devsync.io"),
            ("Migrate to Tailwind CSS v4", "Verify compatibility and migrate custom theme config.", TaskPriority.MEDIUM, "To Do", 10, 0, "sarah.chen@devsync.io"),
            ("Implement Pull to Refresh", "Add native feel pull-to-refresh on mobile dashboards.", TaskPriority.LOW, "To Do", 11, 2, "marcus.vance@devsync.io"),
            ("Fix Token Expiry Bug", "Handle grace periods for expired refresh tokens in interceptors.", TaskPriority.HIGH, "Done", 12, 4, "sarah.chen@devsync.io"),
            
            # AI Assistant Core tasks (Project 2)
            ("Implement pgvector Embedding Storage", "Index task descriptions for similarity search.", TaskPriority.HIGH, "In Progress", 0, 10, "sarah.chen@devsync.io"),
            ("Fine-tune Prompt Templates", "Improve task breakdown subtask suggestions accuracy.", TaskPriority.MEDIUM, "Backlog", 1, 9, "demo@devsync.io"),
            ("Benchmark LLM Latency", "Compare generation times across model backends.", TaskPriority.LOW, "Backlog", 2, 8, "marcus.vance@devsync.io"),
            ("Build RAG Context Builder", "Assemble retrieved document chunks into clean prompt templates.", TaskPriority.HIGH, "Completed", 3, 7, "demo@devsync.io"),
            ("Add SSE Streaming Response Handler", "Render tokens live as they are generated by Ollama.", TaskPriority.URGENT, "Completed", 4, 6, "sarah.chen@devsync.io"),
            ("Implement Code Explainer UI Panel", "Add side-panel showing explanation of highlighted code blocks.", TaskPriority.MEDIUM, "In Progress", 5, 5, "marcus.vance@devsync.io"),
            ("Design Weekly Digest PDF Layout", "Draft report format for project stakeholders.", TaskPriority.LOW, "Backlog", 6, 4, "demo@devsync.io"),
            ("Setup Ollama GPU Acceleration", "Configure docker-compose to pass NVIDIA GPU drivers.", TaskPriority.HIGH, "Completed", 7, 3, "sarah.chen@devsync.io"),
            ("Write RAG Retrieval Tests", "Verify recall metrics on task-based prompt searches.", TaskPriority.MEDIUM, "In Progress", 8, 2, "marcus.vance@devsync.io"),
            ("Optimize Cosine Distance Indexing", "Create HNSW index on pgvector chunks database table.", TaskPriority.URGENT, "Backlog", 9, 1, "demo@devsync.io"),
            ("Add AI Feedback Loop Interface", "Allow users to thumbs up/down AI generated summaries.", TaskPriority.LOW, "Backlog", 10, 0, "marcus.vance@devsync.io"),
            ("Setup Local model download scripts", "Write bash commands to automatically pull llama3.2:3b on start.", TaskPriority.MEDIUM, "Completed", 11, 1, "sarah.chen@devsync.io"),
        ]

        # Ensure Column Setup for both projects
        columns_map = {}
        for p_name, proj in seeded_projects.items():
            col_names = ["To Do", "In Progress", "Code Review", "Done"] if p_name == "Mobile App Revamp" else ["Backlog", "In Progress", "Completed"]
            for idx, c_name in enumerate(col_names):
                col = db.query(Column).filter(
                    Column.project_id == proj.id,
                    Column.name == c_name
                ).first()
                if not col:
                    col = Column(
                        project_id=proj.id,
                        name=c_name,
                        position=idx
                    )
                    db.add(col)
                    db.flush()
                    print(f"Created Column: {c_name} for Project {p_name}")
                columns_map[(proj.id, c_name)] = col

        # Seed Tasks
        print("\n--- Seeding Tasks ---")
        seeded_tasks = []
        now = datetime.now(timezone.utc)
        
        for title, desc, priority, col_name, position, days_ago, assignee_email in task_specs:
            # Pick correct project
            proj_obj = p1_obj if col_name in ["To Do", "Code Review", "Done"] or (col_name == "In Progress" and ("Figma" in title or "OAuth2" in title or "SSE" in title or "Sentry" in title)) else seeded_projects["AI Assistant Core"]
            col_obj = columns_map[(proj_obj.id, col_name)]
            assignee = seeded_users[assignee_email]
            
            task = db.query(Task).filter(
                Task.project_id == proj_obj.id,
                Task.title == title
            ).first()
            
            created_time = now - timedelta(days=days_ago)
            updated_time = created_time + timedelta(hours=4)
            
            if not task:
                task = Task(
                    project_id=proj_obj.id,
                    column_id=col_obj.id,
                    assignee_id=assignee.id,
                    title=title,
                    description=desc,
                    priority=priority,
                    position=position,
                    created_at=created_time,
                    updated_at=updated_time
                )
                db.add(task)
                db.flush()
                print(f"Created task: {title}")
            else:
                print(f"Task already exists: {title}")
            seeded_tasks.append(task)

        # 5. Seed Documents
        print("\n--- Seeding Documents ---")
        doc_specs = [
            {
                "title": "Quantum Authentication Specs",
                "proj_name": "Mobile App Revamp",
                "content": {
                    "type": "doc",
                    "content": [
                        {
                            "type": "heading",
                            "attrs": {"level": 1},
                            "content": [{"type": "text", "text": "OAuth2 Implementation Details"}]
                        },
                        {
                            "type": "paragraph",
                            "content": [
                                {"type": "text", "text": "This spec describes the login & refresh tokens workflow assigned to "},
                                {
                                    "type": "mention",
                                    "attrs": {
                                        "id": str(seeded_users["sarah.chen@devsync.io"].id),
                                        "label": "sarah_chen"
                                    }
                                },
                                {"type": "text", "text": ". Make sure to reference task "},
                                {
                                    "type": "taskChip",
                                    "attrs": {
                                        "taskId": str(seeded_tasks[1].id), # OAuth2 task
                                        "taskTitle": seeded_tasks[1].title,
                                        "taskStatus": seeded_tasks[1].priority.value
                                    }
                                },
                                {"type": "text", "text": " when reviewing PRs."}
                            ]
                        }
                    ]
                }
            },
            {
                "title": "AI Model Deployment Guide",
                "proj_name": "AI Assistant Core",
                "content": {
                    "type": "doc",
                    "content": [
                        {
                            "type": "heading",
                            "attrs": {"level": 1},
                            "content": [{"type": "text", "text": "Ollama CPU/GPU Integration"}]
                        },
                        {
                            "type": "paragraph",
                            "content": [
                                {"type": "text", "text": "Deployment steps for running local models. Task "},
                                {
                                    "type": "taskChip",
                                    "attrs": {
                                        "taskId": str(seeded_tasks[13].id), # pgvector task
                                        "taskTitle": seeded_tasks[13].title,
                                        "taskStatus": seeded_tasks[13].priority.value
                                    }
                                },
                                {"type": "text", "text": " was completed by "},
                                {
                                    "type": "mention",
                                    "attrs": {
                                        "id": str(seeded_users["demo@devsync.io"].id),
                                        "label": "demo_user"
                                    }
                                },
                                {"type": "text", "text": " to support vector database lookups."}
                            ]
                        }
                    ]
                }
            }
        ]

        for ds in doc_specs:
            proj = seeded_projects[ds["proj_name"]]
            doc = db.query(Document).filter(
                Document.project_id == proj.id,
                Document.title == ds["title"]
            ).first()
            
            if not doc:
                doc = Document(
                    project_id=proj.id,
                    workspace_id=ws.id,
                    title=ds["title"],
                    content=ds["content"],
                    created_by=seeded_users["demo@devsync.io"].id,
                    content_text="Documentation containing tech specifications and code guidelines."
                )
                db.add(doc)
                db.flush()
                print(f"Created Document: {ds['title']}")
                
                # Document Version Snapshot
                ver = DocumentVersion(
                    document_id=doc.id,
                    content=ds["content"],
                    version_number=1,
                    created_by=seeded_users["demo@devsync.io"].id
                )
                db.add(ver)
                db.flush()
            else:
                print(f"Document already exists: {ds['title']}")

        # 6. RAG Embeddings (Step 5)
        # Compute embeddings for seeded tasks & documents using existing pipeline helper
        print("\n--- Generating Embeddings for RAG ---")
        all_db_tasks = db.query(Task).filter(Task.project_id.in_([p.id for p in seeded_projects.values()])).all()
        for t in all_db_tasks:
            text_to_embed = f"{t.title} - {t.description or ''}"
            upsert_embedding(db, t.project_id, "task", t.id, text_to_embed)
        
        all_db_docs = db.query(Document).filter(Document.workspace_id == ws.id).all()
        for d in all_db_docs:
            from app.core.embeddings import extract_plain_text
            text_to_embed = f"{d.title} - {extract_plain_text(d.content)}"
            upsert_embedding(db, d.project_id, "document", d.id, text_to_embed)
        print("Generated and stored embeddings in postgres 'chunks' table successfully!")

        # 7. Activity Logs, Notifications, Soft-Deleted Items
        print("\n--- Seeding Activity Logs & Notifications ---")
        
        # Soft-delete one task and one project
        task_to_soft_delete = db.query(Task).filter(Task.title == "Benchmark LLM Latency").first()
        if task_to_soft_delete and task_to_soft_delete.deleted_at is None:
            task_to_soft_delete.deleted_at = now - timedelta(days=1)
            print(f"Soft-deleted task: {task_to_soft_delete.title}")
            
        # Log activities
        activity_specs = [
            (p1_obj.id, seeded_tasks[0].id, ActivityEventType.TASK_CREATED, "demo@devsync.io", {"title": seeded_tasks[0].title}, 10),
            (p1_obj.id, seeded_tasks[1].id, ActivityEventType.TASK_CREATED, "sarah.chen@devsync.io", {"title": seeded_tasks[1].title}, 9),
            (p1_obj.id, seeded_tasks[1].id, ActivityEventType.TASK_UPDATED, "sarah.chen@devsync.io", {"title": seeded_tasks[1].title, "status": "In Progress"}, 8),
            (p1_obj.id, seeded_tasks[4].id, ActivityEventType.TASK_MOVED, "demo@devsync.io", {"title": seeded_tasks[4].title, "column": "Done"}, 6),
        ]
        
        for proj_id, task_id, event_type, actor_email, event_data, days_ago in activity_specs:
            actor = seeded_users[actor_email]
            log_entry = log_activity(
                db,
                workspace_id=ws.id,
                project_id=proj_id,
                event_type=event_type,
                task_id=task_id,
                actor_id=actor.id,
                event_data=event_data
            )
            log_entry.created_at = now - timedelta(days=days_ago)
            db.flush()

        # Seed Notifications (Read & Unread)
        notifications_data = [
            {
                "recipient": "demo@devsync.io",
                "actor": "sarah.chen@devsync.io",
                "task": seeded_tasks[1],
                "type": NotificationType.ASSIGNED,
                "payload": {"task_title": seeded_tasks[1].title},
                "is_read": False
            },
            {
                "recipient": "demo@devsync.io",
                "actor": "marcus.vance@devsync.io",
                "task": seeded_tasks[2],
                "type": NotificationType.MENTION,
                "payload": {"document_title": "Quantum Authentication Specs"},
                "is_read": True
            },
            {
                "recipient": "sarah.chen@devsync.io",
                "actor": "demo@devsync.io",
                "task": seeded_tasks[0],
                "type": NotificationType.TASK_DONE,
                "payload": {"task_title": seeded_tasks[0].title},
                "is_read": False
            }
        ]

        for nd in notifications_data:
            recipient = seeded_users[nd["recipient"]]
            actor = seeded_users[nd["actor"]]
            notif = db.query(Notification).filter(
                Notification.recipient_id == recipient.id,
                Notification.type == nd["type"],
                Notification.task_id == nd["task"].id
            ).first()
            
            if not notif:
                notif = Notification(
                    recipient_id=recipient.id,
                    actor_id=actor.id,
                    workspace_id=ws.id,
                    project_id=nd["task"].project_id,
                    task_id=nd["task"].id,
                    type=nd["type"],
                    payload=nd["payload"],
                    is_read=nd["is_read"]
                )
                db.add(notif)
                db.flush()
                print(f"Created notification ({nd['type'].value}) for {nd['recipient']}")

        db.commit()
        print("\n--- Seeding Completed Successfully ---")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
