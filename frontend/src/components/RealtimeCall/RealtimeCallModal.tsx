import { useEffect, useRef, useState } from 'react';

interface TranscriptEntry {
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface RealtimeCallModalProps {
  isOpen: boolean;
  poemContent: string;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  transcript: TranscriptEntry[];
  callDuration: number;
  onEndCall: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function RealtimeCallModal({
  isOpen,
  poemContent,
  isConnected,
  isConnecting,
  error,
  transcript,
  callDuration,
  onEndCall,
}: RealtimeCallModalProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [showPoem, setShowPoem] = useState(false);

  const isEnded = !isConnected && !isConnecting;

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col" role="dialog" aria-label="Live voice call">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isConnected && (
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
              </span>
            )}
            <span className="text-white font-medium text-lg">
              {isConnecting ? 'Connecting...' : isConnected ? 'Live Call' : 'Call Ended'}
            </span>
          </div>
          {isConnected && (
            <span className="text-gray-400 font-mono text-sm">{formatDuration(callDuration)}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPoem((v) => !v)}
            className="text-gray-400 hover:text-white text-sm transition-colors"
          >
            {showPoem ? 'Hide Poem' : 'Show Poem'}
          </button>
          {isEnded && (
            <button
              onClick={onEndCall}
              className="text-gray-400 hover:text-white text-sm transition-colors"
              aria-label="Close call modal"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Collapsible poem */}
      {showPoem && (
        <div className="px-6 py-3 bg-gray-800 border-b border-gray-700 max-h-40 overflow-y-auto">
          <pre className="text-gray-300 text-sm whitespace-pre-wrap font-serif">{poemContent}</pre>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
        {/* Pulse animation when connected */}
        {isConnected && (
          <div className="mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-green-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </div>
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-green-500 animate-ping opacity-20" />
            </div>
          </div>
        )}

        {/* Connecting spinner */}
        {isConnecting && (
          <div className="mb-8">
            <div className="w-24 h-24 rounded-full border-4 border-gray-600 border-t-green-500 animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 px-4 py-2 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm max-w-md text-center">
            {error}
          </div>
        )}

        {/* Transcript */}
        <div className="w-full max-w-2xl flex-1 overflow-y-auto mb-6 space-y-3">
          {transcript.length === 0 && isConnected && (
            <p className="text-gray-500 text-center text-sm italic">
              Start speaking — the AI will respond naturally...
            </p>
          )}
          {transcript.map((entry) => (
            <div
              key={`${entry.role}-${entry.timestamp}`}
              className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                  entry.role === 'user'
                    ? 'bg-green-700 text-white rounded-br-sm'
                    : 'bg-gray-700 text-gray-200 rounded-bl-sm'
                }`}
              >
                <p className="text-xs opacity-60 mb-1">
                  {entry.role === 'user' ? 'You' : 'AI Interviewer'}
                </p>
                {entry.text}
              </div>
            </div>
          ))}
          <div ref={transcriptEndRef} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-6 py-6 bg-gray-800 border-t border-gray-700 flex justify-center">
        {isEnded ? (
          <button
            onClick={onEndCall}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        ) : (
          <button
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors shadow-lg"
            aria-label="End call"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
