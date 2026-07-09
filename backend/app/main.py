from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, users
from app.api import projects, columns
from app.api import tasks
from app.api import workspaces
from app.api import websocket
from contextlib import asynccontextmanager
import asyncio
from app.core.websocket_manager import manager

app = FastAPI(
    title="DevSync API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "DevSync API Running"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fire-and-forget background task: starts when the app starts, runs
    # forever (start_listener has its own `async for ... listen()` loop),
    # gets cancelled automatically when the app shuts down.
    listener_task = asyncio.create_task(manager.start_listener())
    yield
    listener_task.cancel()

app = FastAPI(lifespan=lifespan)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(columns.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(workspaces.router, prefix="/api/v1")
app.include_router(websocket.router, prefix="/api/v1")