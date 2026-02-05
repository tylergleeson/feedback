"""Voice feedback API router for AI-facilitated conversations."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pathlib import Path
import uuid
import os
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models import (
    Poem, FeedbackSession, InlineComment, VoiceFeedbackSession,
    ConversationMessage, ExtractedFeedback, PoemStatus, FeedbackStatus,
    VoiceSessionStatus, MessageRole, FeedbackType, ConfirmationStatus
)
from app.schemas import (
    VoiceFeedbackSessionResponse, ConversationMessageResponse,
    ExtractedFeedbackResponse, VoiceMessageRequest, ConfirmFeedbackRequest
)
from app.services import guide_service
from app.services.ai_interviewer import AIInterviewer
from app.services.whisper_service import transcribe_audio

router = APIRouter(prefix="/api/voice", tags=["voice_feedback"])

# Maximum file size: 25MB (Whisper API limit)
MAX_AUDIO_SIZE = 25 * 1024 * 1024


def transform_audio_url(filename: Optional[str]) -> Optional[str]:
    """Transform filename to full URL."""
    if filename:
        return f"/api/audio/{filename}"
    return None


def to_message_response(message: ConversationMessage) -> ConversationMessageResponse:
    """Convert model to response schema with URL transformation."""
    return ConversationMessageResponse(
        id=message.id,
        role=message.role,
        content=message.content,
        audio_url=transform_audio_url(message.audio_url),
        created_at=message.created_at
    )


def to_extracted_response(item: ExtractedFeedback) -> ExtractedFeedbackResponse:
    """Convert model to response schema."""
    return ExtractedFeedbackResponse(
        id=item.id,
        feedback_type=item.feedback_type,
        content=item.content,
        highlighted_text=item.highlighted_text,
        start_offset=item.start_offset,
        end_offset=item.end_offset,
        confidence=item.confidence,
        confirmation_status=item.confirmation_status,
        created_at=item.created_at
    )


@router.post("/start/{poem_id}", response_model=VoiceFeedbackSessionResponse)
async def start_voice_feedback_session(poem_id: int, db: AsyncSession = Depends(get_db)):
    """
    Start a new voice feedback session for a poem.
    Creates FeedbackSession + VoiceFeedbackSession and returns initial AI greeting.
    """
    # Check poem exists
    result = await db.execute(select(Poem).where(Poem.id == poem_id))
    poem = result.scalar_one_or_none()
    if not poem:
        raise HTTPException(status_code=404, detail="Poem not found")

    # Update poem status
    poem.status = PoemStatus.under_review

    # Create feedback session
    feedback_session = FeedbackSession(poem_id=poem_id)
    db.add(feedback_session)
    await db.flush()

    # Create voice feedback session
    voice_session = VoiceFeedbackSession(
        feedback_session_id=feedback_session.id,
        status=VoiceSessionStatus.active
    )
    db.add(voice_session)
    await db.flush()

    # Get guide for this poem
    guide_version = await guide_service.get_guide_version(db, poem.guide_version)
    guide_content = guide_version.content if guide_version else ""

    # Initialize AI interviewer and get greeting
    interviewer = AIInterviewer(poem.content, guide_content)
    greeting_data = await interviewer.get_initial_greeting()

    # Save initial AI message
    ai_message = ConversationMessage(
        voice_session_id=voice_session.id,
        role=MessageRole.ai,
        content=greeting_data["follow_up_question"]
    )
    db.add(ai_message)

    await db.commit()
    await db.refresh(voice_session)
    await db.refresh(ai_message)

    return VoiceFeedbackSessionResponse(
        id=voice_session.id,
        feedback_session_id=voice_session.feedback_session_id,
        status=voice_session.status,
        created_at=voice_session.created_at,
        completed_at=voice_session.completed_at,
        messages=[to_message_response(ai_message)],
        extracted_feedback=[]
    )


@router.post("/{session_id}/message", response_model=VoiceFeedbackSessionResponse)
async def send_message(
    session_id: int,
    text: Optional[str] = Form(None),
    audio_file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message (text or audio) to the voice feedback session.
    If audio: saves file, transcribes, and uses transcription.
    Processes through AI interviewer and returns updated session with AI response.
    """
    # Verify session exists and is active
    result = await db.execute(
        select(VoiceFeedbackSession)
        .options(
            selectinload(VoiceFeedbackSession.feedback_session).selectinload(FeedbackSession.poem),
            selectinload(VoiceFeedbackSession.messages),
            selectinload(VoiceFeedbackSession.extracted_feedback)
        )
        .where(VoiceFeedbackSession.id == session_id)
    )
    voice_session = result.scalar_one_or_none()

    if not voice_session:
        raise HTTPException(status_code=404, detail="Voice session not found")

    if voice_session.status != VoiceSessionStatus.active:
        raise HTTPException(status_code=400, detail="Session is not active")

    # Process audio if provided
    audio_filename = None
    if audio_file:
        # Validate file size
        content = await audio_file.read()
        if len(content) > MAX_AUDIO_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {MAX_AUDIO_SIZE / (1024 * 1024)}MB"
            )

        # Save audio file
        upload_dir = Path("uploads/audio")
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_uuid = str(uuid.uuid4())
        ext = ".webm"
        if audio_file.filename:
            ext = Path(audio_file.filename).suffix or ".webm"

        audio_filename = f"voice_session_{session_id}_msg_{file_uuid}{ext}"
        file_path = upload_dir / audio_filename

        try:
            with open(file_path, "wb") as f:
                f.write(content)

            # Transcribe audio
            text = await transcribe_audio(str(file_path))

        except Exception as e:
            # Clean up file on error
            if file_path.exists():
                os.remove(file_path)
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    if not text:
        raise HTTPException(status_code=400, detail="Either text or audio_file must be provided")

    # Save SME message
    sme_message = ConversationMessage(
        voice_session_id=voice_session.id,
        role=MessageRole.sme,
        content=text,
        audio_url=audio_filename
    )
    db.add(sme_message)
    await db.flush()

    # Get poem and guide
    poem = voice_session.feedback_session.poem
    guide_version = await guide_service.get_guide_version(db, poem.guide_version)
    guide_content = guide_version.content if guide_version else ""

    # Initialize AI interviewer with conversation history
    interviewer = AIInterviewer(poem.content, guide_content)

    # Rebuild conversation history
    for msg in voice_session.messages:
        interviewer.conversation_history.append({
            "role": msg.role.value,
            "content": msg.content
        })

    # Get AI response
    ai_response = await interviewer.get_response(text)

    # Save AI message
    ai_message = ConversationMessage(
        voice_session_id=voice_session.id,
        role=MessageRole.ai,
        content=ai_response["follow_up_question"]
    )
    db.add(ai_message)
    await db.flush()

    # Save extracted items
    for item in ai_response.get("extracted_items", []):
        extracted = ExtractedFeedback(
            voice_session_id=voice_session.id,
            message_id=ai_message.id,
            feedback_type=FeedbackType(item["feedback_type"]),
            content=item["content"],
            highlighted_text=item.get("highlighted_text"),
            start_offset=item.get("start_offset"),
            end_offset=item.get("end_offset"),
            confidence=item.get("confidence", 0.8),
            confirmation_status=ConfirmationStatus.pending
        )
        db.add(extracted)

    # Auto-complete if AI signals done
    if ai_response.get("is_complete", False):
        voice_session.status = VoiceSessionStatus.completed
        voice_session.completed_at = datetime.utcnow()

    await db.commit()

    # Refresh and return full session
    await db.refresh(voice_session)
    result = await db.execute(
        select(VoiceFeedbackSession)
        .options(
            selectinload(VoiceFeedbackSession.messages),
            selectinload(VoiceFeedbackSession.extracted_feedback)
        )
        .where(VoiceFeedbackSession.id == session_id)
    )
    voice_session = result.scalar_one()

    return VoiceFeedbackSessionResponse(
        id=voice_session.id,
        feedback_session_id=voice_session.feedback_session_id,
        status=voice_session.status,
        created_at=voice_session.created_at,
        completed_at=voice_session.completed_at,
        messages=[to_message_response(msg) for msg in voice_session.messages],
        extracted_feedback=[to_extracted_response(item) for item in voice_session.extracted_feedback]
    )


@router.post("/{session_id}/complete", response_model=VoiceFeedbackSessionResponse)
async def complete_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Mark session as completed and return full summary."""
    result = await db.execute(
        select(VoiceFeedbackSession)
        .options(
            selectinload(VoiceFeedbackSession.messages),
            selectinload(VoiceFeedbackSession.extracted_feedback)
        )
        .where(VoiceFeedbackSession.id == session_id)
    )
    voice_session = result.scalar_one_or_none()

    if not voice_session:
        raise HTTPException(status_code=404, detail="Voice session not found")

    voice_session.status = VoiceSessionStatus.completed
    voice_session.completed_at = datetime.utcnow()

    await db.commit()
    await db.refresh(voice_session)

    return VoiceFeedbackSessionResponse(
        id=voice_session.id,
        feedback_session_id=voice_session.feedback_session_id,
        status=voice_session.status,
        created_at=voice_session.created_at,
        completed_at=voice_session.completed_at,
        messages=[to_message_response(msg) for msg in voice_session.messages],
        extracted_feedback=[to_extracted_response(item) for item in voice_session.extracted_feedback]
    )


@router.post("/{session_id}/confirm")
async def confirm_feedback(
    session_id: int,
    request: ConfirmFeedbackRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Convert confirmed ExtractedFeedback items to InlineComments and overall feedback.
    Marks FeedbackSession as submitted.
    """
    result = await db.execute(
        select(VoiceFeedbackSession)
        .options(
            selectinload(VoiceFeedbackSession.feedback_session),
            selectinload(VoiceFeedbackSession.extracted_feedback)
        )
        .where(VoiceFeedbackSession.id == session_id)
    )
    voice_session = result.scalar_one_or_none()

    if not voice_session:
        raise HTTPException(status_code=404, detail="Voice session not found")

    feedback_session = voice_session.feedback_session

    # Mark rejected items
    for item_id in request.rejected_ids:
        item = next((item for item in voice_session.extracted_feedback if item.id == item_id), None)
        if item:
            item.confirmation_status = ConfirmationStatus.rejected

    # Process confirmed items
    overall_parts = []
    guide_parts = []
    rating_value = None

    for item_id in request.confirmed_ids:
        item = next((item for item in voice_session.extracted_feedback if item.id == item_id), None)
        if not item:
            continue

        item.confirmation_status = ConfirmationStatus.confirmed

        if item.feedback_type == FeedbackType.inline_comment:
            # Create InlineComment
            if item.highlighted_text and item.start_offset is not None and item.end_offset is not None:
                inline_comment = InlineComment(
                    session_id=feedback_session.id,
                    highlighted_text=item.highlighted_text,
                    start_offset=item.start_offset,
                    end_offset=item.end_offset,
                    comment=item.content
                )
                db.add(inline_comment)

        elif item.feedback_type == FeedbackType.overall:
            overall_parts.append(item.content)

        elif item.feedback_type == FeedbackType.guide_suggestion:
            guide_parts.append(item.content)

        elif item.feedback_type == FeedbackType.rating:
            # Extract numeric rating from content
            try:
                # Try to find number in content
                import re
                numbers = re.findall(r'\d+', item.content)
                if numbers:
                    rating_value = int(numbers[0])
            except:
                pass

    # Set overall feedback
    if overall_parts:
        feedback_session.overall_feedback = "\n\n".join(overall_parts)

    # Add guide suggestions to overall feedback
    if guide_parts:
        guide_text = "\n\nSuggested Guide Rules:\n" + "\n".join(f"- {part}" for part in guide_parts)
        feedback_session.overall_feedback = (feedback_session.overall_feedback or "") + guide_text

    # Set rating
    if rating_value is not None:
        feedback_session.rating = rating_value

    # Mark feedback session as submitted
    feedback_session.status = FeedbackStatus.submitted

    await db.commit()

    return {
        "status": "confirmed",
        "feedback_session_id": feedback_session.id,
        "inline_comments_created": len([i for i in request.confirmed_ids
                                        if any(item.id == i and item.feedback_type == FeedbackType.inline_comment
                                               for item in voice_session.extracted_feedback)])
    }


@router.get("/{session_id}", response_model=VoiceFeedbackSessionResponse)
async def get_voice_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Get full voice feedback session with all messages and extracted items."""
    result = await db.execute(
        select(VoiceFeedbackSession)
        .options(
            selectinload(VoiceFeedbackSession.messages),
            selectinload(VoiceFeedbackSession.extracted_feedback)
        )
        .where(VoiceFeedbackSession.id == session_id)
    )
    voice_session = result.scalar_one_or_none()

    if not voice_session:
        raise HTTPException(status_code=404, detail="Voice session not found")

    return VoiceFeedbackSessionResponse(
        id=voice_session.id,
        feedback_session_id=voice_session.feedback_session_id,
        status=voice_session.status,
        created_at=voice_session.created_at,
        completed_at=voice_session.completed_at,
        messages=[to_message_response(msg) for msg in voice_session.messages],
        extracted_feedback=[to_extracted_response(item) for item in voice_session.extracted_feedback]
    )


@router.delete("/{session_id}")
async def cancel_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Cancel a voice feedback session."""
    result = await db.execute(
        select(VoiceFeedbackSession).where(VoiceFeedbackSession.id == session_id)
    )
    voice_session = result.scalar_one_or_none()

    if not voice_session:
        raise HTTPException(status_code=404, detail="Voice session not found")

    voice_session.status = VoiceSessionStatus.cancelled
    voice_session.completed_at = datetime.utcnow()

    await db.commit()

    return {"status": "cancelled"}
