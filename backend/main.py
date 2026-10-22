"""Main entry point for the ChargeWise AI FastAPI Backend Application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router, GlobalState


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager: handles startup and shutdown."""
    # Startup: Load baseline demo sessions and initialize simulation engine
    GlobalState.initialize_with_demo()
    yield
    # Shutdown cleanup if needed


app = FastAPI(
    title="ChargeWise AI — Intelligent EV Charging & Energy Orchestration",
    description=(
        "Production-grade backend for intelligent workplace & fleet EV charging orchestration, "
        "peak demand mitigation, Least-Laxity-First scheduling, feasibility assessment, and rescue routing."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend integration and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


@app.get("/")
def root():
    """Root redirect and status endpoint."""
    return {
        "name": "ChargeWise AI Platform API",
        "version": "1.0.0",
        "status": "online",
        "documentation": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
