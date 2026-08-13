"""
YouTube RAG Backend - Entrypoint
FastAPI + YouTube Transcript + HuggingFace + FAISS + Conversational Memory
"""

import time
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.chat import router as chat_router

START_TIME = time.time()

app = FastAPI(
    title="YouTube RAG API",
    description="RAG-based API for asking questions about YouTube videos",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include the modularized chat router
app.include_router(chat_router)


@app.get("/")
def root():
    return {"message": "YouTube RAG API is running"}


@app.get("/health")
def check_health():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": time.time() - START_TIME,
    }


if __name__ == "__main__":
    import uvicorn
    # Updated to 'app.main:app' so it runs correctly from the repository root directory
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)