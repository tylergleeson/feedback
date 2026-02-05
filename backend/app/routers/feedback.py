from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Poem, FeedbackSession, InlineComment, Revision, PoemStatus, FeedbackStatus
from app.schemas import (
    FeedbackSessionResponse, FeedbackUpdate,
    InlineCommentCreate, InlineCommentResponse, RevisionResponse
)
from app.services import guide_service
from app.services.ai_reviser import generate_revision

router = APIRouter(prefix="/api", tags=["feedback"])


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

    return session


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
        comment=comment.comment
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
