"""
NLP Service
- Summarization using BART/T5
- Keyword extraction using TF-IDF + KeyBERT
- Named Entity Recognition using spaCy
- Text preprocessing utilities
"""
import re
from typing import Dict, List, Optional, Any
from loguru import logger

# Lazy imports to avoid startup failures if models are downloading
_summarizer = None
_keybert_model = None
_spacy_nlp = None
_tfidf_vectorizer = None


def get_summarizer():
    global _summarizer
    if _summarizer is None:
        try:
            from transformers import pipeline
            from app.config import settings
            logger.info(f"Loading summarization model: {settings.summarization_model}")
            _summarizer = pipeline(
                "summarization",
                model=settings.summarization_model,
                max_length=512,
                min_length=50,
                truncation=True,
            )
            logger.info("Summarization model loaded.")
        except Exception as e:
            logger.error(f"Failed to load summarizer: {e}")
            _summarizer = "failed"
    return _summarizer if _summarizer != "failed" else None


def get_keybert():
    global _keybert_model
    if _keybert_model is None:
        try:
            from keybert import KeyBERT
            _keybert_model = KeyBERT()
            logger.info("KeyBERT model loaded.")
        except Exception as e:
            logger.error(f"Failed to load KeyBERT: {e}")
            _keybert_model = "failed"
    return _keybert_model if _keybert_model != "failed" else None


def get_spacy_nlp():
    global _spacy_nlp
    if _spacy_nlp is None:
        try:
            import spacy
            from app.config import settings
            _spacy_nlp = spacy.load(settings.ner_model)
            logger.info("spaCy model loaded.")
        except Exception as e:
            logger.warning(f"spaCy model not found, attempting download: {e}")
            try:
                import subprocess
                subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"], check=True)
                import spacy
                _spacy_nlp = spacy.load("en_core_web_sm")
            except Exception as e2:
                logger.error(f"spaCy load failed: {e2}")
                _spacy_nlp = "failed"
    return _spacy_nlp if _spacy_nlp != "failed" else None


# ─── Summarization ───────────────────────────────────────────────────────────

def chunk_text_for_summarization(text: str, max_tokens: int = 900) -> List[str]:
    """Split text into chunks suitable for BART/T5 (word-level approximation)."""
    words = text.split()
    chunks = []
    current_chunk_words = []
    for word in words:
        current_chunk_words.append(word)
        if len(current_chunk_words) >= max_tokens:
            chunks.append(" ".join(current_chunk_words))
            current_chunk_words = []
    if current_chunk_words:
        chunks.append(" ".join(current_chunk_words))
    return chunks


def summarize_text(text: str, max_length: int = 300, min_length: int = 80) -> str:
    """Summarize a piece of text. Falls back to extractive summary if model unavailable."""
    if not text or len(text.split()) < 30:
        return text or ""

    summarizer = get_summarizer()
    if summarizer:
        try:
            chunks = chunk_text_for_summarization(text, max_tokens=900)
            summaries = []
            for chunk in chunks[:4]:  # limit to 4 chunks
                if len(chunk.split()) < 20:
                    continue
                result = summarizer(
                    chunk,
                    max_length=max_length,
                    min_length=min(min_length, len(chunk.split()) // 2),
                    do_sample=False,
                )
                summaries.append(result[0]["summary_text"])
            if summaries:
                # If multiple chunks, summarize the summaries
                combined = " ".join(summaries)
                if len(summaries) > 1 and len(combined.split()) > max_length:
                    final = summarizer(combined[:3000], max_length=max_length, min_length=min_length, do_sample=False)
                    return final[0]["summary_text"]
                return combined
        except Exception as e:
            logger.warning(f"Model summarization failed, using extractive: {e}")

    # Fallback: extractive summarization (top sentences by word frequency)
    return extractive_summary(text, num_sentences=5)


def extractive_summary(text: str, num_sentences: int = 5) -> str:
    """Simple extractive summarization using word frequency."""
    try:
        import nltk
        from collections import Counter
        try:
            nltk.data.find('tokenizers/punkt_tab')
        except LookupError:
            nltk.download('punkt_tab', quiet=True)
        try:
            nltk.data.find('corpora/stopwords')
        except LookupError:
            nltk.download('stopwords', quiet=True)

        from nltk.tokenize import sent_tokenize, word_tokenize
        from nltk.corpus import stopwords

        sentences = sent_tokenize(text)
        if len(sentences) <= num_sentences:
            return text

        stop_words = set(stopwords.words('english'))
        words = [w.lower() for w in word_tokenize(text) if w.isalnum() and w.lower() not in stop_words]
        word_freq = Counter(words)
        max_freq = max(word_freq.values()) if word_freq else 1

        sentence_scores = {}
        for sent in sentences:
            sent_words = [w.lower() for w in word_tokenize(sent) if w.isalnum()]
            score = sum(word_freq.get(w, 0) / max_freq for w in sent_words)
            sentence_scores[sent] = score / max(len(sent_words), 1)

        top_sentences = sorted(sentence_scores, key=sentence_scores.get, reverse=True)[:num_sentences]
        # Return in original order
        ordered = [s for s in sentences if s in top_sentences]
        return " ".join(ordered)
    except Exception as e:
        logger.warning(f"Extractive summary failed: {e}")
        # Last resort: first 500 words
        return " ".join(text.split()[:500])


def generate_paper_summary(sections: Dict[str, str], full_text: str) -> Dict:
    """
    Generate comprehensive summaries for the whole paper and individual sections.
    """
    result = {}

    # Brief overall summary
    abstract = sections.get("abstract", "")
    if abstract:
        result["brief"] = summarize_text(abstract, max_length=150, min_length=50)
    else:
        result["brief"] = summarize_text(full_text[:3000], max_length=150, min_length=50)

    # Detailed summary
    result["detailed"] = summarize_text(full_text[:6000], max_length=400, min_length=150)

    # Section-wise summaries
    section_summaries = {}
    priority_sections = ["introduction", "methodology", "results", "discussion", "conclusion"]
    for sec in priority_sections:
        text = sections.get(sec, "")
        if text and len(text.split()) > 30:
            section_summaries[sec] = summarize_text(text, max_length=200, min_length=50)

    result["section_summaries"] = section_summaries

    # Extract key findings (from results/conclusion)
    findings_text = sections.get("results", "") + " " + sections.get("conclusion", "")
    if findings_text.strip():
        result["key_findings"] = extractive_summary(findings_text, num_sentences=4)
    else:
        result["key_findings"] = ""

    return result


# ─── Keyword Extraction ───────────────────────────────────────────────────────

def extract_keywords_tfidf(texts: List[str], top_n: int = 20) -> List[Dict]:
    """Extract keywords using TF-IDF across a corpus."""
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        import numpy as np

        vectorizer = TfidfVectorizer(
            max_features=5000,
            stop_words='english',
            ngram_range=(1, 2),
            min_df=1,
        )
        tfidf_matrix = vectorizer.fit_transform(texts)
        feature_names = vectorizer.get_feature_names_out()

        # Average TF-IDF scores across all documents
        avg_scores = tfidf_matrix.mean(axis=0).A1
        top_indices = avg_scores.argsort()[-top_n:][::-1]

        return [
            {"keyword": feature_names[i], "score": float(avg_scores[i])}
            for i in top_indices if avg_scores[i] > 0
        ]
    except Exception as e:
        logger.error(f"TF-IDF keyword extraction failed: {e}")
        return []


def extract_keywords_keybert(text: str, top_n: int = 20) -> List[Dict]:
    """Extract keywords using KeyBERT semantic similarity."""
    kw_model = get_keybert()
    if not kw_model:
        return []
    try:
        # KeyBERT works best with limited text
        keywords = kw_model.extract_keywords(
            text[:5000],
            keyphrase_ngram_range=(1, 3),
            stop_words='english',
            top_n=top_n,
            use_mmr=True,
            diversity=0.5,
        )
        return [{"keyword": kw, "score": float(score)} for kw, score in keywords]
    except Exception as e:
        logger.error(f"KeyBERT extraction failed: {e}")
        return []


def extract_keywords(text: str, top_n: int = 25) -> List[Dict]:
    """
    Combine TF-IDF and KeyBERT results, deduplicate, and return top keywords.
    """
    tfidf_results = extract_keywords_tfidf([text], top_n=top_n)
    keybert_results = extract_keywords_keybert(text, top_n=top_n)

    # Merge and deduplicate (prefer KeyBERT scores, complement with TF-IDF)
    merged = {}
    for item in keybert_results:
        merged[item["keyword"].lower()] = {"keyword": item["keyword"], "score": item["score"], "source": "keybert"}
    for item in tfidf_results:
        key = item["keyword"].lower()
        if key not in merged:
            merged[key] = {"keyword": item["keyword"], "score": item["score"] * 0.8, "source": "tfidf"}

    sorted_keywords = sorted(merged.values(), key=lambda x: x["score"], reverse=True)
    return sorted_keywords[:top_n]


# ─── Named Entity Recognition ─────────────────────────────────────────────────

RESEARCH_ENTITY_PATTERNS = [
    r'\b(BERT|GPT|T5|BART|RoBERTa|XLNet|ALBERT|DistilBERT|LLaMA|Llama|ChatGPT|GPT-[234]|Transformer)\b',
    r'\b(LSTM|GRU|RNN|CNN|ResNet|VGG|YOLO|U-Net|GAN|VAE|Autoencoder)\b',
    r'\b(ROUGE|BLEU|METEOR|F1|Precision|Recall|Accuracy|AUC|MAP|NDCG|Perplexity|WER|CER)\b',
    r'\b(ImageNet|COCO|MS-COCO|SQuAD|GLUE|SuperGLUE|WikiText|Penn Treebank|Common Crawl|OpenWebText)\b',
    r'\b(PyTorch|TensorFlow|Keras|Hugging Face|scikit-learn|spaCy|NLTK|OpenCV|JAX|Flax)\b',
    r'\b(attention mechanism|self-attention|cross-attention|multi-head attention|positional encoding)\b',
    r'\b(fine-?tuning|pre-?training|transfer learning|few-shot|zero-shot|in-context learning|RLHF)\b',
]


def extract_entities(text: str) -> List[Dict]:
    """
    Extract named entities using spaCy + research-specific pattern matching.
    """
    entities = []
    seen = set()

    # spaCy NER
    nlp = get_spacy_nlp()
    if nlp:
        try:
            # Process in chunks to avoid memory issues
            chunk = text[:10000]
            doc = nlp(chunk)
            for ent in doc.ents:
                key = (ent.text.strip(), ent.label_)
                if key not in seen and len(ent.text.strip()) > 1:
                    seen.add(key)
                    entities.append({
                        "text": ent.text.strip(),
                        "label": ent.label_,
                        "description": _entity_description(ent.label_),
                        "source": "spacy",
                    })
        except Exception as e:
            logger.warning(f"spaCy NER failed: {e}")

    # Research-specific patterns
    import re
    for pattern in RESEARCH_ENTITY_PATTERNS:
        matches = re.findall(pattern, text[:20000], re.IGNORECASE)
        for match in set(matches):
            key = (match, "RESEARCH_ENTITY")
            if key not in seen:
                seen.add(key)
                entities.append({
                    "text": match,
                    "label": "RESEARCH_ENTITY",
                    "description": "Research-specific term (model/metric/dataset/framework)",
                    "source": "pattern",
                })

    return entities[:100]  # Cap at 100 entities


def _entity_description(label: str) -> str:
    descriptions = {
        "PERSON": "Person",
        "ORG": "Organization",
        "GPE": "Country/City/State",
        "DATE": "Date or Time Period",
        "PRODUCT": "Product",
        "EVENT": "Event",
        "WORK_OF_ART": "Work of Art",
        "LAW": "Law or Regulation",
        "LANGUAGE": "Language",
        "PERCENT": "Percentage",
        "MONEY": "Monetary Value",
        "QUANTITY": "Quantity",
        "ORDINAL": "Ordinal Number",
        "CARDINAL": "Cardinal Number",
        "NORP": "Nationality/Religious/Political Group",
        "FAC": "Facility",
        "LOC": "Location",
        "RESEARCH_ENTITY": "Research term",
    }
    return descriptions.get(label, label)
