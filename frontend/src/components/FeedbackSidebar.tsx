import { useState, useEffect } from 'react';
import type { FeedbackSession } from '../types';

interface FeedbackSidebarProps {
  session: FeedbackSession;
  onDeleteComment: (commentId: number) => void;
  onUpdateFeedback: (data: { overall_feedback?: string; rating?: number }) => void;
  onSubmit: () => void;
  onProcess: () => void;
  isSubmitting: boolean;
  isProcessing: boolean;
}

export default function FeedbackSidebar({
  session,
  onDeleteComment,
  onUpdateFeedback,
  onSubmit,
  onProcess,
  isSubmitting,
  isProcessing,
}: FeedbackSidebarProps) {
  const [feedback, setFeedback] = useState(session.overall_feedback || '');
  const [rating, setRating] = useState(session.rating || 0);

  useEffect(() => {
    setFeedback(session.overall_feedback || '');
    setRating(session.rating || 0);
  }, [session]);

  const handleFeedbackBlur = () => {
    if (feedback !== session.overall_feedback) {
      onUpdateFeedback({ overall_feedback: feedback });
    }
  };

  const handleRatingChange = (newRating: number) => {
    setRating(newRating);
    onUpdateFeedback({ rating: newRating });
  };

  const isInProgress = session.status === 'in_progress';
  const isSubmitted = session.status === 'submitted';
  const isProcessed = session.status === 'processed';

  return (
    <div className="w-80 flex-shrink-0">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 sticky top-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Feedback</h2>
          <p className="text-sm text-gray-500 capitalize">
            {session.status.replace('_', ' ')}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => isInProgress && handleRatingChange(star)}
                  disabled={!isInProgress}
                  className={`w-8 h-8 text-xl ${
                    star <= rating
                      ? 'text-amber-400'
                      : 'text-gray-300'
                  } ${isInProgress ? 'hover:text-amber-400 cursor-pointer' : 'cursor-default'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Overall Feedback */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Feedback
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onBlur={handleFeedbackBlur}
              disabled={!isInProgress}
              placeholder="Share your overall thoughts..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none disabled:bg-gray-50 disabled:text-gray-500"
              rows={4}
            />
          </div>

          {/* Inline Comments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inline Comments ({session.comments.length})
            </label>
            {session.comments.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No comments yet
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {session.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 bg-gray-50 rounded-lg text-sm"
                  >
                    <p className="text-amber-700 font-medium truncate">
                      "{comment.highlighted_text}"
                    </p>
                    <p className="text-gray-700 mt-1">{comment.comment}</p>
                    {isInProgress && (
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="text-red-600 text-xs hover:underline mt-2"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-200 space-y-3">
            {isInProgress && (
              <button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="w-full py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            )}

            {isSubmitted && (
              <button
                onClick={onProcess}
                disabled={isProcessing}
                className="w-full py-2 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Generate Revision'}
              </button>
            )}

            {isProcessed && (
              <p className="text-sm text-green-600 text-center">
                Revision generated! Check the revision page.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
