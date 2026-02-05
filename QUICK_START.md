# Audio Feature Quick Start Guide

## Starting the Application

### Backend
```bash
cd backend
uvicorn app.main:app --reload
```
Backend will run at: http://localhost:8000

### Frontend
```bash
cd frontend
npm run dev
```
Frontend will run at: http://localhost:5173

## Using Audio Recording

### Overall Feedback Audio
1. Navigate to a poem review page
2. Look for "🎤 Record Audio" button next to "Overall Feedback" label
3. Click to start recording workflow:
   - Click "Start Recording" (browser will ask for microphone permission)
   - Speak your feedback
   - Click "Stop Recording" when done
   - Review audio with playback
   - Click "Use This Recording" to transcribe
   - Wait for transcription (2-5 seconds)
   - Edit transcription if needed
   - Submit feedback normally

### Inline Comment Audio
1. Select text in the poem
2. Comment popover appears
3. Click "🎤 Record" button
4. Follow same recording workflow as above
5. Transcription populates comment field
6. Click "Add Comment" to save

## Audio Playback
- Saved audio appears as audio player controls
- Overall feedback audio shows below textarea
- Inline comment audio shows in comment list
- Audio files persist with feedback sessions

## Mock Mode (No API Key)
If OpenAI API key is not configured:
- Recording still works normally
- Transcription returns placeholder text
- All UI/UX functions normally
- Good for development/testing

## File Locations
- **Audio files**: `/backend/uploads/audio/`
- **Database**: `/backend/feedback.db`
- **Configuration**: `/backend/.env` (OPENAI_API_KEY)

## Troubleshooting

### Microphone Not Working
- Check browser permissions (should prompt on first use)
- Ensure microphone is connected and not used by other apps
- Try in Chrome/Firefox (best compatibility)

### Transcription Fails
- Check backend logs for errors
- Verify OpenAI API key in `.env` file
- Ensure file size < 25MB
- Check internet connection

### Audio Not Playing
- Verify backend is running
- Check browser console for 404 errors
- Ensure audio file exists in `/backend/uploads/audio/`

## Technical Limits
- **Max Recording Duration**: 10 minutes (auto-stops)
- **Max File Size**: 25MB (Whisper API limit)
- **Audio Format**: WebM with Opus codec
- **Session Status**: Must be "in_progress" to add audio

## API Endpoints
- `POST /api/feedback/{session_id}/transcribe-overall` - Upload overall feedback audio
- `POST /api/feedback/{session_id}/transcribe-comment` - Upload comment audio
- `GET /api/audio/{filename}` - Serve audio files

## Development Notes
- Browser must support MediaRecorder API
- HTTPS required in production for getUserMedia
- File cleanup happens automatically on errors
- Audio paths stored as filenames only (not full paths)
