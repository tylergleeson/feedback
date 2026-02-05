import type { ConversationMessage, ExtractedFeedback } from '../../types';

interface ConversationBubbleProps {
  message: ConversationMessage;
  extractedItems?: ExtractedFeedback[];
}

export function ConversationBubble({ message, extractedItems = [] }: ConversationBubbleProps) {
  const isSME = message.role === 'sme';

  const getFeedbackTypeLabel = (type: string) => {
    switch (type) {
      case 'inline_comment':
        return 'Inline Comment';
      case 'overall':
        return 'Overall Feedback';
      case 'guide_suggestion':
        return 'Guide Rule';
      case 'rating':
        return 'Rating';
      default:
        return type;
    }
  };

  const getFeedbackTypeColor = (type: string) => {
    switch (type) {
      case 'inline_comment':
        return '#3b82f6';
      case 'overall':
        return '#10b981';
      case 'guide_suggestion':
        return '#f59e0b';
      case 'rating':
        return '#ec4899';
      default:
        return '#6b7280';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isSME ? 'flex-end' : 'flex-start',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {/* Message bubble */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '16px',
            backgroundColor: isSME ? '#7c3aed' : '#f3f4f6',
            color: isSME ? 'white' : '#1f2937',
            wordWrap: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
        >
          {message.content}
        </div>

        {/* Audio player if message has audio */}
        {message.audio_url && (
          <audio
            controls
            src={message.audio_url}
            style={{
              width: '100%',
              height: '32px',
            }}
          />
        )}

        {/* Extracted items for AI messages */}
        {!isSME && extractedItems.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginTop: '4px',
            }}
          >
            {extractedItems.map((item) => (
              <div
                key={item.id}
                style={{
                  fontSize: '12px',
                  padding: '6px 10px',
                  backgroundColor: 'white',
                  border: `1px solid ${getFeedbackTypeColor(item.feedback_type)}`,
                  borderRadius: '8px',
                  display: 'flex',
                  gap: '6px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: getFeedbackTypeColor(item.feedback_type),
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getFeedbackTypeLabel(item.feedback_type)}
                </div>
                <div style={{ flex: 1, color: '#4b5563' }}>
                  {item.highlighted_text && (
                    <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                      "{item.highlighted_text}"
                    </div>
                  )}
                  <div>{item.content}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                    Confidence: {Math.round(item.confidence * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div
          style={{
            fontSize: '11px',
            color: '#9ca3af',
            textAlign: isSME ? 'right' : 'left',
            paddingLeft: isSME ? '0' : '8px',
            paddingRight: isSME ? '8px' : '0',
          }}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
