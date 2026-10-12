"""
RAG (Retrieval-Augmented Generation) Service
- Retrieves relevant chunks from FAISS indexes
- Generates answers using OpenAI or a local model
- Always cites sources; never fabricates
"""
from typing import Dict, List, Optional
from loguru import logger
from app.config import settings
from app.services.embedding_service import search_papers


def build_context(chunks: List[Dict], paper_title_map: Dict[str, str]) -> str:
    """Build a context string from retrieved chunks with citations."""
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        paper_id = chunk.get("paper_id", "unknown")
        title = paper_title_map.get(paper_id, f"Paper {paper_id[:8]}")
        page = chunk.get("page_num", "?")
        text = chunk.get("text", "")
        context_parts.append(
            f"[Source {i}: {title}, Page {page}]\n{text}\n"
        )
    return "\n".join(context_parts)


def build_qa_prompt(question: str, context: str) -> str:
    return f"""You are a research assistant helping users understand scientific papers.
Answer the question based ONLY on the provided context. If the context does not contain
sufficient information to answer the question, say so clearly. 
Do NOT fabricate facts, citations, or results.

CONTEXT:
{context}

QUESTION: {question}

INSTRUCTIONS:
- Answer factually based solely on the provided context.
- Cite sources using [Source N] notation when referencing specific information.
- If the answer is not in the context, say: "The provided documents do not contain sufficient information to answer this question."
- Keep the answer concise and well-structured.

ANSWER:"""


def answer_with_openai(prompt: str) -> str:
    """Use OpenAI API to generate an answer."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0.1,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"OpenAI API call failed: {e}")
        raise


def answer_with_local_model(prompt: str) -> str:
    """Use a local HuggingFace model for answer generation."""
    try:
        from transformers import pipeline
        # Use a smaller instruction-following model
        generator = pipeline(
            "text2text-generation",
            model="google/flan-t5-base",
            max_new_tokens=400,
            do_sample=False,
        )
        result = generator(prompt[:2000])
        return result[0]["generated_text"].strip()
    except Exception as e:
        logger.error(f"Local model QA failed: {e}")
        raise


def extractive_answer(question: str, chunks: List[Dict]) -> str:
    """Simple extractive QA: return the most relevant sentence from top chunks."""
    try:
        import nltk
        try:
            nltk.data.find('tokenizers/punkt_tab')
        except LookupError:
            nltk.download('punkt_tab', quiet=True)
        from nltk.tokenize import sent_tokenize

        question_words = set(question.lower().split())
        best_sentence = ""
        best_score = 0

        for chunk in chunks[:3]:
            sentences = sent_tokenize(chunk.get("text", ""))
            for sent in sentences:
                sent_words = set(sent.lower().split())
                overlap = len(question_words & sent_words)
                if overlap > best_score:
                    best_score = overlap
                    best_sentence = sent

        if best_sentence:
            sources = ", ".join(
                f"[{chunk.get('paper_id', '')[:8]}]" for chunk in chunks[:3]
            )
            return f"{best_sentence}\n\n(Based on retrieved passages from: {sources})"
        return "Could not find a relevant answer in the provided documents."
    except Exception as e:
        logger.warning(f"Extractive answer failed: {e}")
        return "Could not generate an answer. Please check the documents and try again."


async def ask_question(
    question: str,
    paper_ids: List[str],
    paper_title_map: Dict[str, str],
    top_k: int = 6,
) -> Dict:
    """
    Main RAG pipeline:
    1. Retrieve relevant chunks
    2. Build context
    3. Generate grounded answer
    4. Return answer with citations
    """
    if not paper_ids:
        return {
            "answer": "No documents are available. Please upload research papers first.",
            "sources": [],
            "retrieved_chunks": [],
        }

    # Step 1: Retrieve
    chunks = search_papers(paper_ids, question, top_k=top_k)
    if not chunks:
        return {
            "answer": "The provided documents do not contain sufficient information to answer this question.",
            "sources": [],
            "retrieved_chunks": [],
        }

    # Step 2: Build context
    context = build_context(chunks, paper_title_map)
    prompt = build_qa_prompt(question, context)

    # Step 3: Generate answer
    answer = None
    if settings.llm_provider == "openai" and settings.openai_api_key:
        try:
            answer = answer_with_openai(prompt)
        except Exception:
            logger.warning("OpenAI failed, falling back to local model.")

    if answer is None:
        try:
            answer = answer_with_local_model(prompt)
        except Exception:
            logger.warning("Local model failed, using extractive answer.")
            answer = extractive_answer(question, chunks)

    # Step 4: Build citations
    sources = []
    seen = set()
    for i, chunk in enumerate(chunks, 1):
        paper_id = chunk.get("paper_id", "")
        if paper_id not in seen:
            seen.add(paper_id)
            sources.append({
                "source_num": i,
                "paper_id": paper_id,
                "title": paper_title_map.get(paper_id, "Unknown"),
                "page": chunk.get("page_num"),
                "excerpt": chunk.get("text", "")[:300],
                "score": chunk.get("score", 0),
            })

    return {
        "answer": answer,
        "sources": sources,
        "retrieved_chunks": [
            {
                "chunk_id": c.get("chunk_id"),
                "paper_id": c.get("paper_id"),
                "text": c.get("text", "")[:300],
                "score": c.get("score", 0),
                "page_num": c.get("page_num"),
            }
            for c in chunks
        ],
    }
