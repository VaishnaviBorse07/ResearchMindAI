"""
Topic Modeling Service
- LDA using Gensim
- BERTopic (optional, GPU-friendly)
- Keyword frequency visualization data
"""
from typing import Dict, List, Optional
from loguru import logger


def run_lda_topic_modeling(texts: List[str], num_topics: int = 5) -> List[Dict]:
    """
    Run LDA topic modeling using Gensim.
    Returns list of {topic_id, keywords, coherence_score}
    """
    try:
        import gensim
        from gensim import corpora
        from gensim.models import LdaModel
        from gensim.utils import simple_preprocess
        import nltk

        try:
            nltk.data.find('corpora/stopwords')
        except LookupError:
            nltk.download('stopwords', quiet=True)
        from nltk.corpus import stopwords

        stop_words = set(stopwords.words('english'))
        stop_words.update(['paper', 'proposed', 'method', 'model', 'result', 'show', 'using', 'used'])

        def preprocess(text):
            return [
                token for token in simple_preprocess(text, deacc=True)
                if token not in stop_words and len(token) > 2
            ]

        processed_texts = [preprocess(t) for t in texts]
        processed_texts = [t for t in processed_texts if t]  # remove empty

        if len(processed_texts) < 2:
            return []

        dictionary = corpora.Dictionary(processed_texts)
        dictionary.filter_extremes(no_below=1, no_above=0.9)
        corpus = [dictionary.doc2bow(text) for text in processed_texts]

        actual_topics = min(num_topics, len(processed_texts))
        lda_model = LdaModel(
            corpus=corpus,
            id2word=dictionary,
            num_topics=actual_topics,
            random_state=42,
            passes=10,
            alpha='auto',
        )

        topics = []
        for topic_id in range(actual_topics):
            top_words = lda_model.show_topic(topic_id, topn=10)
            topics.append({
                "topic_id": topic_id,
                "keywords": [{"word": word, "weight": float(weight)} for word, weight in top_words],
                "label": f"Topic {topic_id + 1}",
            })

        # Assign documents to topics
        doc_topic_assignments = []
        for i, bow in enumerate(corpus):
            topic_probs = lda_model.get_document_topics(bow)
            if topic_probs:
                dominant_topic = max(topic_probs, key=lambda x: x[1])
                doc_topic_assignments.append({
                    "doc_idx": i,
                    "topic_id": dominant_topic[0],
                    "probability": float(dominant_topic[1]),
                })

        return topics

    except ImportError:
        logger.warning("Gensim not installed. LDA unavailable.")
        return []
    except Exception as e:
        logger.error(f"LDA topic modeling failed: {e}")
        return []


def run_bertopic_modeling(texts: List[str], num_topics: int = 5) -> List[Dict]:
    """
    Run BERTopic topic modeling (GPU-optional).
    """
    try:
        from bertopic import BERTopic

        if len(texts) < 3:
            return []

        topic_model = BERTopic(nr_topics=num_topics, verbose=False)
        topics, probs = topic_model.fit_transform(texts)

        topic_info = topic_model.get_topic_info()
        result = []
        for _, row in topic_info.iterrows():
            topic_id = row['Topic']
            if topic_id == -1:
                continue  # Skip outlier topic
            keywords = topic_model.get_topic(topic_id)
            result.append({
                "topic_id": int(topic_id),
                "keywords": [
                    {"word": word, "weight": float(weight)}
                    for word, weight in (keywords or [])[:10]
                ],
                "label": f"Topic {topic_id + 1}",
                "doc_count": int(row.get('Count', 0)),
            })
        return result

    except ImportError:
        logger.warning("BERTopic not installed.")
        return []
    except Exception as e:
        logger.error(f"BERTopic modeling failed: {e}")
        return []


def analyze_topics(papers_data: List[Dict]) -> Dict:
    """
    Run topic modeling across multiple papers.
    papers_data: list of {paper_id, title, full_text}
    """
    texts = []
    paper_meta = []

    for paper in papers_data:
        text = paper.get("full_text", "")
        if text and len(text.split()) > 50:
            texts.append(text[:5000])  # Limit per document
            paper_meta.append({
                "paper_id": paper.get("paper_id", ""),
                "title": paper.get("title", "Unknown"),
            })

    if not texts:
        return {"topics": [], "error": "No sufficient text available for topic modeling."}

    # Try BERTopic first, fall back to LDA
    topics = run_bertopic_modeling(texts, num_topics=min(5, len(texts)))
    method = "bertopic"

    if not topics:
        topics = run_lda_topic_modeling(texts, num_topics=min(5, len(texts)))
        method = "lda"

    # Compute keyword frequency across all texts
    keyword_freq = compute_keyword_frequency(texts)

    return {
        "method": method,
        "topics": topics,
        "keyword_frequency": keyword_freq[:30],
        "paper_count": len(texts),
        "papers": paper_meta,
    }


def compute_keyword_frequency(texts: List[str], top_n: int = 40) -> List[Dict]:
    """Compute term frequencies across all documents."""
    try:
        from sklearn.feature_extraction.text import CountVectorizer
        import numpy as np

        vectorizer = CountVectorizer(
            stop_words='english',
            ngram_range=(1, 2),
            max_features=200,
            min_df=1,
        )
        count_matrix = vectorizer.fit_transform(texts)
        feature_names = vectorizer.get_feature_names_out()
        total_counts = count_matrix.toarray().sum(axis=0)

        top_indices = total_counts.argsort()[-top_n:][::-1]
        return [
            {"word": feature_names[i], "count": int(total_counts[i])}
            for i in top_indices if total_counts[i] > 0
        ]
    except Exception as e:
        logger.error(f"Keyword frequency failed: {e}")
        return []
