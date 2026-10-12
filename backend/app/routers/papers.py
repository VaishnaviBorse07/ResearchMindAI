"""
Papers Router - Upload, list, retrieve, and manage research papers.
"""
import os
import shutil
import asyncio
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from loguru import logger
from pydantic import BaseModel

from app.database import get_db
from app.models import Paper, Bookmark, AnalysisHistory
from app.config import settings

router = APIRouter(prefix="/api/papers", tags=["papers"])

ALLOWED_EXTENSIONS = {".pdf"}
MAX_BYTES = settings.max_file_size_mb * 1024 * 1024


class BookmarkCreate(BaseModel):
    passage: str
    note: Optional[str] = None
    page_number: Optional[int] = None


async def _process_paper_background(paper_id: str, file_path: str):
    """Background task: extract text, run NLP, build embeddings."""
    from app.database import AsyncSessionLocal
    from app.services.pdf_service import process_paper, chunk_text
    from app.services.nlp_service import extract_keywords, extract_entities, generate_paper_summary
    from app.services.embedding_service import build_paper_index
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(Paper).where(Paper.id == paper_id))
            paper = result.scalar_one_or_none()
            if not paper:
                return

            # PDF extraction
            paper_content = process_paper(file_path)

            paper.title = paper_content.get("title") or paper.filename.replace(".pdf", "")
            paper.authors = paper_content.get("authors")
            paper.abstract = paper_content.get("abstract")
            paper.full_text = paper_content.get("full_text")
            paper.page_count = paper_content.get("page_count")
            paper.sections = {k: v[:5000] for k, v in (paper_content.get("sections") or {}).items()}

            # Keywords
            full_text = paper_content.get("full_text") or ""
            if full_text:
                paper.keywords = extract_keywords(full_text[:8000], top_n=25)

            # Named Entities
            if full_text:
                paper.entities = extract_entities(full_text)

            # Summarization
            if full_text:
                sections = paper_content.get("sections") or {}
                paper.summary = generate_paper_summary(sections, full_text)

            # Build embeddings index
            if full_text:
                chunks = chunk_text(full_text, max_chunk_size=settings.max_chunk_size, overlap=settings.chunk_overlap)
                # Add page numbers to chunks (approximate)
                page_count = paper_content.get("page_count") or 1
                pages_data = paper_content.get("pages_data") or []
                paper.has_embeddings = build_paper_index(paper_id, chunks)

            paper.processed = True
            paper.processing_error = None
            await db.commit()
            logger.info(f"Paper {paper_id} processed successfully.")

        except Exception as e:
            logger.error(f"Processing error for paper {paper_id}: {e}")
            try:
                result = await db.execute(select(Paper).where(Paper.id == paper_id))
                paper = result.scalar_one_or_none()
                if paper:
                    paper.processed = True
                    paper.processing_error = str(e)[:500]
                    await db.commit()
            except Exception:
                pass


@router.post("/upload")
async def upload_papers(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload one or more PDF research papers."""
    uploaded = []
    errors = []

    for file in files:
        ext = os.path.splitext(file.filename or "")[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            errors.append({"filename": file.filename, "error": "Only PDF files are accepted."})
            continue

        # Read and validate size
        content = await file.read()
        if len(content) > MAX_BYTES:
            errors.append({"filename": file.filename, "error": f"File exceeds {settings.max_file_size_mb}MB limit."})
            continue

        if len(content) < 100:
            errors.append({"filename": file.filename, "error": "File appears to be empty or corrupted."})
            continue

        # Save to disk
        import uuid
        paper_id = str(uuid.uuid4())
        safe_filename = f"{paper_id}_{os.path.basename(file.filename or 'paper.pdf')}"
        file_path = os.path.join(settings.upload_dir, safe_filename)

        try:
            with open(file_path, "wb") as f:
                f.write(content)
        except Exception as e:
            errors.append({"filename": file.filename, "error": f"File save failed: {str(e)}"})
            continue

        # Create DB record
        paper = Paper(
            id=paper_id,
            filename=file.filename or "paper.pdf",
            file_path=file_path,
            file_size=len(content),
            processed=False,
        )
        db.add(paper)
        await db.commit()
        await db.refresh(paper)

        # Queue background processing
        background_tasks.add_task(_process_paper_background, paper_id, file_path)

        uploaded.append({
            "paper_id": paper_id,
            "filename": file.filename,
            "file_size": len(content),
            "status": "processing",
            "message": "Paper uploaded successfully. Processing in background.",
        })

    return {
        "uploaded": uploaded,
        "errors": errors,
        "total_uploaded": len(uploaded),
    }


@router.get("")
async def list_papers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """List all uploaded research papers."""
    result = await db.execute(select(Paper).offset(skip).limit(limit))
    papers = result.scalars().all()
    return {
        "papers": [p.to_dict() for p in papers],
        "total": len(papers),
    }


@router.get("/{paper_id}")
async def get_paper(paper_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific paper by ID."""
    result = await db.execute(select(Paper).where(Paper.id == paper_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")
    return paper.to_dict()


@router.delete("/{paper_id}")
async def delete_paper(paper_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a paper and all its data."""
    result = await db.execute(select(Paper).where(Paper.id == paper_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    # Delete file
    if paper.file_path and os.path.exists(paper.file_path):
        os.remove(paper.file_path)

    # Delete FAISS index
    from app.services.embedding_service import delete_paper_index
    delete_paper_index(paper_id)

    await db.delete(paper)
    await db.commit()
    return {"message": "Paper deleted successfully."}


@router.post("/{paper_id}/summarize")
async def summarize_paper(paper_id: str, db: AsyncSession = Depends(get_db)):
    """Trigger summarization for a paper (or return cached)."""
    result = await db.execute(select(Paper).where(Paper.id == paper_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    if paper.summary:
        return {"paper_id": paper_id, "summary": paper.summary, "cached": True}

    if not paper.processed:
        raise HTTPException(status_code=202, detail="Paper is still being processed.")

    if not paper.full_text:
        raise HTTPException(status_code=422, detail="No text extracted from this paper.")

    from app.services.nlp_service import generate_paper_summary
    summary = generate_paper_summary(paper.sections or {}, paper.full_text)
    paper.summary = summary
    await db.commit()

    return {"paper_id": paper_id, "summary": summary, "cached": False}


@router.post("/{paper_id}/extract-keywords")
async def extract_keywords_endpoint(paper_id: str, db: AsyncSession = Depends(get_db)):
    """Extract keywords from a paper."""
    result = await db.execute(select(Paper).where(Paper.id == paper_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    if paper.keywords:
        return {"paper_id": paper_id, "keywords": paper.keywords, "cached": True}

    if not paper.full_text:
        raise HTTPException(status_code=422, detail="No text available.")

    from app.services.nlp_service import extract_keywords
    keywords = extract_keywords(paper.full_text[:8000])
    paper.keywords = keywords
    await db.commit()

    return {"paper_id": paper_id, "keywords": keywords, "cached": False}


@router.post("/{paper_id}/extract-entities")
async def extract_entities_endpoint(paper_id: str, db: AsyncSession = Depends(get_db)):
    """Extract named entities from a paper."""
    result = await db.execute(select(Paper).where(Paper.id == paper_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    if paper.entities:
        return {"paper_id": paper_id, "entities": paper.entities, "cached": True}

    if not paper.full_text:
        raise HTTPException(status_code=422, detail="No text available.")

    from app.services.nlp_service import extract_entities
    entities = extract_entities(paper.full_text)
    paper.entities = entities
    await db.commit()

    return {"paper_id": paper_id, "entities": entities, "cached": False}


@router.post("/{paper_id}/bookmarks")
async def add_bookmark(
    paper_id: str,
    bookmark: BookmarkCreate,
    db: AsyncSession = Depends(get_db),
):
    """Save a bookmarked passage from a paper."""
    result = await db.execute(select(Paper).where(Paper.id == paper_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    bm = Bookmark(
        paper_id=paper_id,
        passage=bookmark.passage,
        note=bookmark.note,
        page_number=bookmark.page_number,
    )
    db.add(bm)
    await db.commit()
    await db.refresh(bm)
    return bm.to_dict()


@router.get("/{paper_id}/bookmarks")
async def get_bookmarks(paper_id: str, db: AsyncSession = Depends(get_db)):
    """Get all bookmarks for a paper."""
    result = await db.execute(
        select(Bookmark).where(Bookmark.paper_id == paper_id)
    )
    bookmarks = result.scalars().all()
    return {"bookmarks": [b.to_dict() for b in bookmarks]}
