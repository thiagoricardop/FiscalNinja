import { Loader2 } from 'lucide-react';

export default function TeamLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="h-10 w-36 bg-gray-200 rounded-lg" />
      </div>

      {/* Members table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 px-6 py-3 flex gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-24 bg-gray-200 rounded" />
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-b border-gray-50 px-6 py-4 flex gap-6 items-center">
            <div className="h-8 w-8 bg-gray-200 rounded-full" />
            <div className="h-4 w-32 bg-gray-100 rounded" />
            <div className="h-4 w-40 bg-gray-100 rounded" />
            <div className="h-6 w-16 bg-gray-100 rounded-full" />
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
      </div>
    </div>
  );
}
