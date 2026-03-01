import { Loader2 } from 'lucide-react';

export default function ReceiptsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-gray-200 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-10 w-28 bg-gray-200 rounded-lg" />
          <div className="h-10 w-28 bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        <div className="h-10 w-64 bg-gray-200 rounded-lg" />
        <div className="h-10 w-32 bg-gray-200 rounded-lg" />
        <div className="h-10 w-32 bg-gray-200 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-3 flex gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 w-20 bg-gray-200 rounded" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-gray-50 px-6 py-4 flex gap-6">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="h-4 w-20 bg-gray-100 rounded" />
            ))}
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
      </div>
    </div>
  );
}
