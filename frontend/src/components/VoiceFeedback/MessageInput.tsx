import { useState } from 'react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

interface MessageInputProps {
  onSendMessage: (text?: string, audioBlob?: Blob) => void;
  isSending: boolean;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, isSending, disabled = false }: MessageInputProps) {
  const [inputMode, setInputMode] = useState<'audio' | 'text'>('audio');
  const [textMessage, setTextMessage] = useState('');

  const {
    state: recordingState,
    duration,
    audioBlob,
    error: recordingError,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  const handleSendText = () => {
    if (textMessage.trim()) {
      onSendMessage(textMessage);
      setTextMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleRecordToggle = async () => {
    if (recordingState === 'idle') {
      // Start recording
      await startRecording();
    } else if (recordingState === 'recording') {
      // Stop recording - this will trigger the stopped state
      stopRecording();
    }
  };

  // Auto-send when recording stops
  const handleRecordingStop = async () => {
    if (audioBlob && recordingState === 'stopped') {
      try {
        await onSendMessage(undefined, audioBlob);
        clearRecording();
      } catch (error) {
        console.error('Failed to send audio:', error);
      }
    }
  };

  // Watch for stopped state and auto-send
  if (recordingState === 'stopped' && audioBlob && !isSending) {
    handleRecordingStop();
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        borderTop: '1px solid #e5e7eb',
        padding: '16px',
        backgroundColor: 'white',
      }}
    >
      {/* Mode toggle */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <button
          onClick={() => setInputMode('audio')}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: inputMode === 'audio' ? '#7c3aed' : '#f3f4f6',
            color: inputMode === 'audio' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          🎤 Audio
        </button>
        <button
          onClick={() => setInputMode('text')}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: inputMode === 'text' ? '#7c3aed' : '#f3f4f6',
            color: inputMode === 'text' ? 'white' : '#6b7280',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          ✏️ Text
        </button>
      </div>

      {/* Audio mode */}
      {inputMode === 'audio' && (
        <div>
          {recordingError && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#fee',
                color: '#dc2626',
                borderRadius: '8px',
                fontSize: '14px',
                marginBottom: '12px',
              }}
            >
              {recordingError}
            </div>
          )}

          {isSending ? (
            <div
              style={{
                padding: '20px',
                textAlign: 'center',
                backgroundColor: '#f0f9ff',
                borderRadius: '8px',
                color: '#1e40af',
                fontSize: '16px',
                fontWeight: '600',
              }}
            >
              <div style={{ marginBottom: '8px' }}>🎤 Transcribing and processing...</div>
              <div style={{ fontSize: '14px', fontWeight: 'normal' }}>
                The AI is analyzing your feedback
              </div>
            </div>
          ) : (
            <button
              onClick={handleRecordToggle}
              disabled={disabled || recordingState === 'stopped'}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: recordingState === 'recording' ? '#dc2626' : '#7c3aed',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: '700',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'all 0.2s ease',
                boxShadow: recordingState === 'recording' ? '0 0 0 4px rgba(220, 38, 38, 0.2)' : 'none',
              }}
            >
              {recordingState === 'recording' ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      backgroundColor: 'white',
                    }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div>Stop Recording</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>
                      {formatDuration(duration)} • Click to send
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2C10.3431 2 9 3.34315 9 5V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V5C15 3.34315 13.6569 2 12 2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="currentColor"
                    />
                    <path
                      d="M19 10V12C19 15.866 15.866 19 12 19M5 10V12C5 15.866 8.13401 19 12 19M12 19V22"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Push to Talk
                </>
              )}
            </button>
          )}

          <div
            style={{
              marginTop: '8px',
              textAlign: 'center',
              fontSize: '13px',
              color: '#6b7280',
            }}
          >
            {recordingState === 'idle' && 'Click once to start, click again to send'}
            {recordingState === 'recording' && 'Recording... Click stop when done'}
          </div>
        </div>
      )}

      {/* Text mode */}
      {inputMode === 'text' && (
        <div>
          <textarea
            value={textMessage}
            onChange={(e) => setTextMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            disabled={disabled || isSending}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical',
              marginBottom: '8px',
            }}
          />
          <button
            onClick={handleSendText}
            disabled={disabled || isSending || !textMessage.trim()}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor:
                disabled || isSending || !textMessage.trim() ? 'not-allowed' : 'pointer',
              opacity: disabled || isSending || !textMessage.trim() ? 0.6 : 1,
            }}
          >
            {isSending ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      )}
    </div>
  );
}
