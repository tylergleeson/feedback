"""Realtime voice call endpoints using OpenAI Realtime API via WebRTC."""

import httpx
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db
from app.models import Poem
from app.services.guide_service import get_current_guide

router = APIRouter(prefix="/api/realtime", tags=["realtime"])


@router.get("/context/{poem_id}")
async def get_call_context(poem_id: int, db: AsyncSession = Depends(get_db)):
    """Return poem content + guide for building the system prompt client-side."""
    result = await db.execute(select(Poem).where(Poem.id == poem_id))
    poem = result.scalar_one_or_none()
    if not poem:
        raise HTTPException(status_code=404, detail="Poem not found")

    guide_content, _ = await get_current_guide(db)

    system_prompt = f"""You are an expert poetry editor conducting a live feedback session with a Subject Matter Expert (SME). You're having a natural phone conversation — be warm, conversational, and concise.

The SME is reviewing this poem:

---
{poem.content}
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

    return {
        "poem_id": poem.id,
        "poem_content": poem.content,
        "poem_prompt": poem.prompt,
        "system_prompt": system_prompt,
    }


@router.post("/session")
async def create_realtime_session(request: Request):
    """
    Unified interface: receives browser SDP offer, forwards to OpenAI
    with session config, returns OpenAI's SDP answer.
    """
    if not settings.openai_api_key:
        raise HTTPException(status_code=500, detail="OpenAI API key not configured")

    # Read the SDP offer from the browser
    sdp_offer = await request.body()
    if not sdp_offer:
        raise HTTPException(status_code=400, detail="Missing SDP offer body")

    # Get system prompt from query param (passed as base64 or we get it from header)
    system_prompt = request.headers.get("X-System-Prompt", "You are a helpful poetry feedback assistant.")

    import json
    session_config = json.dumps({
        "type": "realtime",
        "model": "gpt-4o-realtime-preview",
        "voice": "alloy",
        "instructions": system_prompt,
        "input_audio_transcription": {
            "model": "gpt-4o-mini-transcribe"
        },
        "turn_detection": {
            "type": "server_vad",
            "threshold": 0.5,
            "prefix_padding_ms": 300,
            "silence_duration_ms": 500,
        },
    })

    # Build multipart form for OpenAI
    async with httpx.AsyncClient() as client:
        # Use multipart form: sdp + session config
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

    if resp.status_code != 200 and resp.status_code != 201:
        raise HTTPException(
            status_code=resp.status_code,
            detail=f"OpenAI Realtime API error: {resp.text}"
        )

    # Return the SDP answer from OpenAI
    return Response(
        content=resp.content,
        media_type="application/sdp",
        status_code=200,
    )
