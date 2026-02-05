from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Poem, PoemStatus, FeedbackSession
from app.schemas import PoemGenerate, PoemResponse, PoemWithFeedback
from app.services import guide_service
from app.services.ai_poet import generate_poem

router = APIRouter(prefix="/api/poems", tags=["poems"])


@router.post("/generate", response_model=PoemResponse)
async def generate_new_poem(
    request: PoemGenerate,
    db: AsyncSession = Depends(get_db)
):
    """Generate a new poem using the current guide."""
    # Get current guide
    guide_content, guide_version = await guide_service.get_current_guide(db)

    # Generate poem
    poem_content = await generate_poem(request.prompt, guide_content)

    # Save to database
    poem = Poem(
        prompt=request.prompt,
        content=poem_content,
        guide_version=guide_version,
        status=PoemStatus.draft
    )
    db.add(poem)
    await db.commit()
    await db.refresh(poem)

    return poem


@router.get("", response_model=list[PoemResponse])
async def list_poems(db: AsyncSession = Depends(get_db)):
    """List all poems."""
    result = await db.execute(
        select(Poem).order_by(Poem.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{poem_id}", response_model=PoemWithFeedback)
async def get_poem(poem_id: int, db: AsyncSession = Depends(get_db)):
    """Get a poem with its feedback sessions."""
    result = await db.execute(
        select(Poem)
        .options(
            selectinload(Poem.feedback_sessions).selectinload(FeedbackSession.comments)
        )
        .where(Poem.id == poem_id)
    )
    poem = result.scalar_one_or_none()

    if not poem:
        raise HTTPException(status_code=404, detail="Poem not found")

    return poem
