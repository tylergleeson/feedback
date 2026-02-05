from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models import GuideVersion
from app.config import settings
from typing import Optional
import os

# Check if OpenAI is available
try:
    from openai import AsyncOpenAI
    HAS_OPENAI = bool(os.getenv("OPENAI_API_KEY"))
    if HAS_OPENAI:
        openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
except ImportError:
    HAS_OPENAI = False
    openai_client = None


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


async def merge_guide_changes(current_guide: str, proposed_changes: str) -> str:
    """
    Intelligently merge proposed guide changes into the current guide.
    Uses AI to resolve conflicts and maintain consistency.
    """
    if not HAS_OPENAI or not openai_client:
        # Fallback: simple append if no OpenAI
        return current_guide + "\n\n## Additional Guidelines\n\n" + proposed_changes

    prompt = f"""You are a technical editor maintaining a comprehensive poetry writing guide.

Your task is to intelligently merge new feedback/guidelines into the existing guide while:
1. **Resolving conflicts**: If new feedback contradicts existing advice, favor the new feedback (it's more recent)
2. **Avoiding redundancy**: Don't repeat advice already covered
3. **Maintaining structure**: Keep the guide organized and well-structured
4. **Preserving clarity**: Ensure the merged content flows naturally
5. **Consolidating similar points**: Merge related advice into coherent sections

**Current Guide:**
{current_guide}

**New Feedback to Merge:**
{proposed_changes}

Return the complete updated guide with the new feedback intelligently integrated. Maintain markdown formatting.
Do not add meta-commentary - just return the merged guide content."""

    try:
        response = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a technical editor who maintains comprehensive writing guides."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
        )

        merged_guide = response.choices[0].message.content.strip()
        return merged_guide

    except Exception as e:
        print(f"Error merging guide changes: {e}")
        # Fallback to simple append on error
        return current_guide + "\n\n## Additional Guidelines\n\n" + proposed_changes
