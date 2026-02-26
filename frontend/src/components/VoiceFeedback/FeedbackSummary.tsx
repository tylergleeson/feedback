import { useState, useEffect } from 'react';
import type { ExtractedFeedback, FeedbackType } from '../../types';

interface FeedbackItemEditData {
  content: string;
  highlighted_text?: string;
}

interface FeedbackSummaryProps {
  extractedFeedback: ExtractedFeedback[];
  onConfirm: (
    confirmedIds: number[],
    rejectedIds: number[],
    edits?: { id: number; content?: string; highlighted_text?: string }[],
  ) => void;
  onBack: () => void;
  isConfirming: boolean;
}

export function FeedbackSummary({
  extractedFeedback,
  onConfirm,
  onBack,
  isConfirming,
}: FeedbackSummaryProps) {
  // State: item ID -> checked status
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [editedItems, setEditedItems] = useState<Record<number, FeedbackItemEditData>>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  // Initialize all items as checked
  useEffect(() => {
    const initial: Record<number, boolean> = {};
    extractedFeedback.forEach((item) => {
      initial[item.id] = true;
    });
    setCheckedItems(initial);
  }, [extractedFeedback]);

  const handleToggle = (itemId: number) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleStartEdit = (item: ExtractedFeedback) => {
    if (editingId === item.id) {
      setEditingId(null);
      return;
    }
    setEditingId(item.id);
    if (!editedItems[item.id]) {
      setEditedItems((prev) => ({
        ...prev,
        [item.id]: {
          content: item.content,
          highlighted_text: item.highlighted_text || undefined,
        },
      }));
    }
  };

  const handleEditChange = (itemId: number, field: keyof FeedbackItemEditData, value: string) => {
    setEditedItems((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleConfirm = () => {
    const confirmed: number[] = [];
    const rejected: number[] = [];

    extractedFeedback.forEach((item) => {
      if (checkedItems[item.id]) {
        confirmed.push(item.id);
      } else {
        rejected.push(item.id);
      }
    });

    const edits = Object.entries(editedItems).map(([id, data]) => ({
      id: Number(id),
      content: data.content,
      highlighted_text: data.highlighted_text,
    }));

    onConfirm(confirmed, rejected, edits.length > 0 ? edits : undefined);
  };

  const groupByType = (type: FeedbackType) =>
    extractedFeedback.filter((item) => item.feedback_type === type);

  const inlineComments = groupByType('inline_comment');
  const overall = groupByType('overall');
  const guideSuggestions = groupByType('guide_suggestion');
  const ratings = groupByType('rating');

  const confirmedCount = Object.values(checkedItems).filter(Boolean).length;

  const renderFeedbackItem = (item: ExtractedFeedback) => {
    const isEditing = editingId === item.id;
    const edited = editedItems[item.id];
    const displayContent = edited?.content ?? item.content;
    const displayHighlight = edited?.highlighted_text ?? item.highlighted_text;

    return (
      <div
        key={item.id}
        style={{
          display: 'flex',
          gap: '12px',
          padding: '12px',
          backgroundColor: checkedItems[item.id] ? '#f0fdf4' : '#fef2f2',
          border: `2px solid ${checkedItems[item.id] ? '#22c55e' : '#ef4444'}`,
          borderRadius: '8px',
          transition: 'all 0.2s ease',
        }}
      >
        <input
          type="checkbox"
          checked={checkedItems[item.id] || false}
          onChange={() => handleToggle(item.id)}
          style={{
            width: '20px',
            height: '20px',
            cursor: 'pointer',
            accentColor: '#7c3aed',
            marginTop: '2px',
          }}
        />
        <div style={{ flex: 1 }}>
          {isEditing ? (
            <>
              {item.feedback_type === 'inline_comment' && (
                <input
                  type="text"
                  value={edited?.highlighted_text ?? item.highlighted_text ?? ''}
                  onChange={(e) => handleEditChange(item.id, 'highlighted_text', e.target.value)}
                  placeholder="Highlighted text"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    marginBottom: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#1f2937',
                  }}
                />
              )}
              <textarea
                value={edited?.content ?? item.content}
                onChange={(e) => handleEditChange(item.id, 'content', e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  color: '#374151',
                  resize: 'vertical',
                }}
              />
            </>
          ) : (
            <>
              {displayHighlight && (
                <div
                  style={{
                    fontWeight: '700',
                    marginBottom: '4px',
                    color: '#1f2937',
                  }}
                >
                  &ldquo;{displayHighlight}&rdquo;
                </div>
              )}
              <div style={{ color: '#374151', marginBottom: '4px' }}>{displayContent}</div>
            </>
          )}
          <div style={{ fontSize: '12px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Confidence: {Math.round(item.confidence * 100)}%
            {edited && !isEditing && (
              <span style={{ color: '#7c3aed', fontWeight: 600 }}>edited</span>
            )}
          </div>
        </div>
        <button
          onClick={() => handleStartEdit(item)}
          title={isEditing ? 'Done editing' : 'Edit'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: isEditing ? '#7c3aed' : '#9ca3af',
            fontSize: '16px',
            lineHeight: 1,
            alignSelf: 'flex-start',
          }}
        >
          {isEditing ? '✓' : '✏️'}
        </button>
      </div>
    );
  };

  const renderSection = (title: string, items: ExtractedFeedback[], emoji: string) => {
    if (items.length === 0) return null;

    return (
      <div style={{ marginBottom: '24px' }}>
        <h3
          style={{
            fontSize: '18px',
            fontWeight: '700',
            marginBottom: '12px',
            color: '#1f2937',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{emoji}</span>
          {title} ({items.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map(renderFeedbackItem)}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}
      >
        <h2
          style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '8px',
          }}
        >
          Review Your Feedback
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>
          Select which items you'd like to include in your final feedback.
        </p>
      </div>

      {/* Scrollable content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
        }}
      >
        {renderSection('Inline Comments', inlineComments, '📝')}
        {renderSection('Overall Observations', overall, '💭')}
        {renderSection('Guide Suggestions', guideSuggestions, '📋')}
        {renderSection('Rating', ratings, '⭐')}

        {extractedFeedback.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '40px',
              color: '#9ca3af',
            }}
          >
            No feedback items extracted from the conversation.
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #e5e7eb',
          backgroundColor: 'white',
          display: 'flex',
          gap: '12px',
        }}
      >
        <button
          onClick={onBack}
          disabled={isConfirming}
          style={{
            flex: 1,
            padding: '12px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isConfirming ? 'not-allowed' : 'pointer',
            opacity: isConfirming ? 0.6 : 1,
          }}
        >
          Back to Conversation
        </button>
        <button
          onClick={handleConfirm}
          disabled={isConfirming || confirmedCount === 0}
          style={{
            flex: 2,
            padding: '12px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isConfirming || confirmedCount === 0 ? 'not-allowed' : 'pointer',
            opacity: isConfirming || confirmedCount === 0 ? 0.6 : 1,
          }}
        >
          {isConfirming
            ? 'Confirming...'
            : `Confirm ${confirmedCount} Item${confirmedCount !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
