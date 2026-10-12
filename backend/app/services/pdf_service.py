"""
PDF Processing Service
- Text extraction using PyMuPDF (fitz)
- Section detection using heuristics
- OCR fallback using pytesseract
- Text cleaning and normalization
"""
import re
import os
from typing import Dict, List, Optional, Tuple
from loguru import logger

try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None
    logger.warning("PyMuPDF not installed. PDF extraction unavailable.")

try:
    import pytesseract
    from PIL import Image
    import io
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    logger.warning("pytesseract/Pillow not installed. OCR unavailable.")


SECTION_PATTERNS = {
    "abstract": r"^\s*abstract\s*$",
    "introduction": r"^\s*(?:\d+[\.\s]+)?introduction\s*$",
    "related_work": r"^\s*(?:\d+[\.\s]+)?related\s+work\s*$",
    "methodology": r"^\s*(?:\d+[\.\s]+)?(?:methodology|methods?|approach|proposed\s+method)\s*$",
    "results": r"^\s*(?:\d+[\.\s]+)?(?:results?|experiments?|evaluation|experiments?\s+and\s+results?)\s*$",
    "discussion": r"^\s*(?:\d+[\.\s]+)?discussion\s*$",
    "conclusion": r"^\s*(?:\d+[\.\s]+)?conclusion[s]?\s*$",
    "references": r"^\s*references?\s*$",
    "acknowledgements": r"^\s*acknowledgements?\s*$",
}


def extract_text_from_pdf(file_path: str) -> Tuple[str, int, List[Dict]]:
    """
    Extract text from a PDF file.
    Returns: (full_text, page_count, pages_data)
    pages_data: list of {page_num, text, has_text}
    """
    if fitz is None:
        raise RuntimeError("PyMuPDF is not installed.")

    doc = fitz.open(file_path)
    page_count = len(doc)
    pages_data = []
    full_text_parts = []

    for page_num in range(page_count):
        page = doc[page_num]
        text = page.get_text("text")

        if not text.strip() and OCR_AVAILABLE:
            # Try OCR for scanned pages
            try:
                pix = page.get_pixmap(dpi=200)
                img_bytes = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_bytes))
                text = pytesseract.image_to_string(img)
                logger.info(f"OCR applied to page {page_num + 1}")
            except Exception as e:
                logger.warning(f"OCR failed on page {page_num + 1}: {e}")

        pages_data.append({
            "page_num": page_num + 1,
            "text": text,
            "has_text": bool(text.strip()),
        })
        full_text_parts.append(text)

    doc.close()
    full_text = "\n".join(full_text_parts)
    return full_text, page_count, pages_data


def extract_metadata(file_path: str) -> Dict:
    """Extract PDF metadata: title, authors, etc."""
    if fitz is None:
        return {}
    try:
        doc = fitz.open(file_path)
        meta = doc.metadata or {}
        doc.close()
        return {
            "title": meta.get("title", "").strip() or None,
            "author": meta.get("author", "").strip() or None,
            "subject": meta.get("subject", "").strip() or None,
            "creator": meta.get("creator", "").strip() or None,
        }
    except Exception as e:
        logger.warning(f"Metadata extraction failed: {e}")
        return {}


def detect_sections(full_text: str) -> Dict[str, str]:
    """
    Detect common academic paper sections using heading heuristics.
    Returns a dict mapping section names to their text content.
    """
    lines = full_text.split("\n")
    sections: Dict[str, str] = {}
    current_section = "preamble"
    current_lines = []

    for line in lines:
        stripped = line.strip()
        matched_section = None

        for section_name, pattern in SECTION_PATTERNS.items():
            if re.match(pattern, stripped, re.IGNORECASE):
                matched_section = section_name
                break

        if matched_section:
            # Save previous section
            if current_lines:
                content = "\n".join(current_lines).strip()
                if content:
                    sections[current_section] = content
            current_section = matched_section
            current_lines = []
        else:
            current_lines.append(line)

    # Save last section
    if current_lines:
        content = "\n".join(current_lines).strip()
        if content:
            sections[current_section] = content

    return sections


def extract_title_and_authors(full_text: str, metadata: Dict) -> Tuple[Optional[str], Optional[List[str]]]:
    """
    Try to extract title and authors from the first page of text.
    Falls back to PDF metadata.
    """
    title = metadata.get("title")
    authors = None

    if metadata.get("author"):
        # Split common author delimiters
        raw_authors = metadata["author"]
        authors = [a.strip() for a in re.split(r"[;,]|and ", raw_authors) if a.strip()]

    if not title:
        # Heuristic: title is usually the first non-empty, short-ish line
        lines = [l.strip() for l in full_text.split("\n") if l.strip()]
        for line in lines[:10]:
            if 5 < len(line) < 200 and not line.startswith("http"):
                title = line
                break

    return title, authors


def clean_text(text: str) -> str:
    """Clean extracted text: remove excessive whitespace, fix encoding issues."""
    # Remove non-printable characters except newlines and spaces
    text = re.sub(r'[^\x20-\x7E\n\t]', ' ', text)
    # Collapse multiple spaces
    text = re.sub(r' {2,}', ' ', text)
    # Collapse more than 2 consecutive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Remove hyphenation artifacts at end of line
    text = re.sub(r'-\n([a-z])', r'\1', text)
    return text.strip()


def chunk_text(text: str, max_chunk_size: int = 512, overlap: int = 50) -> List[Dict]:
    """
    Split text into overlapping chunks for embedding and summarization.
    Returns list of {chunk_id, text, char_start, char_end}
    """
    words = text.split()
    chunks = []
    chunk_id = 0

    i = 0
    while i < len(words):
        chunk_words = words[i:i + max_chunk_size]
        chunk_text_str = " ".join(chunk_words)
        char_start = text.find(chunk_words[0]) if chunk_words else 0

        chunks.append({
            "chunk_id": chunk_id,
            "text": chunk_text_str,
            "word_start": i,
            "word_end": i + len(chunk_words),
        })
        chunk_id += 1
        i += max_chunk_size - overlap

    return chunks


def process_paper(file_path: str) -> Dict:
    """
    Full pipeline: extract text, metadata, sections, title/authors.
    Returns a dict with all extracted info.
    """
    logger.info(f"Processing PDF: {file_path}")

    # Extract raw text
    full_text, page_count, pages_data = extract_text_from_pdf(file_path)
    full_text = clean_text(full_text)

    # Extract metadata
    metadata = extract_metadata(file_path)

    # Detect sections
    sections = detect_sections(full_text)

    # Extract title and authors
    title, authors = extract_title_and_authors(full_text, metadata)

    # Get abstract from sections or first paragraph
    abstract = sections.get("abstract", "")
    if not abstract:
        # Try preamble
        preamble = sections.get("preamble", "")
        if preamble:
            paragraphs = [p.strip() for p in preamble.split("\n\n") if p.strip()]
            if paragraphs:
                abstract = paragraphs[0][:2000]

    return {
        "title": title,
        "authors": authors,
        "abstract": abstract[:3000] if abstract else None,
        "full_text": full_text,
        "page_count": page_count,
        "sections": sections,
        "pages_data": pages_data,
    }
