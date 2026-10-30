from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from loguru import logger
import os

from app.config import settings
from app.database import init_db
from app.routers.papers import router as papers_router
from app.routers.analysis import (
    search_router,
    qa_router,
    compare_router,
    topics_router,
    reports_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown."""
    logger.info(f"Starting {settings.app_name}...")
    await init_db()
    logger.info("Database initialized.")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="ResearchMind AI",
    description="AI Research Paper Intelligence System — NLP-powered research assistant",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(papers_router)
app.include_router(search_router)
app.include_router(qa_router)
app.include_router(compare_router)
app.include_router(topics_router)
app.include_router(reports_router)


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": "1.0.0",
    }


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.app_name} API", "docs": "/api/docs"}
