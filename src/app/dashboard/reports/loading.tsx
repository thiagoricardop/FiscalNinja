import { Loader2 } from 'lucide-react';

export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 bg-gray-200 rounded-lg" />
        <div className="h-10 w-36 bg-gray-200 rounded-lg" />
      </div>

      {/* Chart placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="h-5 w-40 bg-gray-200 rounded" />
        <div className="h-64 bg-gray-100 rounded-lg" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-7 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
      </div>
    </div>
  );
}
