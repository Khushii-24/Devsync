from app.core.dependencies import get_current_user
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.api import documents
from app.api import auth, users, projects, columns, tasks, workspaces, websocket, analytics, notifications, search
from app.core.websocket_manager import manager
from fastapi import Depends
from app.api.ai import router as ai_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    listener_task = asyncio.create_task(manager.start_listener())
    yield
    listener_task.cancel()


import os

app = FastAPI(
    title="DevSync API",
    version="0.1.0",
    lifespan=lifespan,
)

cors_origins_env = os.getenv("CORS_ORIGINS", "")
if cors_origins_env:
    origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
else:
    origins = [
        "http://localhost:5173",
        "https://devsync-neon.vercel.app",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "DevSync API Running"}


app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(columns.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(workspaces.router, prefix="/api/v1")
app.include_router(websocket.router, prefix="/api/v1")
app.include_router(
    documents.router,
    prefix="/api/v1",
    dependencies=[Depends(get_current_user)],
)
app.include_router(ai_router, prefix="/api/v1", tags=["ai"])
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
