interface DiffViewerProps {
  original: string;
  proposed: string;
}

export default function DiffViewer({ original, proposed }: DiffViewerProps) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium text-gray-500 mb-2">
          Current Guide (excerpt)
        </h4>
        <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm text-gray-700 max-h-40 overflow-y-auto">
          <pre className="whitespace-pre-wrap">
            {original.slice(0, 500)}
            {original.length > 500 && '...'}
          </pre>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-green-700 mb-2">
          Proposed Addition
        </h4>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 font-mono text-sm text-green-900">
          <pre className="whitespace-pre-wrap">{proposed}</pre>
        </div>
      </div>
    </div>
  );
}
