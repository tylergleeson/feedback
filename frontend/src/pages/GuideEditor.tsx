import { useState, useEffect } from 'react';
import { useGuide, useGuideHistory, useUpdateGuide } from '../hooks/useGuide';

export default function GuideEditor() {
  const { data: guide, isLoading } = useGuide();
  const { data: history } = useGuideHistory();
  const updateGuide = useUpdateGuide();

  const [content, setContent] = useState('');
  const [changeSummary, setChangeSummary] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (guide) {
      setContent(guide.content);
    }
  }, [guide]);

  const handleSave = async () => {
    try {
      await updateGuide.mutateAsync({
        content,
        change_summary: changeSummary || undefined,
      });
      setIsEditing(false);
      setChangeSummary('');
    } catch (error) {
      console.error('Failed to update guide:', error);
    }
  };

  const handleCancel = () => {
    if (guide) {
      setContent(guide.content);
    }
    setIsEditing(false);
    setChangeSummary('');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Poetry Guide</h1>
          {guide && (
            <p className="text-gray-500 mt-1">Version {guide.version}</p>
          )}
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 text-indigo-600 font-medium hover:bg-indigo-50 rounded-lg"
          >
            Edit Guide
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {isEditing ? (
          <div className="p-6">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-96 px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Change summary (optional)
              </label>
              <input
                type="text"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Describe what changed..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateGuide.isPending}
                className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {updateGuide.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800">
              {content}
            </pre>
          </div>
        )}
      </div>

      {history && history.length > 1 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Version History</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
            {history.map((version) => (
              <div key={version.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    Version {version.version}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(version.created_at).toLocaleString()}
                  </span>
                </div>
                {version.change_summary && (
                  <p className="text-sm text-gray-600 mt-1">
                    {version.change_summary}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
