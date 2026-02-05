-- Migration: Add Voice Feedback System Tables
-- Date: 2026-02-04
-- Description: Add tables for AI-facilitated voice feedback conversations

-- VoiceFeedbackSession table - one-to-one with FeedbackSession
CREATE TABLE IF NOT EXISTS voice_feedback_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    feedback_session_id INTEGER NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (feedback_session_id) REFERENCES feedback_sessions(id) ON DELETE CASCADE
);

-- ConversationMessage table - stores all messages in the conversation
CREATE TABLE IF NOT EXISTS conversation_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voice_session_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('sme', 'ai')),
    content TEXT NOT NULL,
    audio_url TEXT,  -- filename only, transformed to URL in responses
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (voice_session_id) REFERENCES voice_feedback_sessions(id) ON DELETE CASCADE
);

-- ExtractedFeedback table - AI-extracted feedback items from conversation
CREATE TABLE IF NOT EXISTS extracted_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voice_session_id INTEGER NOT NULL,
    message_id INTEGER,  -- Which AI message extracted this
    feedback_type TEXT NOT NULL CHECK(feedback_type IN ('inline_comment', 'overall', 'guide_suggestion', 'rating')),
    content TEXT NOT NULL,
    highlighted_text TEXT,  -- For inline comments
    start_offset INTEGER,   -- For inline comments
    end_offset INTEGER,     -- For inline comments
    confidence REAL DEFAULT 0.8,  -- AI confidence score
    confirmation_status TEXT DEFAULT 'pending' CHECK(confirmation_status IN ('pending', 'confirmed', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (voice_session_id) REFERENCES voice_feedback_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES conversation_messages(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_voice_sessions_feedback_session ON voice_feedback_sessions(feedback_session_id);
CREATE INDEX IF NOT EXISTS idx_voice_sessions_status ON voice_feedback_sessions(status);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_session ON conversation_messages(voice_session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_role ON conversation_messages(role);
CREATE INDEX IF NOT EXISTS idx_extracted_feedback_session ON extracted_feedback(voice_session_id);
CREATE INDEX IF NOT EXISTS idx_extracted_feedback_type ON extracted_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_extracted_feedback_status ON extracted_feedback(confirmation_status);
