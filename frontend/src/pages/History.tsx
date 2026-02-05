import { useNavigate } from 'react-router-dom';
import { usePoems } from '../hooks/usePoems';
import { useGuideHistory } from '../hooks/useGuide';

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    under_review: 'bg-yellow-100 text-yellow-800',
    revised: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.draft}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function History() {
  const navigate = useNavigate();
  const { data: poems, isLoading: poemsLoading } = usePoems();
  const { data: guideHistory, isLoading: guideLoading } = useGuideHistory();

  if (poemsLoading || guideLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">History</h1>
        <p className="text-gray-500 mt-1">Past poems and guide versions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Poems</h2>
          {poems && poems.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
              {poems.map((poem) => (
                <button
                  key={poem.id}
                  onClick={() => navigate(`/poem/${poem.id}`)}
                  className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {poem.prompt}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(poem.created_at).toLocaleString()}
                      </p>
                    </div>
                    <StatusBadge status={poem.status} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No poems yet</p>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Guide Versions</h2>
          {guideHistory && guideHistory.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
              {guideHistory.map((version) => (
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
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No guide versions yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
