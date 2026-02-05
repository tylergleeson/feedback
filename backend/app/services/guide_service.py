from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models import GuideVersion
from app.config import settings
from typing import Optional


async def get_current_guide(db: AsyncSession) -> tuple[str, int]:
    """Get the current guide content and version."""
    # First check if we have any versions in DB
    result = await db.execute(
        select(GuideVersion).order_by(GuideVersion.version.desc()).limit(1)
    )
    latest = result.scalar_one_or_none()

    if latest:
        return latest.content, latest.version

    # If no versions in DB, read from file and create version 1
    content = settings.guide_path.read_text()
    version = GuideVersion(content=content, version=1, change_summary="Initial guide")
    db.add(version)
    await db.commit()
    return content, 1


async def update_guide(db: AsyncSession, content: str, change_summary: Optional[str] = None) -> int:
    """Update the guide with new content, creating a new version."""
    # Get current version number
    result = await db.execute(select(func.max(GuideVersion.version)))
    current_version = result.scalar() or 0

    new_version = GuideVersion(
        content=content,
        version=current_version + 1,
        change_summary=change_summary
    )
    db.add(new_version)

    # Also update the file
    settings.guide_path.write_text(content)

    await db.commit()
    return new_version.version


async def get_guide_history(db: AsyncSession) -> list[GuideVersion]:
    """Get all guide versions."""
    result = await db.execute(
        select(GuideVersion).order_by(GuideVersion.version.desc())
    )
    return list(result.scalars().all())


async def get_guide_version(db: AsyncSession, version: int) -> Optional[GuideVersion]:
    """Get a specific guide version."""
    result = await db.execute(
        select(GuideVersion).where(GuideVersion.version == version)
    )
    return result.scalar_one_or_none()
