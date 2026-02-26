import { useEffect, useRef, useState } from 'react';
import type { VoiceFeedbackSession, Poem } from '../../types';
import { ConversationBubble } from './ConversationBubble';
import { MessageInput } from './MessageInput';
import { FeedbackSummary } from './FeedbackSummary';
import { useSendMessage, useCompleteSession, useConfirmFeedback } from '../../hooks/useVoiceFeedback';

interface VoiceFeedbackModalProps {
  session: VoiceFeedbackSession;
  poem: Poem;
  onClose: () => void;
  onConfirmed: () => void;
}

export function VoiceFeedbackModal({
  session,
  poem,
  onClose,
  onConfirmed,
}: VoiceFeedbackModalProps) {
  const [showSummary, setShowSummary] = useState(false);
  const [showPoem, setShowPoem] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessageMutation = useSendMessage();
  const completeSessionMutation = useCompleteSession();
  const confirmFeedbackMutation = useConfirmFeedback();

  const isActive = session.status === 'active';
  const isCompleted = session.status === 'completed';

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.messages]);

  // Auto-show summary when completed
  useEffect(() => {
    if (isCompleted && !showSummary) {
      setShowSummary(true);
    }
  }, [isCompleted, showSummary]);

  const handleSendMessage = async (text?: string, audioBlob?: Blob) => {
    await sendMessageMutation.mutateAsync({
      sessionId: session.id,
      text,
      audioBlob,
    });
  };

  const handleImDone = async () => {
    await completeSessionMutation.mutateAsync(session.id);
    setShowSummary(true);
  };

  const handleConfirm = async (
    confirmedIds: number[],
    rejectedIds: number[],
    edits?: { id: number; content?: string; highlighted_text?: string }[],
  ) => {
    await confirmFeedbackMutation.mutateAsync({
      sessionId: session.id,
      confirmedIds,
      rejectedIds,
      edits,
    });
    onConfirmed();
    onClose();
  };

  const handleBackToConversation = () => {
    setShowSummary(false);
  };

  // Note: We match extracted items to messages by timestamp in the render below

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '1200px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f9fafb',
            borderTopLeftRadius: '16px',
            borderTopRightRadius: '16px',
          }}
        >
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#1f2937',
                marginBottom: '4px',
              }}
            >
              Voice Feedback Session
            </h2>
            <button
              onClick={() => setShowPoem(!showPoem)}
              style={{
                fontSize: '14px',
                color: '#7c3aed',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
              }}
            >
              {showPoem ? 'Hide' : 'Show'} Poem
            </button>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Collapsible poem */}
        {showPoem && (
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: '#fef3c7',
              borderBottom: '1px solid #fbbf24',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            <pre
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                whiteSpace: 'pre-wrap',
                margin: 0,
                color: '#78350f',
              }}
            >
              {poem.content}
            </pre>
          </div>
        )}

        {/* Main content */}
        {!showSummary ? (
          <>
            {/* Messages area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                backgroundColor: '#fafafa',
              }}
            >
              {session.messages.map((message) => {
                // Find extracted items that came with this AI message
                const aiMessageItems =
                  message.role === 'ai'
                    ? session.extracted_feedback.filter((item) => {
                        // Match items created around the same time as this message
                        const itemTime = new Date(item.created_at).getTime();
                        const msgTime = new Date(message.created_at).getTime();
                        return Math.abs(itemTime - msgTime) < 5000; // Within 5 seconds
                      })
                    : [];

                return (
                  <ConversationBubble
                    key={message.id}
                    message={message}
                    extractedItems={aiMessageItems}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area or done button */}
            {isActive && !isCompleted && (
              <div>
                <div
                  style={{
                    padding: '12px 20px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <button
                    onClick={handleImDone}
                    disabled={completeSessionMutation.isPending}
                    style={{
                      padding: '10px 24px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: completeSessionMutation.isPending ? 'not-allowed' : 'pointer',
                      opacity: completeSessionMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    {completeSessionMutation.isPending ? "Finishing..." : "I'm Done - Show Summary"}
                  </button>
                </div>
                <MessageInput
                  onSendMessage={handleSendMessage}
                  isSending={sendMessageMutation.isPending}
                  disabled={!isActive}
                />
              </div>
            )}
          </>
        ) : (
          <FeedbackSummary
            extractedFeedback={session.extracted_feedback}
            onConfirm={handleConfirm}
            onBack={handleBackToConversation}
            isConfirming={confirmFeedbackMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
