# Voice + AI Interview Feedback System - Implementation Spec

## Overview

Transform the SME feedback experience from form-filling to an AI-facilitated voice conversation. The SME speaks naturally, and an AI interviewer asks intelligent follow-up questions to extract structured, actionable feedback.

---

## Success Criteria (User Experience)

| Criteria | Target |
|----------|--------|
| Time to complete feedback | < 3 minutes |
| Friction to start | One tap to begin |
| Conversation quality | Feels like a thoughtful colleague |
| Feedback richness | 2x more actionable insights vs text |
| SME satisfaction | 4+/5 "this was easy" |

---

## User Flow

```
1. SME views poem
2. Taps "Voice Feedback" button → mic activates
3. SME speaks naturally about the poem
4. AI transcribes and responds with follow-up questions
5. Conversation continues until SME is done
6. AI shows structured summary
7. SME confirms → feedback submitted
```

---

## Technical Implementation

### Phase 1: Database Changes

#### New Models (add to `backend/app/models.py`)

```python
class VoiceFeedbackSession(Base):
    __tablename__ = "voice_feedback_sessions"

    id = Column(Integer, primary_key=True, index=True)
    feedback_session_id = Column(Integer, ForeignKey("feedback_sessions.id"), nullable=False)
    status = Column(String, default="active")  # active, completed, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    feedback_session = relationship("FeedbackSession")
    messages = relationship("ConversationMessage", back_populates="voice_session", cascade="all, delete-orphan")
    extracted_feedback = relationship("ExtractedFeedback", back_populates="voice_session", cascade="all, delete-orphan")


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    voice_session_id = Column(Integer, ForeignKey("voice_feedback_sessions.id"), nullable=False)
    role = Column(String, nullable=False)  # "sme" or "ai"
    content = Column(Text, nullable=False)
    audio_url = Column(String, nullable=True)  # URL to stored audio for SME messages
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    voice_session = relationship("VoiceFeedbackSession", back_populates="messages")


class ExtractedFeedback(Base):
    __tablename__ = "extracted_feedback"

    id = Column(Integer, primary_key=True, index=True)
    voice_session_id = Column(Integer, ForeignKey("voice_feedback_sessions.id"), nullable=False)
    feedback_type = Column(String, nullable=False)  # "inline_comment", "overall", "guide_suggestion", "rating"
    content = Column(Text, nullable=False)
    highlighted_text = Column(Text, nullable=True)  # For inline comments
    start_offset = Column(Integer, nullable=True)
    end_offset = Column(Integer, nullable=True)
    confidence = Column(Integer, default=100)  # AI confidence score
    confirmed = Column(Integer, default=0)  # 0=pending, 1=confirmed, -1=rejected by SME
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    voice_session = relationship("VoiceFeedbackSession", back_populates="extracted_feedback")
```

---

### Phase 2: Backend API

#### New Router: `backend/app/routers/voice_feedback.py`

**Endpoints:**

```
POST /api/voice/start/{poem_id}
  - Creates FeedbackSession + VoiceFeedbackSession
  - Returns session_id and initial AI greeting
  - AI greeting includes poem context

POST /api/voice/{session_id}/message
  - Accepts: audio blob OR text transcript
  - If audio: transcribe using Whisper API
  - Process through AI interviewer
  - Return: AI follow-up question + any extracted feedback

POST /api/voice/{session_id}/complete
  - Marks session complete
  - Returns: full structured summary of extracted feedback
  - SME can edit before confirming

POST /api/voice/{session_id}/confirm
  - Converts ExtractedFeedback into actual InlineComments + overall feedback
  - Triggers revision processing (existing flow)

GET /api/voice/{session_id}
  - Returns full conversation history + extracted feedback

DELETE /api/voice/{session_id}
  - Cancels session
```

---

### Phase 3: AI Interview Service

#### New Service: `backend/app/services/ai_interviewer.py`

```python
class AIInterviewer:
    """
    Conducts intelligent follow-up conversations with SMEs about poem feedback.
    """

    def __init__(self, poem_content: str, guide_content: str, conversation_history: list):
        self.poem = poem_content
        self.guide = guide_content
        self.history = conversation_history

    async def get_response(self, sme_message: str) -> InterviewResponse:
        """
        Process SME message and return:
        - follow_up_question: Next question to ask (or None if done)
        - extracted_items: List of feedback items extracted from this message
        - is_complete: Whether the conversation seems complete
        """
        pass

    async def generate_summary(self) -> FeedbackSummary:
        """
        Generate structured summary of all feedback from conversation.
        """
        pass
```

**AI System Prompt:**

```
You are an expert poetry editor conducting a feedback session with a Subject Matter Expert (SME). Your role is to:

1. LISTEN carefully to their feedback
2. ASK intelligent follow-up questions to get specific, actionable feedback
3. EXTRACT structured feedback items as you go
4. KNOW when the conversation is complete - don't over-interrogate

The poem being reviewed:
{poem_content}

Current poetry guidelines:
{guide_content}

BEHAVIORS:
- Ask "why" questions: "What would stronger imagery look like here?"
- Probe specifics: "You mentioned 'weak verbs' - which ones stood out?"
- Connect patterns: "You've mentioned passive voice before - should this be a guide rule?"
- Suggest alternatives: "Would 'the hour slipped' work better than 'the moment passed'?"
- Recognize completion: When SME says "that's it" or gives short responses, wrap up

OUTPUT FORMAT:
{
  "follow_up_question": "Your next question or null if complete",
  "extracted_items": [
    {
      "type": "inline_comment|overall|guide_suggestion|rating",
      "content": "The feedback",
      "highlighted_text": "Text from poem if applicable",
      "confidence": 85
    }
  ],
  "is_complete": false
}
```

---

### Phase 4: Audio Handling

#### Option A: Browser-based Recording + Server Transcription

**Frontend:**
- Use MediaRecorder API to capture audio
- Send audio blobs to backend
- Display real-time waveform visualization

**Backend:**
- Add `openai-whisper` or use OpenAI Whisper API
- Store audio files in `backend/audio/` directory
- Return transcript to frontend

**Requirements addition:**
```
openai  # For Whisper API
python-multipart  # Already present, for file uploads
aiofiles  # For async file operations
```

#### Option B: Browser-based Transcription (Web Speech API)

**Frontend:**
- Use Web Speech API for real-time transcription
- Send text directly to backend
- Simpler, no audio storage needed
- Fallback: manual text input

**Recommendation:** Start with Option B for faster implementation, add Option A later for better accuracy.

---

### Phase 5: Frontend Components

#### New Components

**`frontend/src/components/VoiceFeedback/`**

```
VoiceFeedbackButton.tsx    - "Give Voice Feedback" button
VoiceFeedbackModal.tsx     - Full-screen conversation interface
ConversationBubble.tsx     - Chat bubble for SME/AI messages
AudioWaveform.tsx          - Visual feedback while recording
FeedbackSummary.tsx        - Review extracted feedback before confirm
VoiceRecorder.tsx          - Handles mic access + recording
```

**`VoiceFeedbackModal.tsx` Structure:**

```tsx
<Modal fullScreen>
  <Header>
    <PoemPreview />  {/* Collapsible poem reference */}
    <CloseButton />
  </Header>

  <ConversationArea>
    {messages.map(msg => (
      <ConversationBubble
        role={msg.role}
        content={msg.content}
        extractedItems={msg.extracted}
      />
    ))}
  </ConversationArea>

  <InputArea>
    <VoiceRecorder onTranscript={handleSend} />
    <TextFallback />  {/* Type if voice doesn't work */}
  </InputArea>

  {isComplete && (
    <SummaryPanel>
      <FeedbackSummary items={extractedFeedback} onEdit={...} />
      <ConfirmButton onClick={handleConfirm} />
    </SummaryPanel>
  )}
</Modal>
```

---

### Phase 6: Integration with Existing Flow

After voice session is confirmed:

1. `ExtractedFeedback` items with type="inline_comment" → Create `InlineComment` records
2. `ExtractedFeedback` items with type="overall" → Set `FeedbackSession.overall_feedback`
3. `ExtractedFeedback` items with type="rating" → Set `FeedbackSession.rating`
4. `ExtractedFeedback` items with type="guide_suggestion" → Include in revision processing
5. Mark `FeedbackSession.status = "submitted"`
6. Trigger existing revision generation flow

---

## File Changes Summary

### Backend

| File | Changes |
|------|---------|
| `models.py` | Add VoiceFeedbackSession, ConversationMessage, ExtractedFeedback |
| `schemas.py` | Add voice feedback request/response schemas |
| `routers/voice_feedback.py` | NEW - Voice feedback endpoints |
| `services/ai_interviewer.py` | NEW - AI conversation logic |
| `services/transcription.py` | NEW - Audio transcription (if using Whisper) |
| `main.py` | Register new router |
| `requirements.txt` | Add openai (if using Whisper API) |

### Frontend

| File | Changes |
|------|---------|
| `components/VoiceFeedback/*` | NEW - All voice feedback components |
| `hooks/useVoiceFeedback.ts` | NEW - Voice feedback API hooks |
| `pages/PoemReview.tsx` | Add VoiceFeedbackButton |
| `types/index.ts` | Add voice feedback types |

---

## Implementation Order

1. **Database models** - Foundation for everything
2. **Basic API endpoints** - Start/message/complete flow
3. **AI interviewer service** - Core conversation logic
4. **Frontend modal + text input** - Get flow working with typing
5. **Web Speech API integration** - Add voice input
6. **Summary + confirmation UI** - Complete the loop
7. **Polish** - Waveforms, animations, error handling

---

## Testing Checklist

- [ ] Can start a voice feedback session
- [ ] AI responds with relevant follow-up questions
- [ ] AI extracts inline comments with correct text offsets
- [ ] AI recognizes when conversation is complete
- [ ] Summary accurately reflects conversation
- [ ] Confirmed feedback creates proper InlineComment records
- [ ] Existing revision flow works with voice-captured feedback
- [ ] Graceful fallback when mic unavailable
- [ ] Works on mobile browsers (iOS Safari, Chrome)

---

## Mock AI Fallback

For testing without API keys, extend `mock_ai.py`:

```python
class MockAIInterviewer:
    """Deterministic responses for testing voice feedback flow."""

    FOLLOW_UPS = [
        "Can you tell me more about what specifically bothered you?",
        "Which words or phrases stood out as problematic?",
        "Should this become a general rule in our guide?",
        "Anything else about this poem?",
    ]

    def get_response(self, message: str, turn: int) -> dict:
        # Extract simple feedback patterns
        # Return predictable follow-ups based on turn number
        pass
```

---

## Environment Variables

Add to `.env.example`:

```
# Voice Feedback
OPENAI_API_KEY=your-key-here  # For Whisper transcription (optional)
ENABLE_VOICE_FEEDBACK=true
AUDIO_STORAGE_PATH=./audio
```

---

## Notes for Implementation

1. **Start simple** - Text-based conversation first, add voice later
2. **Test the AI prompts** - Iterate on system prompt to get good follow-ups
3. **Handle edge cases** - Mic permissions denied, network errors, empty responses
4. **Mobile-first** - Many SMEs will use tablets; test touch interactions
5. **Accessibility** - Provide text fallback for users who can't use voice
