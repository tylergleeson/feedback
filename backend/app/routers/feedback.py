from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pathlib import Path
import uuid
import os
from app.database import get_db
from app.models import Poem, FeedbackSession, InlineComment, Revision, PoemStatus, FeedbackStatus
from app.schemas import (
    FeedbackSessionResponse, FeedbackUpdate,
    InlineCommentCreate, InlineCommentResponse, RevisionResponse
)
from app.services import guide_service
from app.services.ai_reviser import generate_revision
from app.services.whisper_service import transcribe_audio

router = APIRouter(prefix="/api", tags=["feedback"])

# Maximum file size: 25MB (Whisper API limit)
MAX_AUDIO_SIZE = 25 * 1024 * 1024


@router.post("/feedback/{session_id}/transcribe-overall")
async def transcribe_overall_feedback(
    session_id: int,
    audio_file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload and transcribe audio for overall feedback."""
    # Verify session exists and is in progress
    result = await db.execute(
        select(FeedbackSession).where(FeedbackSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != FeedbackStatus.in_progress:
        raise HTTPException(status_code=400, detail="Cannot add audio to submitted session")

    # Validate file size
    content = await audio_file.read()
    if len(content) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_AUDIO_SIZE / (1024 * 1024)}MB")

    # Save audio file
    upload_dir = Path("uploads/audio")
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_uuid = str(uuid.uuid4())
    # Get file extension from content type or filename
    ext = ".webm"
    if audio_file.filename:
        ext = Path(audio_file.filename).suffix or ".webm"

    filename = f"session_{session_id}_overall_{file_uuid}{ext}"
    file_path = upload_dir / filename

    try:
        with open(file_path, "wb") as f:
            f.write(content)

        # Transcribe audio
        transcription = await transcribe_audio(str(file_path))

        # Save audio path to database
        session.overall_feedback_audio_path = filename
        await db.commit()

        return {
            "transcription": transcription,
            "audio_url": f"/api/audio/{filename}"
        }

    except Exception as e:
        # Clean up file on error
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/feedback/{session_id}/transcribe-comment")
async def transcribe_comment_audio(
    session_id: int,
    audio_file: UploadFile = File(...),
    highlighted_text: str = Form(...),
    start_offset: int = Form(...),
    end_offset: int = Form(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload and transcribe audio for inline comment."""
    # Verify session exists and is in progress
    result = await db.execute(
        select(FeedbackSession).where(FeedbackSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != FeedbackStatus.in_progress:
        raise HTTPException(status_code=400, detail="Cannot add audio to submitted session")

    # Validate file size
    content = await audio_file.read()
    if len(content) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size is {MAX_AUDIO_SIZE / (1024 * 1024)}MB")

    # Save audio file
    upload_dir = Path("uploads/audio")
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_uuid = str(uuid.uuid4())
    # Get file extension from content type or filename
    ext = ".webm"
    if audio_file.filename:
        ext = Path(audio_file.filename).suffix or ".webm"

    filename = f"session_{session_id}_comment_{file_uuid}{ext}"
    file_path = upload_dir / filename

    try:
        with open(file_path, "wb") as f:
            f.write(content)

        # Transcribe audio
        transcription = await transcribe_audio(str(file_path))

        return {
            "transcription": transcription,
            "audio_path": filename,
            "highlighted_text": highlighted_text,
            "start_offset": start_offset,
            "end_offset": end_offset
        }

    except Exception as e:
        # Clean up file on error
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/poems/{poem_id}/feedback/start", response_model=FeedbackSessionResponse)
async def start_feedback_session(poem_id: int, db: AsyncSession = Depends(get_db)):
    """Start a new feedback session for a poem."""
    # Check poem exists
    result = await db.execute(select(Poem).where(Poem.id == poem_id))
    poem = result.scalar_one_or_none()
    if not poem:
        raise HTTPException(status_code=404, detail="Poem not found")

    # Update poem status
    poem.status = PoemStatus.under_review

    # Create session
    session = FeedbackSession(poem_id=poem_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return FeedbackSessionResponse(
        id=session.id,
        poem_id=session.poem_id,
        overall_feedback=session.overall_feedback,
        rating=session.rating,
        status=session.status,
        created_at=session.created_at,
        comments=[]
    )


@router.get("/feedback/{session_id}", response_model=FeedbackSessionResponse)
async def get_feedback_session(session_id: int, db: AsyncSession = Depends(get_db)):
    """Get a feedback session with its comments."""
    result = await db.execute(
        select(FeedbackSession)
        .options(selectinload(FeedbackSession.comments))
        .where(FeedbackSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Transform audio paths to URLs
    comments_data = []
    for comment in session.comments:
        comment_dict = {
            "id": comment.id,
            "highlighted_text": comment.highlighted_text,
            "start_offset": comment.start_offset,
            "end_offset": comment.end_offset,
            "comment": comment.comment,
            "comment_audio_url": f"/api/audio/{comment.comment_audio_path}" if comment.comment_audio_path else None,
            "created_at": comment.created_at
        }
        comments_data.append(InlineCommentResponse(**comment_dict))

    return FeedbackSessionResponse(
        id=session.id,
        poem_id=session.poem_id,
        overall_feedback=session.overall_feedback,
        overall_feedback_audio_url=f"/api/audio/{session.overall_feedback_audio_path}" if session.overall_feedback_audio_path else None,
        rating=session.rating,
        status=session.status,
        created_at=session.created_at,
        comments=comments_data
    )


@router.post("/feedback/{session_id}/comment", response_model=InlineCommentResponse)
async def add_comment(
    session_id: int,
    comment: InlineCommentCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add an inline comment to a feedback session."""
    result = await db.execute(
        select(FeedbackSession).where(FeedbackSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != FeedbackStatus.in_progress:
        raise HTTPException(status_code=400, detail="Cannot add comments to submitted session")

    inline_comment = InlineComment(
        session_id=session_id,
        highlighted_text=comment.highlighted_text,
        start_offset=comment.start_offset,
        end_offset=comment.end_offset,
        comment=comment.comment,
        comment_audio_path=comment.audio_path
    )
    db.add(inline_comment)
    await db.commit()
    await db.refresh(inline_comment)

    return inline_comment


@router.delete("/feedback/{session_id}/comment/{comment_id}")
async def delete_comment(
    session_id: int,
    comment_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete an inline comment."""
    result = await db.execute(
        select(InlineComment)
        .where(InlineComment.id == comment_id, InlineComment.session_id == session_id)
    )
    comment = result.scalar_one_or_none()

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    await db.delete(comment)
    await db.commit()

    return {"status": "deleted"}


@router.put("/feedback/{session_id}", response_model=FeedbackSessionResponse)
async def update_feedback(
    session_id: int,
    update: FeedbackUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update overall feedback and rating."""
    result = await db.execute(
        select(FeedbackSession)
        .options(selectinload(FeedbackSession.comments))
        .where(FeedbackSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != FeedbackStatus.in_progress:
        raise HTTPException(status_code=400, detail="Cannot update submitted session")

    if update.overall_feedback is not None:
        session.overall_feedback = update.overall_feedback
    if update.rating is not None:
        session.rating = update.rating

    await db.commit()
    await db.refresh(session)

    return session


@router.post("/feedback/{session_id}/submit", response_model=FeedbackSessionResponse)
async def submit_feedback(session_id: int, db: AsyncSession = Depends(get_db)):
    """Submit feedback session for processing."""
    result = await db.execute(
        select(FeedbackSession)
        .options(selectinload(FeedbackSession.comments))
        .where(FeedbackSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != FeedbackStatus.in_progress:
        raise HTTPException(status_code=400, detail="Session already submitted")

    session.status = FeedbackStatus.submitted
    await db.commit()
    await db.refresh(session)

    return session


@router.post("/feedback/{session_id}/process", response_model=RevisionResponse)
async def process_feedback(session_id: int, db: AsyncSession = Depends(get_db)):
    """Process submitted feedback and generate revision."""
    result = await db.execute(
        select(FeedbackSession)
        .options(
            selectinload(FeedbackSession.comments),
            selectinload(FeedbackSession.poem),
            selectinload(FeedbackSession.revision)
        )
        .where(FeedbackSession.id == session_id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != FeedbackStatus.submitted:
        raise HTTPException(status_code=400, detail="Session must be submitted first")

    # Check if revision already exists
    if session.revision is not None:
        return session.revision

    # Get guide for the poem's version
    guide_version = await guide_service.get_guide_version(db, session.poem.guide_version)
    guide_content = guide_version.content if guide_version else ""

    # Prepare comments for AI
    comments_data = [
        {
            "highlighted_text": c.highlighted_text,
            "comment": c.comment
        }
        for c in session.comments
    ]

    # Generate revision
    revision_data = await generate_revision(
        original_poem=session.poem.content,
        feedback=session.overall_feedback or "",
        comments=comments_data,
        guide=guide_content
    )

    # Create revision record
    revision = Revision(
        session_id=session_id,
        original_poem_id=session.poem.id,
        revised_poem=revision_data["revised_poem"],
        proposed_guide_changes=revision_data.get("proposed_guide_changes"),
        rationale=revision_data.get("rationale")
    )
    db.add(revision)

    # Update session status
    session.status = FeedbackStatus.processed

    await db.commit()
    await db.refresh(revision)

    return revision
