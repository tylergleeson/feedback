import { useEffect, useRef, useState } from 'react';

interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface RealtimeCallModalProps {
  isOpen: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  callEnded: boolean;
  error: string | null;
  transcript: TranscriptEntry[];
  callDuration: number;
  isSaving: boolean;
  userSpeaking: boolean;
  onEndCall: () => void;
  onSaveTranscript: () => void;
  onDismiss: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function RealtimeCallModal({
  isOpen,
  isConnected,
  isConnecting,
  callEnded,
  error,
  transcript,
  callDuration,
  isSaving,
  userSpeaking,
  onEndCall,
  onSaveTranscript,
  onDismiss,
}: RealtimeCallModalProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [showTranscript, setShowTranscript] = useState(true);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, userSpeaking]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 w-96 max-h-[500px] bg-gray-900 rounded-xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden"
      role="dialog"
      aria-label="Live voice call"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-3">
          {isConnected && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
          )}
          {isConnecting && (
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 animate-pulse" />
          )}
          {callEnded && (
            <span className="h-2.5 w-2.5 rounded-full bg-gray-500" />
          )}
          <span className="text-white font-medium text-sm">
            {isConnecting ? 'Connecting...' : isConnected ? 'Live Call' : 'Call Ended'}
          </span>
          {(isConnected || callEnded) && (
            <span className="text-gray-400 font-mono text-xs">{formatDuration(callDuration)}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label={showTranscript ? 'Collapse transcript' : 'Expand transcript'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform ${showTranscript ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {callEnded && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-white text-sm transition-colors p-1"
              aria-label="Close call widget"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-900/50 border-b border-red-700 text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Collapsible transcript */}
      {showTranscript && (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0" style={{ maxHeight: '300px' }}>
          {transcript.length === 0 && isConnected && (
            <p className="text-gray-500 text-center text-xs italic py-4">
              Start speaking — the AI will respond naturally...
            </p>
          )}
          {transcript.length === 0 && callEnded && (
            <p className="text-gray-500 text-center text-xs italic py-4">
              No transcript recorded.
            </p>
          )}
          {transcript.map((entry) => (
            <div
              key={`${entry.role}-${entry.timestamp}`}
              className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-1.5 rounded-xl text-xs ${
                  entry.role === 'user'
                    ? 'bg-green-700 text-white rounded-br-sm'
                    : 'bg-gray-700 text-gray-200 rounded-bl-sm'
                }`}
              >
                <p className="text-[10px] opacity-60 mb-0.5">
                  {entry.role === 'user' ? 'You' : 'AI Interviewer'}
                </p>
                {entry.text}
              </div>
            </div>
          ))}
          {userSpeaking && (
            <div className="flex justify-end">
              <div className="max-w-[85%] px-3 py-1.5 rounded-xl rounded-br-sm bg-green-700/70 text-white text-xs">
                <p className="text-[10px] opacity-60 mb-0.5">You</p>
                <span className="inline-flex items-center gap-0.5">
                  Listening
                  <span className="inline-flex gap-0.5 ml-0.5">
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:0ms]" />
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:150ms]" />
                    <span className="w-1 h-1 rounded-full bg-white animate-bounce [animation-delay:300ms]" />
                  </span>
                </span>
              </div>
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>
      )}

      {/* Bottom bar */}
      <div className="px-3 py-3 bg-gray-800 border-t border-gray-700">
        {callEnded ? (
          <div className="flex gap-2">
            <button
              onClick={onDismiss}
              disabled={isSaving}
              className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={onSaveTranscript}
              disabled={isSaving || transcript.length === 0}
              className="flex-[2] px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save & Review Feedback'}
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={onEndCall}
              className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
              aria-label="End call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
