from fastapi import FastAPI

app = FastAPI(
    title="DevSync API",
    version="0.1.0"
)

@app.get("/")
def root():
    return {"message": "DevSync API Running"}