"""Realtime voice call endpoints using OpenAI Realtime API via WebRTC."""

import logging
from datetime import datetime

import httpx
from fastapi import APIRouter, Request, Response, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database import get_db
from app.models import (
    Poem, FeedbackSession, VoiceFeedbackSession, ConversationMessage,
    ExtractedFeedback, PoemStatus, FeedbackStatus, VoiceSessionStatus,
    MessageRole, FeedbackType, ConfirmationStatus
)
from app.schemas import (
    SaveRealtimeTranscriptRequest, VoiceFeedbackSessionResponse
)
from app.services.guide_service import get_current_guide
from app.services.ai_interviewer import AIInterviewer
from app.routers.voice_feedback import to_message_response, to_extracted_response

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
- Always speak and respond in English
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

    # Step 1: Create an ephemeral session with OpenAI (server-side, uses secret key)
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.openai.com/v1/realtime/sessions",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
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
            },
            timeout=30.0,
        )

    if not resp.is_success:
        logger.error(
            "OpenAI Realtime session error (status=%d): %s",
            resp.status_code,
            resp.text[:500],
        )
        raise HTTPException(
            status_code=502,
            detail="Failed to create realtime session with OpenAI",
        )

    session_data = resp.json()
    ephemeral_key = session_data.get("client_secret", {}).get("value")
    if not ephemeral_key:
        raise HTTPException(status_code=502, detail="No ephemeral key in session response")

    # Now do the WebRTC SDP exchange using the ephemeral key
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
            headers={
                "Authorization": f"Bearer {ephemeral_key}",
                "Content-Type": "application/sdp",
            },
            content=sdp_offer,
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


@router.post("/save-transcript", response_model=VoiceFeedbackSessionResponse)
async def save_realtime_transcript(
    request: SaveRealtimeTranscriptRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Save a completed realtime call transcript, extract feedback via AI,
    and return a VoiceFeedbackSession for user review/confirmation.
    """
    # Validate poem exists
    result = await db.execute(select(Poem).where(Poem.id == request.poem_id))
    poem = result.scalar_one_or_none()
    if not poem:
        raise HTTPException(status_code=404, detail="Poem not found")

    if not request.transcript:
        raise HTTPException(status_code=400, detail="Transcript is empty")

    # Update poem status
    poem.status = PoemStatus.under_review

    # Create feedback session
    feedback_session = FeedbackSession(poem_id=request.poem_id)
    db.add(feedback_session)
    await db.flush()

    # Create voice feedback session (already completed)
    voice_session = VoiceFeedbackSession(
        feedback_session_id=feedback_session.id,
        status=VoiceSessionStatus.completed,
        completed_at=datetime.utcnow(),
    )
    db.add(voice_session)
    await db.flush()

    # Save transcript entries as ConversationMessage rows
    role_map = {"user": MessageRole.sme, "assistant": MessageRole.ai}
    for entry in request.transcript:
        role = role_map.get(entry.role)
        if role is None:
            continue
        msg = ConversationMessage(
            voice_session_id=voice_session.id,
            role=role,
            content=entry.text,
        )
        db.add(msg)

    await db.flush()

    # Run AI extraction on the full conversation
    guide_content, _ = await get_current_guide(db)
    interviewer = AIInterviewer(poem.content, guide_content)

    # Build conversation history from transcript
    for entry in request.transcript:
        hist_role = "sme" if entry.role == "user" else "ai"
        interviewer.conversation_history.append({
            "role": hist_role,
            "content": entry.text,
        })

    extraction_result = await interviewer.extract_all_feedback()

    # Save extracted feedback rows
    for item in extraction_result.get("extracted_items", []):
        extracted = ExtractedFeedback(
            voice_session_id=voice_session.id,
            feedback_type=FeedbackType(item["feedback_type"]),
            content=item["content"],
            highlighted_text=item.get("highlighted_text"),
            start_offset=item.get("start_offset"),
            end_offset=item.get("end_offset"),
            confidence=item.get("confidence", 0.8),
            confirmation_status=ConfirmationStatus.pending,
        )
        db.add(extracted)

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(VoiceFeedbackSession)
        .options(
            selectinload(VoiceFeedbackSession.messages),
            selectinload(VoiceFeedbackSession.extracted_feedback),
        )
        .where(VoiceFeedbackSession.id == voice_session.id)
    )
    voice_session = result.scalar_one()

    return VoiceFeedbackSessionResponse(
        id=voice_session.id,
        feedback_session_id=voice_session.feedback_session_id,
        status=voice_session.status,
        created_at=voice_session.created_at,
        completed_at=voice_session.completed_at,
        messages=[to_message_response(msg) for msg in voice_session.messages],
        extracted_feedback=[to_extracted_response(item) for item in voice_session.extracted_feedback],
    )
