# ResearchMind AI - AI Research Paper Intelligence System

A full-stack NLP application for intelligent research paper analysis built for a B.Tech NLP project.

## Quick Start (Windows)

**Terminal 1 - Backend:**
```
start_backend.bat
```

**Terminal 2 - Frontend:**
```
start_frontend.bat
```

Open: http://localhost:5173 | API Docs: http://localhost:8000/api/docs

## Features

- PDF Upload & Processing (PyMuPDF, OCR fallback)
- AI Summarization (BART/T5 + extractive fallback)
- Keyword Extraction (TF-IDF + KeyBERT)
- Named Entity Recognition (spaCy + patterns)
- Semantic Search (Sentence Transformers + FAISS)
- RAG Q&A with source citations
- Paper Comparison (9 dimensions)
- Research Gap Analysis (evidence-grounded)
- Topic Modeling (LDA + BERTopic)
- Report Export (PDF + DOCX)

## Manual Setup

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
copy .env.example .env
# Edit .env (optional: add OPENAI_API_KEY for better QA)
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| POST /api/papers/upload | Upload PDFs |
| GET /api/papers | List papers |
| GET /api/papers/{id} | Get paper |
| DELETE /api/papers/{id} | Delete paper |
| POST /api/papers/{id}/summarize | Generate summary |
| POST /api/papers/{id}/extract-keywords | Extract keywords |
| POST /api/papers/{id}/extract-entities | Extract entities |
| POST /api/search/semantic | Semantic search |
| POST /api/qa/ask | RAG Q&A |
| POST /api/papers/compare | Compare papers |
| POST /api/research-gaps/analyze | Gap analysis |
| POST /api/topics/analyze | Topic modeling |
| POST /api/reports/export | Export report |

## NLP Models

| Task | Model |
|------|-------|
| Summarization | facebook/bart-large-cnn |
| Embeddings | all-MiniLM-L6-v2 |
| NER | en_core_web_sm |
| Keywords | KeyBERT + TF-IDF |
| Topics | LDA (Gensim) / BERTopic |
| QA | google/flan-t5-base or OpenAI |
| Search | FAISS (cosine similarity) |

## Environment Variables (.env)

```
OPENAI_API_KEY=your-key-here     # Optional: for enhanced QA
LLM_PROVIDER=local               # "openai" or "local"
MAX_FILE_SIZE_MB=50
SUMMARIZATION_MODEL=facebook/bart-large-cnn
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

## Known Limitations

1. First-run model downloads take 10-30 minutes
2. Scanned PDFs need Tesseract OCR installed separately
3. Local Flan-T5 QA is less capable than GPT-3.5
4. Topic modeling needs 3+ papers
5. Research gaps require human validation
6. Section detection uses heuristics (may miss non-standard formats)

## Project Structure

```
Project/
+-- backend/
|   +-- app/
|   |   +-- main.py
|   |   +-- config.py
|   |   +-- database.py
|   |   +-- models.py
|   |   +-- routers/
|   |   |   +-- papers.py
|   |   |   +-- analysis.py
|   |   +-- services/
|   |       +-- pdf_service.py
|   |       +-- nlp_service.py
|   |       +-- embedding_service.py
|   |       +-- rag_service.py
|   |       +-- comparison_service.py
|   |       +-- topic_service.py
|   |       +-- report_service.py
|   +-- requirements.txt
|   +-- .env.example
+-- frontend/
|   +-- src/
|       +-- pages/
|       +-- api/client.ts
|       +-- types/index.ts
|       +-- App.tsx
|       +-- index.css
+-- start_backend.bat
+-- start_frontend.bat
+-- README.md
```

Built for B.Tech NLP Project Demonstration.
