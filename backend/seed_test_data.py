import asyncio
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, engine
from app.models import User, Workspace, WorkspaceMember, Project, ProjectMember, Column, Task
from app.core.security import hash_password

def seed_data():
    db: Session = SessionLocal()
    try:
        # Default password for seeded users
        password_hash = hash_password("password123")

        users_to_create = [
            {"email": "alex.morgan@devsync.io", "username": "alex_morgan"},
            {"email": "sarah.chen@devsync.io", "username": "sarah_chen"},
            {"email": "marcus.vance@devsync.io", "username": "marcus_vance"},
            {"email": "elena.rostova@devsync.io", "username": "elena_rostova"},
            {"email": "liam.obrien@devsync.io", "username": "liam_obrien"},
            {"email": "priya.sharma@devsync.io", "username": "priya_sharma"},
            {"email": "david.kim@devsync.io", "username": "david_kim"},
            {"email": "rachel.green@devsync.io", "username": "rachel_green"},
        ]

        created_users = []
        print("--- Creating Users ---")
        for udata in users_to_create:
            user = db.query(User).filter(User.email == udata["email"]).first()
            if not user:
                user = User(
                    email=udata["email"],
                    username=udata["username"],
                    hashed_password=password_hash
                )
                db.add(user)
                db.flush()
                print(f"Created user: {udata['email']} (Password: password123)")
            else:
                print(f"User already exists: {udata['email']}")
            created_users.append(user)

        # Create a new testing workspace
        print("\n--- Creating Workspace ---")
        ws_slug = "quantum-suite"
        ws = db.query(Workspace).filter(Workspace.slug == ws_slug).first()
        if not ws:
            ws = Workspace(
                name="Quantum Product Suite",
                slug=ws_slug
            )
            db.add(ws)
            db.flush()
            print(f"Created workspace: {ws.name} ({ws.slug})")

        # Add all users to workspace members
        for idx, u in enumerate(created_users):
            role = "owner" if idx == 0 else ("admin" if idx == 1 else "member")
            wm = db.query(WorkspaceMember).filter(
                WorkspaceMember.workspace_id == ws.id,
                WorkspaceMember.user_id == u.id
            ).first()
            if not wm:
                wm = WorkspaceMember(
                    workspace_id=ws.id,
                    user_id=u.id,
                    role=role
                )
                db.add(wm)

        # Create Project 1: Mobile App Revamp
        print("\n--- Creating Projects & Tasks ---")
        p1 = db.query(Project).filter(Project.workspace_id == ws.id, Project.name == "Mobile App Revamp").first()
        if not p1:
            p1 = Project(
                name="Mobile App Revamp",
                description="Redesigning iOS and Android user experiences with modern dark mode and real-time sync.",
                workspace_id=ws.id
            )
            db.add(p1)
            db.flush()

            # Columns
            col_todo = Column(name="To Do", position=0, project_id=p1.id)
            col_in_progress = Column(name="In Progress", position=1, project_id=p1.id)
            col_review = Column(name="Code Review", position=2, project_id=p1.id)
            col_done = Column(name="Done", position=3, project_id=p1.id)
            db.add_all([col_todo, col_in_progress, col_review, col_done])
            db.flush()

            # Tasks
            tasks = [
                Task(title="Design Figma Component Library", description="Build reusable dark mode UI tokens and icons.", priority="high", position=0, column_id=col_in_progress.id, project_id=p1.id, assignee_id=created_users[0].id),
                Task(title="Set up OAuth2 & JWT Refresh Flow", description="Implement secure refresh tokens in FastAPI backend.", priority="urgent", position=1, column_id=col_in_progress.id, project_id=p1.id, assignee_id=created_users[1].id),
                Task(title="Integrate SSE Push Notifications", description="Connect frontend notification bell with Server-Sent Events stream.", priority="medium", position=0, column_id=col_todo.id, project_id=p1.id, assignee_id=created_users[2].id),
                Task(title="Optimize Recharts Bundle Size", description="Code split heavy charting component code.", priority="low", position=1, column_id=col_todo.id, project_id=p1.id, assignee_id=created_users[3].id),
                Task(title="Audit Project Roles & Overrides", description="Ensure Viewer role cannot mutate board columns.", priority="high", position=0, column_id=col_review.id, project_id=p1.id, assignee_id=created_users[4].id),
                Task(title="Write Cypress E2E Login Tests", description="Automate authentication test suite for regression testing.", priority="medium", position=0, column_id=col_done.id, project_id=p1.id, assignee_id=created_users[5].id),
            ]
            db.add_all(tasks)

        # Create Project 2: AI Assistant Core
        p2 = db.query(Project).filter(Project.workspace_id == ws.id, Project.name == "AI Assistant Core").first()
        if not p2:
            p2 = Project(
                name="AI Assistant Core",
                description="LLM-backed intelligent task breakdown and context-aware chat assistant.",
                workspace_id=ws.id
            )
            db.add(p2)
            db.flush()

            col_backlog = Column(name="Backlog", position=0, project_id=p2.id)
            col_doing = Column(name="In Progress", position=1, project_id=p2.id)
            col_complete = Column(name="Completed", position=2, project_id=p2.id)
            db.add_all([col_backlog, col_doing, col_complete])
            db.flush()

            tasks_p2 = [
                Task(title="Implement pgvector Embedding Storage", description="Index task descriptions for similarity search.", priority="high", position=0, column_id=col_doing.id, project_id=p2.id, assignee_id=created_users[6].id),
                Task(title="Fine-tune Prompt Templates", description="Improve task breakdown subtask suggestions accuracy.", priority="medium", position=0, column_id=col_backlog.id, project_id=p2.id, assignee_id=created_users[7].id),
            ]
            db.add_all(tasks_p2)

        db.commit()
        print("\nSuccessfully seeded users, workspace, projects, columns, and tasks!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
