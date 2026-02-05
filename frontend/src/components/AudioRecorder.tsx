import { useAudioRecorder } from '../hooks/useAudioRecorder';

interface AudioRecorderProps {
  onTranscriptionComplete: (transcription: string, audioBlob: Blob) => void;
  onCancel: () => void;
  isTranscribing?: boolean;
}

export function AudioRecorder({
  onTranscriptionComplete,
  onCancel,
  isTranscribing = false,
}: AudioRecorderProps) {
  const {
    state,
    duration,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUseRecording = () => {
    if (audioBlob) {
      // In the parent component, this will trigger upload and transcription
      onTranscriptionComplete('', audioBlob);
    }
  };

  const handleReRecord = () => {
    clearRecording();
  };

  const handleCancel = () => {
    clearRecording();
    onCancel();
  };

  return (
    <div className="audio-recorder-container" style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '16px',
      marginTop: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      {error && (
        <div style={{
          color: '#dc2626',
          fontSize: '14px',
          marginBottom: '12px',
          padding: '8px',
          backgroundColor: '#fee',
          borderRadius: '4px'
        }}>
          {error}
        </div>
      )}

      {state === 'idle' && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={startRecording}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Start Recording
          </button>
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {state === 'recording' && (
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: '#dc2626',
              animation: 'pulse 1.5s ease-in-out infinite'
            }} />
            <span style={{ fontSize: '18px', fontWeight: '600', fontFamily: 'monospace' }}>
              {formatDuration(duration)}
            </span>
            <span style={{ color: '#6b7280', fontSize: '14px' }}>
              (Max 10 minutes)
            </span>
          </div>
          <button
            onClick={stopRecording}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Stop Recording
          </button>
        </div>
      )}

      {state === 'stopped' && audioUrl && (
        <div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
              Duration: {formatDuration(duration)}
            </div>
            <audio
              controls
              src={audioUrl}
              style={{ width: '100%', marginBottom: '12px' }}
            />
          </div>
          {!isTranscribing ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleUseRecording}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Use This Recording
              </button>
              <button
                onClick={handleReRecord}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Re-record
              </button>
            </div>
          ) : (
            <div style={{
              padding: '8px 16px',
              backgroundColor: '#eff6ff',
              color: '#1e40af',
              borderRadius: '4px',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              Transcribing audio...
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  );
}
