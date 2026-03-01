import { Loader2 } from 'lucide-react';

export default function DriverLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Greeting skeleton */}
      <div className="space-y-1">
        <div className="h-6 w-40 bg-gray-200 rounded-lg" />
        <div className="h-4 w-56 bg-gray-100 rounded" />
      </div>

      {/* Upload button skeleton */}
      <div className="h-20 w-full bg-gray-200 rounded-2xl" />

      {/* Stats row skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center gap-2"
          >
            <div className="h-9 w-9 bg-gray-100 rounded-full" />
            <div className="h-7 w-16 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        ))}
      </div>

      {/* Recent list skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-28 bg-gray-200 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3"
          >
            <div className="h-12 w-12 bg-gray-100 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
      </div>
    </div>
  );
}
