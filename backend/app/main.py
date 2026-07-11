from app.core.dependencies import get_current_user
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from app.api import documents
from app.api import auth, users, projects, columns, tasks, workspaces, websocket
from app.core.websocket_manager import manager
from fastapi import Depends
@asynccontextmanager
async def lifespan(app: FastAPI):
    listener_task = asyncio.create_task(manager.start_listener())
    yield
    listener_task.cancel()


app = FastAPI(
    title="DevSync API",
    version="0.1.0",
    lifespan=lifespan,
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