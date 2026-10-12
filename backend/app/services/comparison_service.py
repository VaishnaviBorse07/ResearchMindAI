"""
Comparison Service
- Compare multiple research papers across key dimensions
- Returns structured comparison data
"""
from typing import Dict, List, Optional
from loguru import logger
from app.services.nlp_service import summarize_text, extractive_summary


COMPARISON_DIMENSIONS = [
    "research_problem",
    "methodology",
    "algorithms_models",
    "datasets",
    "evaluation_metrics",
    "results",
    "advantages",
    "limitations",
    "contributions",
]

DIMENSION_PROMPTS = {
    "research_problem": ["research problem", "objective", "problem statement", "aim", "goal", "challenge"],
    "methodology": ["methodology", "method", "approach", "technique", "framework", "algorithm", "proposed"],
    "algorithms_models": ["model", "algorithm", "architecture", "BERT", "LSTM", "CNN", "transformer", "neural"],
    "datasets": ["dataset", "data", "corpus", "benchmark", "training data", "evaluation data"],
    "evaluation_metrics": ["ROUGE", "BLEU", "F1", "accuracy", "precision", "recall", "AUC", "metric", "measure"],
    "results": ["result", "performance", "achieved", "obtained", "outperform", "state-of-the-art", "score"],
    "advantages": ["advantage", "benefit", "strength", "improvement", "better", "superior"],
    "limitations": ["limitation", "drawback", "weakness", "future work", "constraint", "challenge"],
    "contributions": ["contribution", "novelty", "propose", "introduce", "novel", "new approach"],
}


def extract_dimension_text(text: str, dimension: str, max_chars: int = 1500) -> str:
    """Extract text most relevant to a comparison dimension using keyword matching."""
    keywords = DIMENSION_PROMPTS.get(dimension, [])
    if not keywords:
        return ""

    lines = text.split("\n")
    relevant_lines = []
    total_chars = 0

    for line in lines:
        line_lower = line.lower()
        if any(kw in line_lower for kw in keywords):
            relevant_lines.append(line)
            total_chars += len(line)
            if total_chars > max_chars:
                break

    if relevant_lines:
        return " ".join(relevant_lines)[:max_chars]

    # Fallback: return first part of text
    return text[:max_chars]


def compare_papers(papers_data: List[Dict]) -> Dict:
    """
    Compare multiple papers across all dimensions.
    papers_data: list of {paper_id, title, full_text, sections, keywords, summary}
    Returns: {dimensions, comparison_table, similarities, differences}
    """
    if len(papers_data) < 2:
        return {"error": "At least 2 papers are required for comparison."}

    comparison_table = {}

    for dimension in COMPARISON_DIMENSIONS:
        dimension_results = []
        for paper in papers_data:
            paper_id = paper.get("paper_id", "")
            title = paper.get("title", "Unknown")
            full_text = paper.get("full_text", "")
            sections = paper.get("sections", {})

            # Try to get relevant text from sections first
            relevant_text = ""
            if dimension == "methodology":
                relevant_text = sections.get("methodology", "") or sections.get("methods", "")
            elif dimension == "results":
                relevant_text = sections.get("results", "") or sections.get("experiments", "")
            elif dimension == "limitations":
                relevant_text = sections.get("conclusion", "") + " " + sections.get("discussion", "")
            elif dimension == "research_problem":
                relevant_text = sections.get("introduction", "") or sections.get("abstract", "")
            elif dimension == "contributions":
                relevant_text = sections.get("abstract", "") + " " + sections.get("introduction", "")

            if not relevant_text:
                relevant_text = extract_dimension_text(full_text, dimension)

            # Summarize or extract
            if relevant_text and len(relevant_text.split()) > 20:
                summary = extractive_summary(relevant_text, num_sentences=3)
            else:
                summary = relevant_text or "Information not found in this paper."

            dimension_results.append({
                "paper_id": paper_id,
                "title": title,
                "content": summary[:500],
            })

        comparison_table[dimension] = dimension_results

    # Find common keywords (similarities)
    keyword_sets = []
    for paper in papers_data:
        kws = paper.get("keywords", [])
        kw_set = {k["keyword"].lower() for k in kws if isinstance(k, dict)}
        keyword_sets.append(kw_set)

    common_keywords = keyword_sets[0].copy() if keyword_sets else set()
    for kw_set in keyword_sets[1:]:
        common_keywords &= kw_set

    return {
        "paper_count": len(papers_data),
        "papers": [{"paper_id": p["paper_id"], "title": p["title"]} for p in papers_data],
        "comparison_table": comparison_table,
        "common_keywords": list(common_keywords)[:15],
        "dimensions": COMPARISON_DIMENSIONS,
    }


def analyze_research_gaps(papers_data: List[Dict]) -> Dict:
    """
    Identify potential research gaps from multiple papers.
    Extracts limitations, future work, and underexplored areas.
    """
    all_limitations = []
    all_future_work = []

    import re

    future_work_patterns = [
        r"future\s+(?:work|research|study|direction)",
        r"we\s+(?:plan|intend|will|aim)\s+to",
        r"(?:can|could|should)\s+be\s+(?:extended|improved|investigated|explored)",
        r"(?:remains|remain)\s+(?:an\s+open|unexplored|challenging)",
        r"warrant[s]?\s+further\s+(?:investigation|study|research)",
        r"(?:one|a)\s+limitation",
    ]

    limitation_patterns = [
        r"(?:our|this|one)\s+(?:limitation|drawback|weakness)",
        r"we\s+(?:did\s+not|do\s+not|cannot|could\s+not)\s+(?:consider|include|address|handle)",
        r"(?:however|unfortunately|despite|although)[,\s]+(?:our|this|the)\s+(?:method|approach|model)",
        r"limited\s+(?:by|to|in)",
    ]

    for paper in papers_data:
        paper_id = paper.get("paper_id", "")
        title = paper.get("title", "Unknown")
        sections = paper.get("sections", {})
        text = sections.get("conclusion", "") + " " + sections.get("discussion", "") + " " + sections.get("future_work", "")

        sentences = text.split(". ")
        for sent in sentences:
            for pattern in future_work_patterns:
                if re.search(pattern, sent, re.IGNORECASE):
                    all_future_work.append({
                        "paper_id": paper_id,
                        "title": title,
                        "text": sent.strip()[:300],
                        "type": "future_work",
                    })
                    break

            for pattern in limitation_patterns:
                if re.search(pattern, sent, re.IGNORECASE):
                    all_limitations.append({
                        "paper_id": paper_id,
                        "title": title,
                        "text": sent.strip()[:300],
                        "type": "limitation",
                    })
                    break

    # Identify recurring themes in limitations
    recurring_themes = _identify_recurring_themes(all_limitations + all_future_work)

    # Generate candidate gap statements
    gaps = _generate_gap_statements(all_limitations, all_future_work, papers_data)

    return {
        "limitations": all_limitations[:20],
        "future_work": all_future_work[:20],
        "recurring_themes": recurring_themes,
        "candidate_gaps": gaps,
        "disclaimer": (
            "These are candidate research gaps identified by automated text analysis. "
            "They require human validation and should not be taken as established scientific findings."
        ),
    }


def _identify_recurring_themes(items: List[Dict]) -> List[Dict]:
    """Find common themes across extracted limitation/future-work statements."""
    theme_keywords = {
        "scalability": ["scalab", "large-scale", "computational cost", "efficiency", "speed"],
        "generalization": ["generaliz", "domain", "out-of-distribution", "cross-domain", "transfer"],
        "dataset_diversity": ["more dataset", "diverse data", "different domain", "limited data"],
        "interpretability": ["interpretab", "explainab", "transparency", "black box", "understanding"],
        "multimodal": ["multimodal", "multi-modal", "image", "audio", "visual"],
        "evaluation": ["evaluation", "benchmark", "baseline", "comparison", "metric"],
        "real_world": ["real-world", "practical", "deployment", "production", "application"],
    }

    theme_counts = {theme: [] for theme in theme_keywords}
    for item in items:
        text_lower = item["text"].lower()
        for theme, keywords in theme_keywords.items():
            if any(kw in text_lower for kw in keywords):
                theme_counts[theme].append({
                    "paper_id": item["paper_id"],
                    "title": item["title"],
                    "evidence": item["text"][:200],
                })

    return [
        {"theme": theme, "occurrences": len(evidence), "papers": evidence[:5]}
        for theme, evidence in theme_counts.items()
        if evidence
    ]


def _generate_gap_statements(limitations, future_work, papers_data) -> List[Dict]:
    """Generate specific research gap candidate statements with evidence."""
    gaps = []

    theme_to_gap = {
        "scalability": "Improving computational efficiency and scalability to handle larger datasets or real-time scenarios.",
        "generalization": "Evaluating cross-domain generalization and robustness to distribution shift.",
        "dataset_diversity": "Evaluation on more diverse, multilingual, or domain-specific datasets.",
        "interpretability": "Developing interpretable or explainable versions of the proposed models.",
        "multimodal": "Extending the approach to multimodal inputs (text, image, audio).",
        "evaluation": "More comprehensive evaluation against additional state-of-the-art baselines.",
        "real_world": "Real-world deployment and end-to-end system evaluation in practical settings.",
    }

    all_items = limitations + future_work
    theme_keywords = {
        "scalability": ["scalab", "computational", "efficiency", "large-scale"],
        "generalization": ["generaliz", "domain", "transfer"],
        "dataset_diversity": ["more dataset", "diverse", "limited data"],
        "interpretability": ["interpretab", "explainab", "black box"],
        "multimodal": ["multimodal", "visual", "audio"],
        "evaluation": ["evaluation", "benchmark", "baseline"],
        "real_world": ["real-world", "practical", "deploy"],
    }

    for theme, gap_text in theme_to_gap.items():
        keywords = theme_keywords.get(theme, [])
        supporting_evidence = []

        for item in all_items:
            if any(kw in item["text"].lower() for kw in keywords):
                supporting_evidence.append({
                    "paper_id": item["paper_id"],
                    "title": item["title"],
                    "evidence": item["text"][:200],
                })

        if supporting_evidence:
            gaps.append({
                "gap": gap_text,
                "theme": theme,
                "evidence_count": len(supporting_evidence),
                "supporting_papers": supporting_evidence[:3],
            })

    gaps.sort(key=lambda x: x["evidence_count"], reverse=True)
    return gaps[:7]
