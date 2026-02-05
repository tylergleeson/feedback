import { useState, useEffect } from 'react';
import type { ExtractedFeedback, FeedbackType } from '../../types';

interface FeedbackSummaryProps {
  extractedFeedback: ExtractedFeedback[];
  onConfirm: (confirmedIds: number[], rejectedIds: number[]) => void;
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

    onConfirm(confirmed, rejected);
  };

  const groupByType = (type: FeedbackType) =>
    extractedFeedback.filter((item) => item.feedback_type === type);

  const inlineComments = groupByType('inline_comment');
  const overall = groupByType('overall');
  const guideSuggestions = groupByType('guide_suggestion');
  const ratings = groupByType('rating');

  const confirmedCount = Object.values(checkedItems).filter(Boolean).length;

  const renderFeedbackItem = (item: ExtractedFeedback) => (
    <label
      key={item.id}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '12px',
        backgroundColor: checkedItems[item.id] ? '#f0fdf4' : '#fef2f2',
        border: `2px solid ${checkedItems[item.id] ? '#22c55e' : '#ef4444'}`,
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateX(4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateX(0)';
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
        }}
      />
      <div style={{ flex: 1 }}>
        {item.highlighted_text && (
          <div
            style={{
              fontWeight: '700',
              marginBottom: '4px',
              color: '#1f2937',
            }}
          >
            "{item.highlighted_text}"
          </div>
        )}
        <div style={{ color: '#374151', marginBottom: '4px' }}>{item.content}</div>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
          Confidence: {Math.round(item.confidence * 100)}%
        </div>
      </div>
    </label>
  );

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
