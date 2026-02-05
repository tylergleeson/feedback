import { useState, useRef, useEffect } from 'react';
import { AudioRecorder } from './AudioRecorder';

interface InlineCommentPopoverProps {
  selectedText: string;
  rect: DOMRect;
  startOffset: number;
  endOffset: number;
  sessionId: number;
  onSubmit: (comment: string, audioPath?: string) => void;
  onClose: () => void;
}

export default function InlineCommentPopover({
  selectedText,
  rect,
  startOffset,
  endOffset,
  sessionId,
  onSubmit,
  onClose,
}: InlineCommentPopoverProps) {
  const [comment, setComment] = useState('');
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioPath, setAudioPath] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleSubmit = () => {
    if (comment.trim()) {
      onSubmit(comment.trim(), audioPath || undefined);
    }
  };

  const handleAudioTranscription = async (_: string, audioBlob: Blob) => {
    setIsTranscribing(true);

    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.webm');
      formData.append('highlighted_text', selectedText);
      formData.append('start_offset', startOffset.toString());
      formData.append('end_offset', endOffset.toString());

      const response = await fetch(`http://localhost:8000/api/feedback/${sessionId}/transcribe-comment`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      setComment(data.transcription);
      setAudioPath(data.audio_path);
      setAudioUrl(`http://localhost:8000/api/audio/${data.audio_path}`);
      setShowAudioRecorder(false);
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Position popover below selection
  const style: React.CSSProperties = {
    position: 'fixed',
    top: rect.bottom + 8,
    left: Math.max(16, rect.left),
    zIndex: 50,
  };

  return (
    <div ref={popoverRef} style={style} className="w-80">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600 truncate">
            "{selectedText}"
          </p>
        </div>
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-medium text-gray-700">Comment</label>
            {!showAudioRecorder && (
              <button
                onClick={() => setShowAudioRecorder(true)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                🎤 Record
              </button>
            )}
          </div>

          {showAudioRecorder ? (
            <AudioRecorder
              onTranscriptionComplete={handleAudioTranscription}
              onCancel={() => setShowAudioRecorder(false)}
              isTranscribing={isTranscribing}
            />
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add your comment..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                rows={3}
              />
              {audioUrl && (
                <div className="mt-2">
                  <audio
                    controls
                    src={audioUrl}
                    className="w-full"
                    style={{ height: '32px' }}
                  />
                </div>
              )}
            </>
          )}

          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!comment.trim()}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Add Comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
