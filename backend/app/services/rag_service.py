"""
RAG (Retrieval-Augmented Generation) Service
- Retrieves relevant chunks from FAISS indexes
- Generates answers using Gemini, OpenAI, or a local model
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


def answer_with_gemini(prompt: str) -> str:
    """Use Google Gemini API to generate an answer."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                max_output_tokens=800,
                temperature=0.1,
            ),
        )
        return response.text.strip()
    except Exception as e:
        logger.error(f"Gemini API call failed: {e}")
        raise


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


def extractive_answer(question: str, chunks: List[Dict], paper_title_map: Optional[Dict[str, str]] = None) -> str:
    """
    Structured extractive QA: pick the most relevant sentences from each top chunk
    and present a clean, readable answer grouped by source paper.
    """
    if paper_title_map is None:
        paper_title_map = {}
    try:
        import nltk
        for resource in ['tokenizers/punkt_tab', 'tokenizers/punkt']:
            try:
                nltk.data.find(resource)
                break
            except LookupError:
                pass
        else:
            nltk.download('punkt_tab', quiet=True)
        from nltk.tokenize import sent_tokenize

        question_words = set(q for q in question.lower().split() if len(q) > 3)

        # Group top chunks by paper, pick best sentences per chunk
        seen_papers: dict = {}
        answer_parts: List[str] = []

        for chunk in chunks[:5]:
            pid = chunk.get("paper_id", "")
            title = paper_title_map.get(pid, f"Paper {pid[:8]}")
            text = chunk.get("text", "").strip()
            if not text:
                continue

            sentences = sent_tokenize(text)
            # Score each sentence by overlap with question keywords
            scored = []
            for sent in sentences:
                sent_clean = sent.strip()
                if len(sent_clean) < 20:
                    continue
                sent_words = set(sent_clean.lower().split())
                overlap = len(question_words & sent_words)
                scored.append((overlap, sent_clean))

            scored.sort(key=lambda x: x[0], reverse=True)
            top_sents = [s for _, s in scored[:3] if s]  # up to 3 best sentences

            if not top_sents and sentences:
                # Fall back to first 2 sentences if no keyword match
                top_sents = [s.strip() for s in sentences[:2] if len(s.strip()) > 20]

            if top_sents:
                excerpt = " ".join(top_sents)
                if pid not in seen_papers:
                    seen_papers[pid] = title
                    answer_parts.append(f"**From \"{title}\":**\n{excerpt}")
                else:
                    # Append extra sentences to existing paper section
                    answer_parts[-1] += " " + excerpt

        if not answer_parts:
            return "The provided documents do not contain sufficient information to answer this question."

        header = f"Based on the retrieved passages relevant to your question:\n\n"
        body = "\n\n".join(answer_parts)
        footer = (
            "\n\n---\n*Note: This answer is extracted directly from your uploaded papers. "
            "For a more synthesized response, configure a Gemini or OpenAI API key.*"
        )
        return header + body + footer

    except Exception as e:
        logger.warning(f"Extractive answer failed: {e}")
        # Ultra-simple fallback: just return trimmed text from top chunk
        if chunks:
            text = chunks[0].get("text", "").strip()
            pid = chunks[0].get("paper_id", "")
            title = paper_title_map.get(pid, "the uploaded paper")
            return (
                f"Relevant excerpt from \"{title}\":\n\n{text[:600]}\n\n"
                "(Could not parse full sentences — showing raw excerpt.)"
            )
        return "Could not generate an answer. Please check the documents and try again."


def _get_llm_answer(prompt: str) -> str:
    """
    Try LLM providers in order of preference:
    1. Gemini (if GEMINI_API_KEY is set)
    2. OpenAI (if OPENAI_API_KEY is set and llm_provider=openai)
    3. Local flan-t5 model
    """
    # Try Gemini first if API key is available
    if settings.gemini_api_key:
        try:
            logger.info("Using Gemini for RAG answer generation.")
            return answer_with_gemini(prompt)
        except Exception:
            logger.warning("Gemini failed, trying next provider.")

    # Try OpenAI if configured
    if settings.llm_provider == "openai" and settings.openai_api_key:
        try:
            logger.info("Using OpenAI for RAG answer generation.")
            return answer_with_openai(prompt)
        except Exception:
            logger.warning("OpenAI failed, trying local model.")

    # Fall back to local model
    logger.info("Using local flan-t5 model for RAG answer generation.")
    return answer_with_local_model(prompt)


async def ask_question(
    question: str,
    paper_ids: List[str],
    paper_title_map: Dict[str, str],
    top_k: int = 6,
) -> Dict:
    """
    Main RAG pipeline:
    1. Retrieve relevant chunks via FAISS
    2. Build context with citations
    3. Generate grounded answer (Gemini → OpenAI → local → extractive)
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

    # Step 3: Generate answer with fallback chain
    answer = None
    try:
        answer = _get_llm_answer(prompt)
    except Exception as e:
        logger.warning(f"All LLM providers failed: {e}. Using extractive fallback.")
        answer = extractive_answer(question, chunks, paper_title_map)

    if not answer:
        answer = extractive_answer(question, chunks, paper_title_map)

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
