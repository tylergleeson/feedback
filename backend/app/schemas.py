from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models import PoemStatus, FeedbackStatus


# Guide schemas
class GuideResponse(BaseModel):
    content: str
    version: int


class GuideUpdate(BaseModel):
    content: str
    change_summary: Optional[str] = None


class GuideVersionResponse(BaseModel):
    id: int
    version: int
    change_summary: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# Poem schemas
class PoemGenerate(BaseModel):
    prompt: str


class PoemResponse(BaseModel):
    id: int
    prompt: str
    content: str
    guide_version: int
    status: PoemStatus
    created_at: datetime

    class Config:
        from_attributes = True


class PoemWithFeedback(PoemResponse):
    feedback_sessions: List["FeedbackSessionResponse"] = []


# Inline comment schemas
class InlineCommentCreate(BaseModel):
    highlighted_text: str
    start_offset: int
    end_offset: int
    comment: str


class InlineCommentResponse(BaseModel):
    id: int
    highlighted_text: str
    start_offset: int
    end_offset: int
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True


# Feedback session schemas
class FeedbackSessionResponse(BaseModel):
    id: int
    poem_id: int
    overall_feedback: Optional[str]
    rating: Optional[int]
    status: FeedbackStatus
    created_at: datetime
    comments: List[InlineCommentResponse] = []

    class Config:
        from_attributes = True


class FeedbackUpdate(BaseModel):
    overall_feedback: Optional[str] = None
    rating: Optional[int] = None


# Revision schemas
class RevisionResponse(BaseModel):
    id: int
    session_id: int
    original_poem_id: int
    revised_poem: str
    proposed_guide_changes: Optional[str]
    rationale: Optional[str]
    poem_accepted: int
    guide_changes_accepted: int
    created_at: datetime

    class Config:
        from_attributes = True


class RevisionReview(BaseModel):
    accept_poem: bool
    accept_guide_changes: bool
    edited_poem: Optional[str] = None
    edited_guide_changes: Optional[str] = None


# Update forward references
PoemWithFeedback.model_rebuild()
