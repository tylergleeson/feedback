import { useState, useRef, useEffect } from 'react';

interface InlineCommentPopoverProps {
  selectedText: string;
  rect: DOMRect;
  onSubmit: (comment: string) => void;
  onClose: () => void;
}

export default function InlineCommentPopover({
  selectedText,
  rect,
  onSubmit,
  onClose,
}: InlineCommentPopoverProps) {
  const [comment, setComment] = useState('');
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
      onSubmit(comment.trim());
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
          <textarea
            ref={textareaRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add your comment..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            rows={3}
          />
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
