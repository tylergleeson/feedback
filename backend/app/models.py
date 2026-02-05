from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class PoemStatus(str, enum.Enum):
    draft = "draft"
    under_review = "under_review"
    revised = "revised"
    accepted = "accepted"


class FeedbackStatus(str, enum.Enum):
    in_progress = "in_progress"
    submitted = "submitted"
    processed = "processed"


class GuideVersion(Base):
    __tablename__ = "guide_versions"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    version = Column(Integer, nullable=False)
    change_summary = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Poem(Base):
    __tablename__ = "poems"

    id = Column(Integer, primary_key=True, index=True)
    prompt = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    guide_version = Column(Integer, nullable=False)
    status = Column(Enum(PoemStatus), default=PoemStatus.draft)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    feedback_sessions = relationship("FeedbackSession", back_populates="poem")


class FeedbackSession(Base):
    __tablename__ = "feedback_sessions"

    id = Column(Integer, primary_key=True, index=True)
    poem_id = Column(Integer, ForeignKey("poems.id"), nullable=False)
    overall_feedback = Column(Text, nullable=True)
    rating = Column(Integer, nullable=True)
    status = Column(Enum(FeedbackStatus), default=FeedbackStatus.in_progress)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    poem = relationship("Poem", back_populates="feedback_sessions")
    comments = relationship("InlineComment", back_populates="session", cascade="all, delete-orphan")
    revision = relationship("Revision", back_populates="session", uselist=False)


class InlineComment(Base):
    __tablename__ = "inline_comments"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("feedback_sessions.id"), nullable=False)
    highlighted_text = Column(Text, nullable=False)
    start_offset = Column(Integer, nullable=False)
    end_offset = Column(Integer, nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("FeedbackSession", back_populates="comments")


class Revision(Base):
    __tablename__ = "revisions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("feedback_sessions.id"), nullable=False, unique=True)
    original_poem_id = Column(Integer, ForeignKey("poems.id"), nullable=False)
    revised_poem = Column(Text, nullable=False)
    proposed_guide_changes = Column(Text, nullable=True)
    rationale = Column(Text, nullable=True)
    poem_accepted = Column(Integer, default=0)  # 0=pending, 1=accepted, -1=rejected
    guide_changes_accepted = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("FeedbackSession", back_populates="revision")
    original_poem = relationship("Poem", foreign_keys=[original_poem_id])
