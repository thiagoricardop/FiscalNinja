'use client';

import dynamic from 'next/dynamic';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionBanner } from '@/components/dashboard/SubscriptionGate';
import { useRouter } from 'next/navigation';
import { Upload, Loader2 } from 'lucide-react';

const ReceiptUpload = dynamic(
  () => import('@/components/receipts/ReceiptUpload'),
  {
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    ),
    ssr: false,
  },
);

export default function UploadPage() {
  const router = useRouter();
  const { hasSubscription, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Subscription banner when no plan */}
      {!loading && !hasSubscription && <SubscriptionBanner />}

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Upload className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Upload Receipts</h1>
            <p className="text-sm text-gray-500">
              Drop your receipts and let Gemini AI extract the data automatically
            </p>
          </div>
        </div>
      </div>

      {/* Upload component — disabled overlay when no subscription */}
      <div className={!hasSubscription ? 'pointer-events-none opacity-50' : ''}>
        <ReceiptUpload
          onSuccess={() => {
            // Receipts page will see the new data on next visit
          }}
        />
      </div>

      {/* Tips */}
      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Tips for best results</h3>
        <ul className="text-sm text-gray-500 space-y-2">
          <li className="flex gap-2">
            <span className="text-blue-500 font-bold">•</span>
            Take photos in good lighting with the full receipt visible
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500 font-bold">•</span>
            Avoid shadows and ensure text is readable
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500 font-bold">•</span>
            You can upload up to 10 receipts at once for batch processing
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500 font-bold">•</span>
            Always review the AI-extracted data before confirming
          </li>
        </ul>
      </div>
    </div>
  );
}
