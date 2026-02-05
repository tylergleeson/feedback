from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import GuideResponse, GuideUpdate, GuideVersionResponse
from app.services import guide_service

router = APIRouter(prefix="/api/guide", tags=["guide"])


@router.get("", response_model=GuideResponse)
async def get_guide(db: AsyncSession = Depends(get_db)):
    """Get the current poetry guide."""
    content, version = await guide_service.get_current_guide(db)
    return GuideResponse(content=content, version=version)


@router.post("", response_model=GuideResponse)
async def update_guide(
    update: GuideUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update the poetry guide (human edit)."""
    new_version = await guide_service.update_guide(
        db, update.content, update.change_summary
    )
    return GuideResponse(content=update.content, version=new_version)


@router.get("/history", response_model=list[GuideVersionResponse])
async def get_guide_history(db: AsyncSession = Depends(get_db)):
    """Get version history of the guide."""
    versions = await guide_service.get_guide_history(db)
    return versions


@router.get("/version/{version}", response_model=GuideResponse)
async def get_guide_by_version(
    version: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific version of the guide."""
    guide_version = await guide_service.get_guide_version(db, version)
    if not guide_version:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Version not found")
    return GuideResponse(content=guide_version.content, version=guide_version.version)
