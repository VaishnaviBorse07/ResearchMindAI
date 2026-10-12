import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, JSON, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class Paper(Base):
    __tablename__ = "papers"

    id = Column(String, primary_key=True, default=gen_uuid)
    title = Column(String, nullable=True)
    authors = Column(JSON, nullable=True)  # list of author strings
    abstract = Column(Text, nullable=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)
    page_count = Column(Integer, nullable=True)
    upload_date = Column(DateTime, default=datetime.utcnow)
    processed = Column(Boolean, default=False)
    processing_error = Column(Text, nullable=True)

    # Extracted content
    full_text = Column(Text, nullable=True)
    sections = Column(JSON, nullable=True)  # {section_name: text}

    # NLP results stored as JSON
    summary = Column(JSON, nullable=True)      # {brief, detailed, section_summaries}
    keywords = Column(JSON, nullable=True)     # [{word, score}]
    entities = Column(JSON, nullable=True)     # [{text, label, start, end}]
    topics = Column(JSON, nullable=True)       # [{topic_id, keywords, weight}]

    # Embedding index reference
    has_embeddings = Column(Boolean, default=False)

    # Bookmarked passages
    bookmarks = relationship("Bookmark", back_populates="paper", cascade="all, delete-orphan")
    analysis_history = relationship("AnalysisHistory", back_populates="paper", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "authors": self.authors,
            "abstract": self.abstract,
            "filename": self.filename,
            "file_size": self.file_size,
            "page_count": self.page_count,
            "upload_date": self.upload_date.isoformat() if self.upload_date else None,
            "processed": self.processed,
            "processing_error": self.processing_error,
            "sections": self.sections,
            "summary": self.summary,
            "keywords": self.keywords,
            "entities": self.entities,
            "topics": self.topics,
            "has_embeddings": self.has_embeddings,
        }


class Bookmark(Base):
    __tablename__ = "bookmarks"

    id = Column(String, primary_key=True, default=gen_uuid)
    paper_id = Column(String, ForeignKey("papers.id"), nullable=False)
    passage = Column(Text, nullable=False)
    note = Column(Text, nullable=True)
    page_number = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    paper = relationship("Paper", back_populates="bookmarks")

    def to_dict(self):
        return {
            "id": self.id,
            "paper_id": self.paper_id,
            "passage": self.passage,
            "note": self.note,
            "page_number": self.page_number,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(String, primary_key=True, default=gen_uuid)
    paper_id = Column(String, ForeignKey("papers.id"), nullable=False)
    analysis_type = Column(String, nullable=False)  # summarize, keywords, entities, qa
    query = Column(Text, nullable=True)
    result = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    paper = relationship("Paper", back_populates="analysis_history")

    def to_dict(self):
        return {
            "id": self.id,
            "paper_id": self.paper_id,
            "analysis_type": self.analysis_type,
            "query": self.query,
            "result": self.result,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
