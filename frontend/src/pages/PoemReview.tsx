import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePoem } from '../hooks/usePoems';
import {
  useFeedbackSession,
  useStartFeedback,
  useAddComment,
  useDeleteComment,
  useUpdateFeedback,
  useSubmitFeedback,
  useProcessFeedback,
} from '../hooks/useFeedback';
import {
  useStartVoiceFeedback,
  useVoiceSession,
} from '../hooks/useVoiceFeedback';
import PoemDisplay from '../components/PoemDisplay';
import FeedbackSidebar from '../components/FeedbackSidebar';
import { VoiceFeedbackButton, VoiceFeedbackModal } from '../components/VoiceFeedback';
import type { FeedbackSession, VoiceFeedbackSession } from '../types';

export default function PoemReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const poemId = parseInt(id || '0', 10);

  const { data: poem, isLoading: poemLoading } = usePoem(poemId);
  const startFeedback = useStartFeedback();
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const updateFeedback = useUpdateFeedback();
  const submitFeedback = useSubmitFeedback();
  const processFeedback = useProcessFeedback();

  const [activeSession, setActiveSession] = useState<FeedbackSession | null>(null);
  const [voiceSession, setVoiceSession] = useState<VoiceFeedbackSession | null>(null);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const { data: sessionData, refetch: refetchSession } = useFeedbackSession(
    activeSession?.id || 0
  );

  const startVoiceFeedback = useStartVoiceFeedback();
  const { data: voiceSessionData } = useVoiceSession(voiceSession?.id || null);

  useEffect(() => {
    if (sessionData) {
      setActiveSession(sessionData);
    }
  }, [sessionData]);

  useEffect(() => {
    if (voiceSessionData) {
      setVoiceSession(voiceSessionData);
    }
  }, [voiceSessionData]);

  useEffect(() => {
    if (poem?.feedback_sessions?.length) {
      const lastSession = poem.feedback_sessions[poem.feedback_sessions.length - 1];
      setActiveSession(lastSession);
    }
  }, [poem]);

  const handleStartFeedback = async () => {
    try {
      const session = await startFeedback.mutateAsync(poemId);
      setActiveSession(session);
    } catch (error) {
      console.error('Failed to start feedback:', error);
    }
  };

  const handleAddComment = async (
    highlightedText: string,
    startOffset: number,
    endOffset: number,
    comment: string,
    audioPath?: string
  ) => {
    if (!activeSession) return;

    try {
      await addComment.mutateAsync({
        sessionId: activeSession.id,
        comment: {
          highlighted_text: highlightedText,
          start_offset: startOffset,
          end_offset: endOffset,
          comment,
          audio_path: audioPath,
        },
      });
      refetchSession();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!activeSession) return;

    try {
      await deleteComment.mutateAsync({
        sessionId: activeSession.id,
        commentId,
      });
      refetchSession();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const handleUpdateFeedback = async (data: { overall_feedback?: string; rating?: number }) => {
    if (!activeSession) return;

    try {
      await updateFeedback.mutateAsync({
        sessionId: activeSession.id,
        data,
      });
      refetchSession();
    } catch (error) {
      console.error('Failed to update feedback:', error);
    }
  };

  const handleSubmit = async () => {
    if (!activeSession) return;

    try {
      await submitFeedback.mutateAsync(activeSession.id);
      refetchSession();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleProcess = async () => {
    if (!activeSession) return;

    try {
      const revision = await processFeedback.mutateAsync(activeSession.id);
      navigate(`/poem/${poemId}/revision/${revision.id}`);
    } catch (error) {
      console.error('Failed to process feedback:', error);
    }
  };

  const handleStartVoiceFeedback = async () => {
    try {
      const session = await startVoiceFeedback.mutateAsync(poemId);
      setVoiceSession(session);
      setActiveSession({
        id: session.feedback_session_id,
        poem_id: poemId,
        overall_feedback: null,
        rating: null,
        status: 'in_progress',
        created_at: session.created_at,
        comments: [],
      });
      setShowVoiceModal(true);
    } catch (error) {
      console.error('Failed to start voice feedback:', error);
    }
  };

  const handleVoiceFeedbackConfirmed = () => {
    // Refresh the session data to show the confirmed feedback
    refetchSession();
  };

  const handleCloseVoiceModal = () => {
    setShowVoiceModal(false);
  };

  if (poemLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!poem) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Poem not found</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <div className="flex-1">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-1">Prompt</p>
            <p className="text-gray-900">{poem.prompt}</p>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <PoemDisplay
              content={poem.content}
              comments={activeSession?.comments || []}
              sessionId={activeSession?.id}
              onAddComment={
                activeSession?.status === 'in_progress' ? handleAddComment : undefined
              }
            />
          </div>

          {!activeSession && (
            <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4">
              <button
                onClick={handleStartFeedback}
                disabled={startFeedback.isPending}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {startFeedback.isPending ? 'Starting...' : 'Start Review'}
              </button>
              <VoiceFeedbackButton
                onClick={handleStartVoiceFeedback}
                isLoading={startVoiceFeedback.isPending}
              />
            </div>
          )}
        </div>
      </div>

      {activeSession && (
        <FeedbackSidebar
          session={activeSession}
          onDeleteComment={handleDeleteComment}
          onUpdateFeedback={handleUpdateFeedback}
          onSubmit={handleSubmit}
          onProcess={handleProcess}
          isSubmitting={submitFeedback.isPending}
          isProcessing={processFeedback.isPending}
        />
      )}

      {showVoiceModal && voiceSession && poem && (
        <VoiceFeedbackModal
          session={voiceSession}
          poem={poem}
          onClose={handleCloseVoiceModal}
          onConfirmed={handleVoiceFeedbackConfirmed}
        />
      )}
    </div>
  );
}
