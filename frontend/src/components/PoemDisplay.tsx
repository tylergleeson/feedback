import { useState, useCallback, useRef } from 'react';
import type { InlineComment } from '../types';
import InlineCommentPopover from './InlineCommentPopover';

interface PoemDisplayProps {
  content: string;
  comments: InlineComment[];
  sessionId?: number;
  onAddComment?: (
    highlightedText: string,
    startOffset: number,
    endOffset: number,
    comment: string,
    audioPath?: string
  ) => void;
}

export default function PoemDisplay({
  content,
  comments,
  sessionId,
  onAddComment,
}: PoemDisplayProps) {
  const [selection, setSelection] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
    rect: DOMRect;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseUp = useCallback(() => {
    if (!onAddComment) return;

    const windowSelection = window.getSelection();
    if (!windowSelection || windowSelection.isCollapsed) {
      return;
    }

    const selectedText = windowSelection.toString().trim();
    if (!selectedText) {
      return;
    }

    const range = windowSelection.getRangeAt(0);
    const container = containerRef.current;
    if (!container?.contains(range.commonAncestorContainer)) {
      return;
    }

    // Calculate offset within the poem content
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(container);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const startOffset = preSelectionRange.toString().length;
    const endOffset = startOffset + selectedText.length;

    const rect = range.getBoundingClientRect();

    setSelection({
      text: selectedText,
      startOffset,
      endOffset,
      rect,
    });
  }, [onAddComment]);

  const handleAddComment = (comment: string, audioPath?: string) => {
    if (selection && onAddComment) {
      onAddComment(selection.text, selection.startOffset, selection.endOffset, comment, audioPath);
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    }
  };

  const handleClosePopover = () => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  };

  // Render content with highlighted comments
  const renderContent = () => {
    if (comments.length === 0) {
      return content;
    }

    // Sort comments by start offset
    const sortedComments = [...comments].sort((a, b) => a.start_offset - b.start_offset);

    const elements: React.ReactNode[] = [];
    let lastEnd = 0;

    sortedComments.forEach((comment, index) => {
      // Add text before this comment
      if (comment.start_offset > lastEnd) {
        elements.push(
          <span key={`text-${index}`}>
            {content.slice(lastEnd, comment.start_offset)}
          </span>
        );
      }

      // Add highlighted text
      elements.push(
        <span
          key={`highlight-${comment.id}`}
          className="highlight-comment"
          title={comment.comment}
        >
          {content.slice(comment.start_offset, comment.end_offset)}
        </span>
      );

      lastEnd = comment.end_offset;
    });

    // Add remaining text
    if (lastEnd < content.length) {
      elements.push(<span key="text-end">{content.slice(lastEnd)}</span>);
    }

    return elements;
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="poem-text select-text cursor-text"
      >
        {renderContent()}
      </div>

      {selection && onAddComment && sessionId && (
        <InlineCommentPopover
          selectedText={selection.text}
          rect={selection.rect}
          startOffset={selection.startOffset}
          endOffset={selection.endOffset}
          sessionId={sessionId}
          onSubmit={handleAddComment}
          onClose={handleClosePopover}
        />
      )}

      {onAddComment && (
        <p className="mt-4 text-sm text-gray-500 italic">
          Select text to add inline comments
        </p>
      )}
    </div>
  );
}
