interface SplitViewProps {
  original: string;
  revised: string;
  onEditRevised?: (value: string) => void;
}

export default function SplitView({
  original,
  revised,
  onEditRevised,
}: SplitViewProps) {
  return (
    <div className="grid grid-cols-2 divide-x divide-gray-200">
      <div className="p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">Original</h3>
        <div className="poem-text text-gray-700">{original}</div>
      </div>
      <div className="p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">
          Revised {onEditRevised && '(editable)'}
        </h3>
        {onEditRevised ? (
          <textarea
            value={revised}
            onChange={(e) => onEditRevised(e.target.value)}
            className="w-full h-full min-h-[200px] poem-text text-gray-900 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        ) : (
          <div className="poem-text text-gray-900">{revised}</div>
        )}
      </div>
    </div>
  );
}
