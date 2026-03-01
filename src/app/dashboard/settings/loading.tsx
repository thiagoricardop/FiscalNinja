import { Loader2 } from 'lucide-react';

export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-36 bg-gray-200 rounded-lg" />

      {/* Settings sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="h-5 w-40 bg-gray-200 rounded" />
          <div className="space-y-3">
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
        </div>
      ))}

      <div className="flex justify-center pt-2">
        <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
      </div>
    </div>
  );
}
