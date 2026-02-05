from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models import Revision, Poem, PoemStatus
from app.schemas import RevisionResponse, RevisionReview
from app.services import guide_service

router = APIRouter(prefix="/api/revisions", tags=["revisions"])


@router.get("/{revision_id}", response_model=RevisionResponse)
async def get_revision(revision_id: int, db: AsyncSession = Depends(get_db)):
    """Get revision details."""
    result = await db.execute(
        select(Revision).where(Revision.id == revision_id)
    )
    revision = result.scalar_one_or_none()

    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")

    return revision


@router.post("/{revision_id}/review", response_model=RevisionResponse)
async def review_revision(
    revision_id: int,
    review: RevisionReview,
    db: AsyncSession = Depends(get_db)
):
    """Submit accept/reject decisions for revision."""
    result = await db.execute(
        select(Revision)
        .options(selectinload(Revision.original_poem))
        .where(Revision.id == revision_id)
    )
    revision = result.scalar_one_or_none()

    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")

    # Handle poem acceptance
    if review.accept_poem:
        revision.poem_accepted = 1
        # Use edited version if provided, otherwise use AI's version
        final_poem = review.edited_poem if review.edited_poem else revision.revised_poem
        revision.revised_poem = final_poem
        # Update original poem status
        revision.original_poem.status = PoemStatus.revised
    else:
        revision.poem_accepted = -1

    # Handle guide changes acceptance
    if review.accept_guide_changes and revision.proposed_guide_changes:
        revision.guide_changes_accepted = 1
        # Use edited version if provided
        final_changes = review.edited_guide_changes if review.edited_guide_changes else revision.proposed_guide_changes

        # Apply guide changes - append to current guide
        current_content, _ = await guide_service.get_current_guide(db)
        new_content = current_content + "\n\n" + final_changes
        await guide_service.update_guide(
            db,
            new_content,
            f"Applied changes from revision #{revision_id}"
        )
    elif review.accept_guide_changes is False:
        revision.guide_changes_accepted = -1

    # If poem was accepted, mark it as such
    if revision.poem_accepted == 1:
        revision.original_poem.status = PoemStatus.accepted

    await db.commit()
    await db.refresh(revision)

    return revision
