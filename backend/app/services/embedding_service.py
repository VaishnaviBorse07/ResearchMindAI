"""
Embedding and Retrieval Service
- Sentence Transformers for generating embeddings
- FAISS for vector similarity search
- Chunk management for RAG
"""
import os
import json
import pickle
from typing import Dict, List, Optional, Tuple
from loguru import logger
from app.config import settings

_embedding_model = None


def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {settings.embedding_model}")
            _embedding_model = SentenceTransformer(settings.embedding_model)
            logger.info("Embedding model loaded.")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            _embedding_model = "failed"
    return _embedding_model if _embedding_model != "failed" else None


def embed_texts(texts: List[str]) -> Optional[object]:
    """Generate embeddings for a list of texts. Returns numpy array or None."""
    model = get_embedding_model()
    if not model:
        return None
    try:
        import numpy as np
        embeddings = model.encode(texts, show_progress_bar=False, normalize_embeddings=True)
        return embeddings
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        return None


# ─── FAISS Index Management ───────────────────────────────────────────────────

def get_index_path(paper_id: str) -> str:
    return os.path.join(settings.faiss_index_dir, f"{paper_id}.faiss")


def get_chunks_path(paper_id: str) -> str:
    return os.path.join(settings.faiss_index_dir, f"{paper_id}_chunks.json")


def build_paper_index(paper_id: str, chunks: List[Dict]) -> bool:
    """
    Build and save a FAISS index for the given paper's chunks.
    Each chunk dict must have 'text' and optionally 'chunk_id', 'page_num'.
    """
    try:
        import faiss
        import numpy as np

        texts = [c["text"] for c in chunks if c.get("text")]
        if not texts:
            return False

        embeddings = embed_texts(texts)
        if embeddings is None:
            return False

        dimension = embeddings.shape[1]
        index = faiss.IndexFlatIP(dimension)  # Inner product (cosine similarity with normalized vectors)
        index.add(embeddings.astype("float32"))

        # Save FAISS index
        faiss.write_index(index, get_index_path(paper_id))

        # Save chunk metadata
        with open(get_chunks_path(paper_id), "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False)

        logger.info(f"Built FAISS index for paper {paper_id} with {len(chunks)} chunks.")
        return True

    except ImportError:
        logger.error("FAISS not installed.")
        return False
    except Exception as e:
        logger.error(f"Failed to build index for paper {paper_id}: {e}")
        return False


def search_paper(paper_id: str, query: str, top_k: int = 5) -> List[Dict]:
    """
    Search a single paper's FAISS index for relevant chunks.
    Returns list of {text, score, chunk_id, ...metadata}
    """
    try:
        import faiss
        import numpy as np

        index_path = get_index_path(paper_id)
        chunks_path = get_chunks_path(paper_id)

        if not os.path.exists(index_path) or not os.path.exists(chunks_path):
            return []

        index = faiss.read_index(index_path)
        with open(chunks_path, "r", encoding="utf-8") as f:
            chunks = json.load(f)

        query_embedding = embed_texts([query])
        if query_embedding is None:
            return []

        scores, indices = index.search(query_embedding.astype("float32"), min(top_k, len(chunks)))

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(chunks):
                continue
            chunk = chunks[idx].copy()
            chunk["score"] = float(score)
            results.append(chunk)

        return results

    except Exception as e:
        logger.error(f"Search failed for paper {paper_id}: {e}")
        return []


def search_papers(paper_ids: List[str], query: str, top_k: int = 10) -> List[Dict]:
    """
    Search across multiple papers and return top-k results ranked by score.
    """
    all_results = []
    for paper_id in paper_ids:
        results = search_paper(paper_id, query, top_k=top_k)
        for r in results:
            r["paper_id"] = paper_id
        all_results.extend(results)

    # Sort by score descending
    all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
    return all_results[:top_k]


def delete_paper_index(paper_id: str):
    """Delete FAISS index files for a paper."""
    for path in [get_index_path(paper_id), get_chunks_path(paper_id)]:
        if os.path.exists(path):
            os.remove(path)
            logger.info(f"Deleted index file: {path}")
