'use client';

import { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Pencil,
  Trash2,
  FileImage,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StorageImage, { getWorkingUrl } from '@/components/ui/storage-image';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import type { ReceiptRow } from './ReceiptReview';

// ─── Types ───────────────────────────────────────────

interface ReceiptDetailProps {
  receipt: ReceiptRow | null;
  open: boolean;
  onClose: () => void;
  onEdit: (receipt: ReceiptRow) => void;
  onDelete: (id: string) => void;
  /** Lookup maps to resolve FK names. */
  driverName?: string | null;
  truckNumber?: string | null;
}

// ─── Helpers ─────────────────────────────────────────

function confidenceBadge(c: number | null) {
  const v = c ?? 0;
  if (v >= 80)
    return (
      <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 gap-1">
        <CheckCircle className="h-3 w-3" /> High ({v}%)
      </Badge>
    );
  if (v >= 50)
    return (
      <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50 gap-1">
        <AlertTriangle className="h-3 w-3" /> Medium ({v}%)
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 gap-1">
      <AlertTriangle className="h-3 w-3" /> Low ({v}%)
    </Badge>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  fuel: 'bg-blue-100 text-blue-700',
  tolls: 'bg-yellow-100 text-yellow-700',
  maintenance: 'bg-red-100 text-red-700',
  insurance: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-700',
};

// ─── Component ───────────────────────────────────────

export default function ReceiptDetail({
  receipt,
  open,
  onClose,
  onEdit,
  onDelete,
  driverName,
  truckNumber,
}: ReceiptDetailProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!receipt) return null;

  const hasImage = receipt.image_url && receipt.image_url !== 'placeholder';

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    onDelete(receipt.id);
  };

  const handleDownload = async () => {
    if (!hasImage || downloading) return;
    setDownloading(true);
    try {
      const url = await getWorkingUrl(receipt.image_url);
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `receipt-${receipt.vendor.replace(/\s+/g, '-')}-${receipt.receipt_date}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback: open in new tab
      const url = await getWorkingUrl(receipt.image_url);
      window.open(url, '_blank');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setConfirmDelete(false);
          setDeleting(false);
          setZoom(1);
          setRotation(0);
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden p-0">
        <div className="flex flex-col lg:flex-row h-full max-h-[95vh]">
          {/* ── LEFT: Image ─────────────────────────── */}
          <div className="lg:w-3/5 bg-gray-900 flex flex-col min-h-[220px] lg:min-h-0">
            <div className="flex items-center justify-between p-3 pr-12 bg-gray-800 flex-shrink-0">
              <span className="text-sm text-gray-300 font-medium">Receipt Image</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-700"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-700"
                  onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-700"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
                {hasImage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-gray-400 hover:text-white hover:bg-gray-700"
                    onClick={handleDownload}
                    disabled={downloading}
                  >
                    {downloading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              {hasImage ? (
                <StorageImage
                  src={receipt.image_url}
                  alt="Receipt"
                  className="max-w-full transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                  }}
                />
              ) : (
                <div className="text-center text-gray-500">
                  <FileImage className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm">No image available</p>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Read-only details ────────────── */}
          <div className="lg:w-2/5 flex flex-col overflow-y-auto bg-white">
            <div className="px-5 pt-5 pb-2 pr-12">
              <h2 className="text-lg font-bold text-gray-900">{receipt.vendor}</h2>
            </div>

            <div className="flex-1 px-5 pb-4 space-y-5 overflow-y-auto">
              {/* Amount + confidence */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900 tabular-nums">
                    ${receipt.amount.toFixed(2)}
                  </p>
                  {receipt.tax_amount != null && receipt.tax_amount > 0 && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      Tax: ${receipt.tax_amount.toFixed(2)}
                    </p>
                  )}
                </div>
                {confidenceBadge(receipt.ocr_confidence)}
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                <Field label="Date" value={new Date(receipt.receipt_date).toLocaleDateString()} />
                <Field
                  label="Category"
                  value={
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                        CATEGORY_COLORS[receipt.category] ?? CATEGORY_COLORS.other
                      }`}
                    >
                      {receipt.category}
                    </span>
                  }
                />
                <Field label="Payment" value={receipt.payment_method.replace('_', ' ')} capitalize />
                <Field label="Driver" value={driverName || '—'} />
                <Field label="Truck" value={truckNumber || '—'} />
                <Field
                  label="Status"
                  value={
                    receipt.needs_review ? (
                      <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">
                        Needs Review
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50">
                        Verified
                      </Badge>
                    )
                  }
                />
                {receipt.notes && (
                  <div className="col-span-2">
                    <p className="text-gray-500 text-xs mb-0.5">Notes</p>
                    <p className="text-gray-700">{receipt.notes}</p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="text-xs text-gray-400 pt-3 border-t border-gray-100 space-y-0.5">
                <p>Created: {new Date(receipt.created_at).toLocaleString()}</p>
                {receipt.reviewed_at && (
                  <p>Reviewed: {new Date(receipt.reviewed_at).toLocaleString()}</p>
                )}
              </div>
            </div>

            {/* ── Actions ───────────────────────────── */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex gap-2">
              <Button
                className="bg-blue-600 hover:bg-blue-700 gap-2 flex-1 min-h-[44px]"
                onClick={() => onEdit(receipt)}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              {hasImage && (
                <Button
                  variant="outline"
                  className="min-h-[44px] gap-2"
                  onClick={handleDownload}
                  disabled={downloading}
                >
                  {downloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                variant={confirmDelete ? 'destructive' : 'ghost'}
                className={`min-h-[44px] ${confirmDelete ? '' : 'text-gray-400 hover:text-red-600'}`}
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Field helper ────────────────────────────────────

function Field({
  label,
  value,
  capitalize: cap,
}: {
  label: string;
  value: React.ReactNode;
  capitalize?: boolean;
}) {
  return (
    <div>
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <p className={`text-gray-900 font-medium ${cap ? 'capitalize' : ''}`}>{value}</p>
    </div>
  );
}
