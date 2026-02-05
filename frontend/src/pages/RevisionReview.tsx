import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePoem } from '../hooks/usePoems';
import { useRevision, useReviewRevision } from '../hooks/useRevisions';
import SplitView from '../components/SplitView';
import DiffViewer from '../components/DiffViewer';
import { useGuide } from '../hooks/useGuide';

export default function RevisionReview() {
  const { id, revId } = useParams<{ id: string; revId: string }>();
  const navigate = useNavigate();
  const poemId = parseInt(id || '0', 10);
  const revisionId = parseInt(revId || '0', 10);

  const { data: poem } = usePoem(poemId);
  const { data: revision, isLoading } = useRevision(revisionId);
  const { data: guide } = useGuide();
  const reviewRevision = useReviewRevision();

  const [editedPoem, setEditedPoem] = useState<string | null>(null);
  const [editedGuideChanges, setEditedGuideChanges] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!revision || !poem) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Revision not found</p>
      </div>
    );
  }

  const handleAccept = async (acceptPoem: boolean, acceptGuide: boolean) => {
    try {
      await reviewRevision.mutateAsync({
        revisionId: revision.id,
        review: {
          accept_poem: acceptPoem,
          accept_guide_changes: acceptGuide,
          edited_poem: editedPoem || undefined,
          edited_guide_changes: editedGuideChanges || undefined,
        },
      });
      navigate('/history');
    } catch (error) {
      console.error('Failed to review revision:', error);
    }
  };

  const isReviewed = revision.poem_accepted !== 0 || revision.guide_changes_accepted !== 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Review Revision</h1>
          <p className="text-gray-500 mt-1">Compare original and revised versions</p>
        </div>
        {isReviewed && (
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            Reviewed
          </span>
        )}
      </div>

      {revision.rationale && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-900 mb-1">AI Rationale</p>
          <p className="text-blue-800">{revision.rationale}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Poem Comparison</h2>
        </div>
        <SplitView
          original={poem.content}
          revised={editedPoem ?? revision.revised_poem}
          onEditRevised={isReviewed ? undefined : setEditedPoem}
        />
      </div>

      {revision.proposed_guide_changes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Proposed Guide Changes</h2>
          </div>
          <div className="p-6">
            <DiffViewer
              original={guide?.content || ''}
              proposed={editedGuideChanges ?? revision.proposed_guide_changes}
            />
            {!isReviewed && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Edit proposed changes:
                </label>
                <textarea
                  value={editedGuideChanges ?? revision.proposed_guide_changes}
                  onChange={(e) => setEditedGuideChanges(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm"
                  rows={6}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {!isReviewed && (
        <div className="flex gap-4 justify-end">
          <button
            onClick={() => handleAccept(false, false)}
            disabled={reviewRevision.isPending}
            className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
          >
            Reject Both
          </button>
          <button
            onClick={() => handleAccept(true, false)}
            disabled={reviewRevision.isPending}
            className="px-6 py-2 border border-indigo-300 text-indigo-700 font-medium rounded-lg hover:bg-indigo-50"
          >
            Accept Poem Only
          </button>
          <button
            onClick={() => handleAccept(true, true)}
            disabled={reviewRevision.isPending}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700"
          >
            {reviewRevision.isPending ? 'Saving...' : 'Accept Both'}
          </button>
        </div>
      )}
    </div>
  );
}
