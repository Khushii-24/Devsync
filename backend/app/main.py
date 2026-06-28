from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, users

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

app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")