from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models import PoemStatus, FeedbackStatus, VoiceSessionStatus, MessageRole, FeedbackType, ConfirmationStatus


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
    audio_path: Optional[str] = None


class InlineCommentResponse(BaseModel):
    id: int
    highlighted_text: str
    start_offset: int
    end_offset: int
    comment: str
    comment_audio_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Feedback session schemas
class FeedbackSessionResponse(BaseModel):
    id: int
    poem_id: int
    overall_feedback: Optional[str]
    overall_feedback_audio_url: Optional[str] = None
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


# Voice feedback schemas
class ConversationMessageResponse(BaseModel):
    id: int
    role: MessageRole
    content: str
    audio_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExtractedFeedbackResponse(BaseModel):
    id: int
    feedback_type: FeedbackType
    content: str
    highlighted_text: Optional[str] = None
    start_offset: Optional[int] = None
    end_offset: Optional[int] = None
    confidence: float
    confirmation_status: ConfirmationStatus
    created_at: datetime

    class Config:
        from_attributes = True


class VoiceFeedbackSessionResponse(BaseModel):
    id: int
    feedback_session_id: int
    status: VoiceSessionStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    messages: List[ConversationMessageResponse] = []
    extracted_feedback: List[ExtractedFeedbackResponse] = []

    class Config:
        from_attributes = True


class VoiceMessageRequest(BaseModel):
    text: Optional[str] = None


class ConfirmFeedbackRequest(BaseModel):
    confirmed_ids: List[int]
    rejected_ids: List[int]


# Update forward references
PoemWithFeedback.model_rebuild()
