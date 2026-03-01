'use client';

import dynamic from 'next/dynamic';
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

export default function DriverUploadPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
          <Upload className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Upload Receipt</h1>
          <p className="text-xs text-gray-500">
            Snap a photo or drop a file — AI extracts the data
          </p>
        </div>
      </div>

      <ReceiptUpload onSuccess={() => {}} />

      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-2">
        <h3 className="text-xs font-semibold text-gray-700">Tips</h3>
        <ul className="text-xs text-gray-500 space-y-1.5 list-disc list-inside">
          <li>Good lighting and full receipt visible</li>
          <li>Avoid shadows so text is readable</li>
          <li>Up to 10 receipts in one batch</li>
          <li>Review AI-extracted data before confirming</li>
        </ul>
      </div>
    </div>
  );
}
