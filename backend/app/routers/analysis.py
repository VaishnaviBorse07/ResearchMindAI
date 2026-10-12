"""
Search, QA, Comparison, Research Gaps, Topics, and Reports Routers
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from loguru import logger

from app.database import get_db
from app.models import Paper

# ─── Search Router ────────────────────────────────────────────────────────────
search_router = APIRouter(prefix="/api/search", tags=["search"])


class SemanticSearchRequest(BaseModel):
    query: str
    paper_ids: Optional[List[str]] = None  # None = search all
    top_k: int = 10


@search_router.post("/semantic")
async def semantic_search(request: SemanticSearchRequest, db: AsyncSession = Depends(get_db)):
    """Search papers using semantic similarity."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # Resolve paper IDs
    paper_ids = request.paper_ids
    if not paper_ids:
        result = await db.execute(
            select(Paper.id, Paper.title).where(Paper.processed == True, Paper.has_embeddings == True)
        )
        rows = result.all()
        paper_ids = [r[0] for r in rows]
        paper_title_map = {r[0]: r[1] for r in rows}
    else:
        result = await db.execute(
            select(Paper.id, Paper.title).where(Paper.id.in_(paper_ids))
        )
        rows = result.all()
        paper_title_map = {r[0]: r[1] or "Unknown" for r in rows}

    if not paper_ids:
        return {"results": [], "message": "No indexed papers found."}

    from app.services.embedding_service import search_papers
    chunks = search_papers(paper_ids, request.query, top_k=request.top_k)

    results = []
    for chunk in chunks:
        pid = chunk.get("paper_id", "")
        results.append({
            "paper_id": pid,
            "title": paper_title_map.get(pid, "Unknown"),
            "excerpt": chunk.get("text", "")[:400],
            "score": chunk.get("score", 0),
            "page_num": chunk.get("page_num"),
            "chunk_id": chunk.get("chunk_id"),
        })

    return {"query": request.query, "results": results, "total": len(results)}


# ─── QA Router ───────────────────────────────────────────────────────────────
qa_router = APIRouter(prefix="/api/qa", tags=["qa"])


class QARequest(BaseModel):
    question: str
    paper_ids: Optional[List[str]] = None


@qa_router.post("/ask")
async def ask_question(request: QARequest, db: AsyncSession = Depends(get_db)):
    """Ask a question about one or more papers using RAG."""
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    paper_ids = request.paper_ids
    if not paper_ids:
        result = await db.execute(
            select(Paper.id, Paper.title).where(Paper.processed == True, Paper.has_embeddings == True)
        )
        rows = result.all()
        paper_ids = [r[0] for r in rows]
        paper_title_map = {r[0]: r[1] or "Unknown" for r in rows}
    else:
        result = await db.execute(
            select(Paper.id, Paper.title).where(Paper.id.in_(paper_ids))
        )
        rows = result.all()
        paper_title_map = {r[0]: r[1] or "Unknown" for r in rows}

    if not paper_ids:
        return {
            "answer": "No processed papers available. Please upload and wait for processing to complete.",
            "sources": [],
            "retrieved_chunks": [],
        }

    from app.services.rag_service import ask_question as rag_ask
    result = await rag_ask(
        question=request.question,
        paper_ids=paper_ids,
        paper_title_map=paper_title_map,
    )
    return result


# ─── Comparison Router ────────────────────────────────────────────────────────
compare_router = APIRouter(prefix="/api/papers", tags=["compare"])


class CompareRequest(BaseModel):
    paper_ids: List[str]


@compare_router.post("/compare")
async def compare_papers(request: CompareRequest, db: AsyncSession = Depends(get_db)):
    """Compare multiple research papers."""
    if len(request.paper_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 paper IDs required.")
    if len(request.paper_ids) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 papers can be compared at once.")

    result = await db.execute(
        select(Paper).where(Paper.id.in_(request.paper_ids))
    )
    papers = result.scalars().all()

    if len(papers) < 2:
        raise HTTPException(status_code=404, detail="One or more papers not found.")

    papers_data = []
    for paper in papers:
        papers_data.append({
            "paper_id": paper.id,
            "title": paper.title or paper.filename,
            "full_text": paper.full_text or "",
            "sections": paper.sections or {},
            "keywords": paper.keywords or [],
            "summary": paper.summary or {},
        })

    from app.services.comparison_service import compare_papers as do_compare
    comparison = do_compare(papers_data)
    return comparison


# ─── Research Gaps Router ────────────────────────────────────────────────────
gaps_router = APIRouter(prefix="/api/research-gaps", tags=["research-gaps"])


class GapsRequest(BaseModel):
    paper_ids: Optional[List[str]] = None


@gaps_router.post("/analyze")
async def analyze_gaps(request: GapsRequest, db: AsyncSession = Depends(get_db)):
    """Identify potential research gaps from multiple papers."""
    paper_ids = request.paper_ids
    query = select(Paper).where(Paper.processed == True)
    if paper_ids:
        query = query.where(Paper.id.in_(paper_ids))

    result = await db.execute(query)
    papers = result.scalars().all()

    if not papers:
        raise HTTPException(status_code=404, detail="No processed papers found.")

    papers_data = [
        {
            "paper_id": p.id,
            "title": p.title or p.filename,
            "sections": p.sections or {},
            "keywords": p.keywords or [],
        }
        for p in papers
    ]

    from app.services.comparison_service import analyze_research_gaps
    gaps = analyze_research_gaps(papers_data)
    return gaps


# ─── Topics Router ───────────────────────────────────────────────────────────
topics_router = APIRouter(prefix="/api/topics", tags=["topics"])


class TopicsRequest(BaseModel):
    paper_ids: Optional[List[str]] = None
    num_topics: int = 5


@topics_router.post("/analyze")
async def analyze_topics(request: TopicsRequest, db: AsyncSession = Depends(get_db)):
    """Run topic modeling across uploaded papers."""
    paper_ids = request.paper_ids
    query = select(Paper).where(Paper.processed == True)
    if paper_ids:
        query = query.where(Paper.id.in_(paper_ids))

    result = await db.execute(query)
    papers = result.scalars().all()

    if not papers:
        raise HTTPException(status_code=404, detail="No processed papers found.")

    papers_data = [
        {
            "paper_id": p.id,
            "title": p.title or p.filename,
            "full_text": p.full_text or "",
        }
        for p in papers
    ]

    from app.services.topic_service import analyze_topics as do_topics
    topics_result = do_topics(papers_data)
    return topics_result


# ─── Reports Router ──────────────────────────────────────────────────────────
reports_router = APIRouter(prefix="/api/reports", tags=["reports"])


class ExportRequest(BaseModel):
    paper_id: str
    format: str = "pdf"  # "pdf" or "docx"


@reports_router.post("/export")
async def export_report(request: ExportRequest, db: AsyncSession = Depends(get_db)):
    """Export a paper analysis as PDF or DOCX."""
    result = await db.execute(select(Paper).where(Paper.id == request.paper_id))
    paper = result.scalar_one_or_none()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found.")

    paper_data = paper.to_dict()

    try:
        if request.format == "pdf":
            from app.services.report_service import generate_pdf_report
            content = generate_pdf_report(paper_data)
            return Response(
                content=content,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f'attachment; filename="report_{paper.id[:8]}.pdf"'
                },
            )
        elif request.format == "docx":
            from app.services.report_service import generate_docx_report
            content = generate_docx_report(paper_data)
            return Response(
                content=content,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": f'attachment; filename="report_{paper.id[:8]}.docx"'
                },
            )
        else:
            raise HTTPException(status_code=400, detail="Format must be 'pdf' or 'docx'.")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Report export failed: {e}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
