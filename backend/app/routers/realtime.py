"""Realtime voice call endpoints using OpenAI Realtime API via WebRTC."""

import json
import logging

import httpx
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models import Poem
from app.services.guide_service import get_current_guide

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/realtime", tags=["realtime"])


def _build_system_prompt(poem_content: str, guide_content: str) -> str:
    """Build the AI interviewer system prompt for a realtime call."""
    return f"""You are an expert poetry editor conducting a live feedback session with a Subject Matter Expert (SME). You're having a natural phone conversation — be warm, conversational, and concise.

The SME is reviewing this poem:

---
{poem_content}
---

Current poetry guidelines:
{guide_content}

YOUR ROLE:
- Start by briefly greeting the SME and asking for their overall impression of the poem
- Listen carefully and ask intelligent follow-up questions
- Ask "why" questions: "What would stronger imagery look like here?"
- Probe specifics: "You mentioned weak verbs — which ones stood out?"
- Connect patterns: "You've mentioned passive voice before — should this be a guide rule?"
- Keep your responses SHORT — this is a conversation, not a lecture. 1-2 sentences typically.
- Recognize when the SME is done — if they give short responses or say "that's it", wrap up naturally
- At the end, briefly summarize the key feedback points

IMPORTANT:
- Speak naturally, like a knowledgeable colleague on a phone call
- Don't be overly formal or robotic
- Don't list things — just talk
- Match the SME's energy and pace"""


@router.get("/context/{poem_id}")
async def get_call_context(poem_id: int, db: AsyncSession = Depends(get_db)):
    """Return poem content + guide for the frontend to display during a call."""
    result = await db.execute(select(Poem).where(Poem.id == poem_id))
    poem = result.scalar_one_or_none()
    if not poem:
        raise HTTPException(status_code=404, detail="Poem not found")

    return {
        "poem_id": poem.id,
        "poem_content": poem.content,
        "poem_prompt": poem.prompt,
    }


@router.post("/session/{poem_id}")
async def create_realtime_session(
    poem_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Unified interface: receives browser SDP offer, builds system prompt
    server-side from the poem/guide, forwards to OpenAI, returns SDP answer.
    """
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    # Validate poem exists and build prompt server-side (avoids header size limits)
    result = await db.execute(select(Poem).where(Poem.id == poem_id))
    poem = result.scalar_one_or_none()
    if not poem:
        raise HTTPException(status_code=404, detail="Poem not found")

    guide_content, _ = await get_current_guide(db)
    system_prompt = _build_system_prompt(poem.content, guide_content)

    # Read the SDP offer from the browser
    sdp_offer = await request.body()
    if not sdp_offer:
        raise HTTPException(status_code=400, detail="Missing SDP offer body")

    session_config = json.dumps({
        "type": "realtime",
        "model": "gpt-4o-realtime-preview",
        "voice": "alloy",
        "instructions": system_prompt,
        "input_audio_transcription": {
            "model": "gpt-4o-mini-transcribe",
        },
        "turn_detection": {
            "type": "server_vad",
            "threshold": 0.5,
            "prefix_padding_ms": 300,
            "silence_duration_ms": 500,
        },
    })

    async with httpx.AsyncClient() as client:
        files = {
            "sdp": ("offer.sdp", sdp_offer, "application/sdp"),
            "session": ("session.json", session_config, "application/json"),
        }

        resp = await client.post(
            "https://api.openai.com/v1/realtime/calls",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
            },
            files=files,
            timeout=30.0,
        )

    if not resp.is_success:
        logger.error(
            "OpenAI Realtime API error (status=%d): %s",
            resp.status_code,
            resp.text[:500],
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to create realtime session with OpenAI",
        )

    return Response(
        content=resp.content,
        media_type="application/sdp",
        status_code=200,
    )
