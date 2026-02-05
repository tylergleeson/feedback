"""Audio transcription service using OpenAI Whisper API."""

import os
from pathlib import Path
from app.config import settings

try:
    from openai import OpenAI
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


def generate_mock_transcription(filename: str) -> str:
    """Generate mock transcription for testing without API key."""
    return f"[Mock transcription of {filename}] This is a sample transcription. In production, this would contain actual speech-to-text from OpenAI Whisper."


async def transcribe_audio(file_path: str) -> str:
    """
    Transcribe audio file using OpenAI Whisper API.

    Args:
        file_path: Path to the audio file to transcribe

    Returns:
        Transcribed text

    Raises:
        FileNotFoundError: If audio file doesn't exist
        Exception: If transcription fails
    """

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    filename = Path(file_path).name

    # Use mock transcription if no API key or OpenAI not available
    if settings.use_mock_ai or not settings.openai_api_key or not HAS_OPENAI:
        return generate_mock_transcription(filename)

    try:
        client = OpenAI(api_key=settings.openai_api_key)

        with open(file_path, "rb") as audio_file:
            response = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="en"  # Can be removed for auto-detection
            )

        return response.text.strip()

    except Exception as e:
        # Clean up file on error
        if os.path.exists(file_path):
            os.remove(file_path)
        raise Exception(f"Transcription failed: {str(e)}")
