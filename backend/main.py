import sys, os
# Ensure backend directory is in PYTHONPATH for module imports
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

import socketio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.redis_client import startup_redis, shutdown_redis
from app.socket.events import sio
from app.routers import auth, rooms, flashcards, ai_coach, analytics


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await startup_redis()
    await init_db()
    yield
    # Shutdown
    await shutdown_redis()


app = FastAPI(
    title="Collaborative Study Room API",
    version="1.0.0",
    description="Real-time collaborative study platform with AI coaching",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST routers
app.include_router(auth.router,       prefix="/api/v1")
app.include_router(rooms.router,      prefix="/api/v1")
app.include_router(flashcards.router, prefix="/api/v1")
app.include_router(ai_coach.router,   prefix="/api/v1")
app.include_router(analytics.router,  prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}


# Mount Socket.IO OVER FastAPI — order is critical
combined = socketio.ASGIApp(sio, app)

# ── Entry point ────────────────────────────────────────────────────────────────
# Run with: uvicorn main:combined --reload --port 8000
