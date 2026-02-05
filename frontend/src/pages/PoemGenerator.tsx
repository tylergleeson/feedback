import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeneratePoem, usePoems } from '../hooks/usePoems';

export default function PoemGenerator() {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();
  const generatePoem = useGeneratePoem();
  const { data: poems } = usePoems();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      const poem = await generatePoem.mutateAsync(prompt);
      navigate(`/poem/${poem.id}`);
    } catch (error) {
      console.error('Failed to generate poem:', error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">
          Generate a Poem
        </h1>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="prompt"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              What should the poem be about?
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Write a poem about a dog waiting by the window..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              rows={4}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || generatePoem.isPending}
            className="w-full py-3 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generatePoem.isPending ? 'Generating...' : 'Generate Poem'}
          </button>
        </div>

        {generatePoem.isError && (
          <p className="mt-4 text-red-600 text-sm">
            Failed to generate poem. Please try again.
          </p>
        )}
      </div>

      {poems && poems.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Recent Poems
          </h2>
          <div className="space-y-3">
            {poems.slice(0, 5).map((poem) => (
              <button
                key={poem.id}
                onClick={() => navigate(`/poem/${poem.id}`)}
                className="w-full text-left bg-white rounded-lg border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <p className="font-medium text-gray-900 truncate">
                  {poem.prompt}
                </p>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                  <span className="capitalize">{poem.status.replace('_', ' ')}</span>
                  <span>·</span>
                  <span>
                    {new Date(poem.created_at).toLocaleDateString()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
