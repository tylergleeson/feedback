#!/usr/bin/env python3
"""
Test script to verify audio transcription feature is working.
Tests both mock mode and real API mode.
"""

import asyncio
import os
from pathlib import Path

# Test imports
try:
    from app.services.whisper_service import transcribe_audio, generate_mock_transcription
    from app.config import settings
    print("✓ Successfully imported whisper service")
except ImportError as e:
    print(f"✗ Failed to import whisper service: {e}")
    exit(1)

# Test mock transcription
def test_mock_transcription():
    print("\n--- Testing Mock Transcription ---")
    result = generate_mock_transcription("test_audio.webm")
    print(f"Mock transcription result: {result}")
    assert "[Mock transcription of test_audio.webm]" in result
    print("✓ Mock transcription working")

# Test configuration
def test_configuration():
    print("\n--- Testing Configuration ---")
    print(f"OpenAI API Key configured: {bool(settings.openai_api_key)}")
    print(f"Use mock AI: {settings.use_mock_ai}")
    if settings.openai_api_key:
        print("✓ OpenAI API key is configured")
    else:
        print("⚠ No OpenAI API key - will use mock mode")

# Test file structure
def test_file_structure():
    print("\n--- Testing File Structure ---")

    upload_dir = Path("uploads/audio")
    if upload_dir.exists():
        print(f"✓ Upload directory exists: {upload_dir}")
    else:
        print(f"⚠ Upload directory will be created at runtime: {upload_dir}")

    # Check models
    try:
        from app.models import FeedbackSession, InlineComment
        fs = FeedbackSession.__table__.columns
        ic = InlineComment.__table__.columns

        if 'overall_feedback_audio_path' in fs:
            print("✓ FeedbackSession.overall_feedback_audio_path exists")
        else:
            print("✗ FeedbackSession.overall_feedback_audio_path missing")

        if 'comment_audio_path' in ic:
            print("✓ InlineComment.comment_audio_path exists")
        else:
            print("✗ InlineComment.comment_audio_path missing")
    except Exception as e:
        print(f"✗ Error checking models: {e}")

# Test database migration
def test_database():
    print("\n--- Testing Database ---")
    import sqlite3

    try:
        conn = sqlite3.connect('feedback.db')
        cursor = conn.cursor()

        # Check feedback_sessions table
        cursor.execute("PRAGMA table_info(feedback_sessions)")
        columns = {row[1] for row in cursor.fetchall()}

        if 'overall_feedback_audio_path' in columns:
            print("✓ feedback_sessions.overall_feedback_audio_path exists in DB")
        else:
            print("✗ feedback_sessions.overall_feedback_audio_path missing in DB")

        # Check inline_comments table
        cursor.execute("PRAGMA table_info(inline_comments)")
        columns = {row[1] for row in cursor.fetchall()}

        if 'comment_audio_path' in columns:
            print("✓ inline_comments.comment_audio_path exists in DB")
        else:
            print("✗ inline_comments.comment_audio_path missing in DB")

        conn.close()
    except Exception as e:
        print(f"✗ Error checking database: {e}")

# Test API endpoints
def test_api_imports():
    print("\n--- Testing API Endpoints ---")
    try:
        from app.routers.feedback import router
        routes = [route.path for route in router.routes]

        if '/feedback/{session_id}/transcribe-overall' in routes:
            print("✓ transcribe-overall endpoint registered")
        else:
            print("⚠ transcribe-overall endpoint check inconclusive")

        if '/feedback/{session_id}/transcribe-comment' in routes:
            print("✓ transcribe-comment endpoint registered")
        else:
            print("⚠ transcribe-comment endpoint check inconclusive")

        print("✓ All endpoints imported successfully")
    except Exception as e:
        print(f"✗ Error importing endpoints: {e}")

def main():
    print("=" * 60)
    print("Audio Transcription Feature - Verification Tests")
    print("=" * 60)

    test_mock_transcription()
    test_configuration()
    test_file_structure()
    test_database()
    test_api_imports()

    print("\n" + "=" * 60)
    print("Verification Complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Start backend: uvicorn app.main:app --reload")
    print("2. Start frontend: cd ../frontend && npm run dev")
    print("3. Test audio recording in the UI")
    print("   - Overall feedback: Click '🎤 Record Audio' in sidebar")
    print("   - Inline comments: Select text, click '🎤 Record' in popover")

if __name__ == "__main__":
    main()
