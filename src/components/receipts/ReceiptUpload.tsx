'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { uploadReceipt, compressImage } from '@/lib/storage/upload';
import {
  Upload,
  Camera,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  FileImage,
  Sparkles,
  Save,
  Pencil,
  Trash2,
  ImagePlus,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Types ───────────────────────────────────────────

interface ExtractionResult {
  vendor: string;
  total: number;
  date: string;
  taxAmount: number | null;
  category: string;
  paymentMethod: string;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
  rawText: string;
  confidence: number;
  needsReview: boolean;
}

/** A single file in the upload queue with its processing state. */
interface QueuedFile {
  id: string;
  file: File;
  preview: string | null;
  status: 'pending' | 'uploading' | 'processing' | 'review' | 'saving' | 'done' | 'error';
  error?: string;
  imageUrl?: string;
  storagePath?: string;
  extraction?: ExtractionResult;
  /** Editable copy of extraction for the review step. */
  editData?: EditableData;
}

interface EditableData {
  vendor: string;
  amount: string;
  receipt_date: string;
  tax_amount: string;
  category: string;
  payment_method: string;
  notes: string;
  driver_id: string;
  truck_id: string;
}

interface ReceiptUploadProps {
  /** Called each time a receipt is confirmed and saved. */
  onSuccess?: () => void;
  /** Drivers list (avoids re-fetch if parent already has them). */
  drivers?: { id: string; name: string }[];
  /** Trucks list (avoids re-fetch if parent already has them). */
  trucks?: { id: string; truck_number: string }[];
}

// ─── Constants ───────────────────────────────────────

const ALLOWED_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 10;
const CATEGORIES = ['fuel', 'tolls', 'maintenance', 'insurance', 'other'] as const;
const PAYMENT_METHODS = ['cash', 'credit', 'debit', 'company_card', 'other'] as const;

// ─── Component ───────────────────────────────────────

export default function ReceiptUpload({
  onSuccess,
  drivers: driversProp,
  trucks: trucksProp,
}: ReceiptUploadProps) {
  const { user } = useUser();
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [globalError, setGlobalError] = useState('');
  const cameraRef = useRef<HTMLInputElement>(null);

  // Fetch drivers/trucks if not passed as props
  const [drivers, setDrivers] = useState(driversProp ?? []);
  const [trucks, setTrucks] = useState(trucksProp ?? []);

  useEffect(() => {
    if (driversProp) setDrivers(driversProp);
    if (trucksProp) setTrucks(trucksProp);
  }, [driversProp, trucksProp]);

  useEffect(() => {
    if (!user || driversProp || trucksProp) return;
    (async () => {
      const [d, t] = await Promise.all([
        supabase.from('drivers').select('id, name').eq('user_id', user.id).eq('active', true),
        supabase.from('trucks').select('id, truck_number').eq('user_id', user.id).eq('active', true),
      ]);
      setDrivers((d.data as any[]) ?? []);
      setTrucks((t.data as any[]) ?? []);
    })();
  }, [user, driversProp, trucksProp]);

  // ── Dropzone ─────────────────────────────────────

  const onDrop = useCallback(
    (accepted: File[], rejections: FileRejection[]) => {
      setGlobalError('');

      if (rejections.length > 0) {
        const msgs = rejections.map((r) => {
          const name = r.file.name;
          const errs = r.errors.map((e) => {
            if (e.code === 'file-too-large') {
              const sizeMB = (r.file.size / 1024 / 1024).toFixed(1);
              return `File is ${sizeMB} MB — max allowed is ${MAX_SIZE / 1024 / 1024} MB`;
            }
            return e.message;
          }).join(', ');
          return `${name}: ${errs}`;
        });
        setGlobalError(msgs.join('\n'));
      }

      const remaining = MAX_FILES - queue.length;
      const toAdd = accepted.slice(0, remaining);
      if (accepted.length > remaining) {
        setGlobalError((prev) =>
          (prev ? prev + '\n' : '') + `Only ${MAX_FILES} files max — ${accepted.length - remaining} skipped.`
        );
      }

      const newItems: QueuedFile[] = toAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        status: 'pending',
      }));

      setQueue((prev) => [...prev, ...newItems]);
    },
    [queue.length]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ALLOWED_TYPES,
    maxSize: MAX_SIZE,
    maxFiles: MAX_FILES,
    multiple: true,
  });

  // ── Helpers ──────────────────────────────────────

  const updateItem = (id: string, patch: Partial<QueuedFile>) => {
    setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const removeItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((q) => q.id !== id);
    });
  };

  // ── Process one file ─────────────────────────────

  const processFile = async (item: QueuedFile) => {
    if (!user) return;

    // 1. Upload
    updateItem(item.id, { status: 'uploading' });
    try {
      const compressed = await compressImage(item.file);
      const { publicUrl, path } = await uploadReceipt(compressed, user.id);
      updateItem(item.id, { imageUrl: publicUrl, storagePath: path });

      // 2. AI Processing
      updateItem(item.id, { status: 'processing' });
      const formData = new FormData();
      formData.append('file', compressed);

      const res = await fetch('/api/receipts/process', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'AI processing failed');

      const ext = data.extraction as ExtractionResult;

      // 3. Move to review
      updateItem(item.id, {
        status: 'review',
        extraction: ext,
        editData: {
          vendor: ext.vendor,
          amount: ext.total.toString(),
          receipt_date: ext.date,
          tax_amount: ext.taxAmount?.toString() ?? '',
          category: ext.category,
          payment_method: ext.paymentMethod,
          notes: ext.lineItems.length > 0
            ? ext.lineItems.map((i) => `${i.description}: $${i.total}`).join(', ')
            : '',
          driver_id: '',
          truck_id: '',
        },
      });
    } catch (err: any) {
      updateItem(item.id, {
        status: 'error',
        error: err.message || 'Something went wrong',
      });
    }
  };

  const processAll = () => {
    const pending = queue.filter((q) => q.status === 'pending');
    pending.forEach(processFile);
  };

  // ── Confirm / save to DB ─────────────────────────

  const confirmReceipt = async (item: QueuedFile) => {
    if (!user || !item.editData) return;
    updateItem(item.id, { status: 'saving' });

    const d = item.editData;

    const { error } = await supabase.from('receipts').insert({
      user_id: user.id,
      vendor: d.vendor.trim(),
      amount: parseFloat(d.amount) || 0,
      receipt_date: d.receipt_date,
      tax_amount: d.tax_amount ? parseFloat(d.tax_amount) : null,
      category: d.category as any,
      payment_method: d.payment_method as any,
      notes: d.notes || null,
      image_url: item.imageUrl ?? 'placeholder',
      ocr_confidence: item.extraction?.confidence ?? 0,
      needs_review: false, // User already reviewed
      driver_id: d.driver_id || null,
      truck_id: d.truck_id || null,
    });

    if (error) {
      updateItem(item.id, { status: 'error', error: error.message });
      return;
    }

    updateItem(item.id, { status: 'done' });
    onSuccess?.();
  };

  const updateEditData = (id: string, field: keyof EditableData, value: string) => {
    setQueue((prev) =>
      prev.map((q) =>
        q.id === id && q.editData
          ? { ...q, editData: { ...q.editData, [field]: value } }
          : q
      )
    );
  };

  // ── Derived state ────────────────────────────────

  const hasPending = queue.some((q) => q.status === 'pending');
  const isProcessing = queue.some((q) => q.status === 'uploading' || q.status === 'processing');
  const allDone = queue.length > 0 && queue.every((q) => q.status === 'done');
  const reviewItems = queue.filter((q) => q.status === 'review');
  const hasMultipleReview = reviewItems.length > 1;

  // ── Confirm All state ───────────────────────────

  const [confirmAllDialogOpen, setConfirmAllDialogOpen] = useState(false);
  const [confirmingAll, setConfirmingAll] = useState(false);

  const confirmAllReceipts = async () => {
    setConfirmingAll(true);
    for (const item of reviewItems) {
      await confirmReceipt(item);
    }
    setConfirmingAll(false);
    setConfirmAllDialogOpen(false);
  };

  // ── Render ───────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Drop zone ───────────────────────────────── */}
      <div
        {...getRootProps()}
        className={`relative rounded-xl border-2 border-dashed transition-all p-8 text-center cursor-pointer ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
        }`}
      >
        <input {...getInputProps()} />
        {/* Hidden camera input for mobile */}
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onDrop([f], []);
          }}
        />
        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
        <p className="font-medium text-gray-700">
          Drop receipts here or click to browse
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Up to {MAX_FILES} files • JPEG, PNG, WebP, PDF • Max 10 MB each
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <Button type="button" variant="outline" size="sm" className="gap-2 min-h-[44px]">
            <ImagePlus className="h-4 w-4" />
            Browse Files
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 min-h-[44px] sm:hidden"
            onClick={(e) => {
              e.stopPropagation();
              cameraRef.current?.click();
            }}
          >
            <Camera className="h-4 w-4" />
            Take Photo
          </Button>
        </div>
      </div>

      {globalError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line">{globalError}</AlertDescription>
        </Alert>
      )}

      {/* ── File queue ──────────────────────────────── */}
      {queue.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-gray-900">
              {queue.length} file{queue.length !== 1 ? 's' : ''} selected
            </h3>
            <div className="flex gap-2">
              {hasMultipleReview && (
                <Button
                  className="bg-green-600 hover:bg-green-700 gap-2 min-h-[44px]"
                  onClick={() => setConfirmAllDialogOpen(true)}
                  disabled={confirmingAll}
                >
                  <CheckCheck className="h-4 w-4" />
                  Confirm All ({reviewItems.length})
                </Button>
              )}
              {hasPending && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 gap-2 min-h-[44px]"
                  onClick={processAll}
                  disabled={isProcessing}
                >
                  <Sparkles className="h-4 w-4" />
                  Process{queue.filter((q) => q.status === 'pending').length > 1 ? ' All' : ''} with AI
                </Button>
              )}
            </div>
          </div>

          {queue.map((item) => (
            <Card key={item.id} className="border-gray-200 overflow-hidden">
              <CardContent className="p-4 space-y-4">
                {/* ── Header row: thumbnail + file info ──── */}
                <div className="flex items-start gap-4">
                  {item.preview ? (
                    <img
                      src={item.preview}
                      alt="Preview"
                      className="w-20 h-28 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-20 h-28 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileImage className="h-7 w-7 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.file.name}</p>
                    <p className="text-sm text-gray-500">
                      {(item.file.size / 1024 / 1024).toFixed(2)} MB •{' '}
                      {item.file.type.split('/')[1]?.toUpperCase()}
                    </p>

                    {/* Status badges */}
                    <div className="mt-2">
                      {item.status === 'pending' && (
                        <Badge variant="outline" className="text-gray-500">
                          Ready
                        </Badge>
                      )}
                      {item.status === 'uploading' && (
                        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
                        </Badge>
                      )}
                      {item.status === 'processing' && (
                        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> AI Processing…
                        </Badge>
                      )}
                      {item.status === 'review' && (
                        <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50 gap-1">
                          <Pencil className="h-3 w-3" /> Review
                          {item.extraction && (
                            <span className="ml-1 opacity-75">
                              ({item.extraction.confidence}%)
                            </span>
                          )}
                        </Badge>
                      )}
                      {item.status === 'saving' && (
                        <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50 gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                        </Badge>
                      )}
                      {item.status === 'done' && (
                        <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 gap-1">
                          <CheckCircle className="h-3 w-3" /> Saved
                        </Badge>
                      )}
                      {item.status === 'error' && (
                        <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 gap-1">
                          <AlertTriangle className="h-3 w-3" /> Error
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Remove button (only when not actively processing) */}
                  {!['uploading', 'processing', 'saving'].includes(item.status) && item.status !== 'done' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-600 flex-shrink-0"
                      onClick={() => removeItem(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* ── Error message ──────────────────────── */}
                {item.status === 'error' && item.error && (
                  <Alert variant="destructive" className="text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{item.error}</AlertDescription>
                  </Alert>
                )}

                {/* ── Review / edit form ─────────────────── */}
                {item.status === 'review' && item.editData && (
                  <div className="border-t border-gray-100 pt-4 space-y-4">
                    {item.extraction && item.extraction.confidence < 80 && (
                      <Alert className="border-yellow-200 bg-yellow-50">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          Low confidence ({item.extraction.confidence}%) — please review and correct the values below.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs font-medium text-gray-500">Vendor</Label>
                        <Input
                          value={item.editData.vendor}
                          onChange={(e) => updateEditData(item.id, 'vendor', e.target.value)}
                          className="min-h-[44px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-500">Amount ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.editData.amount}
                          onChange={(e) => updateEditData(item.id, 'amount', e.target.value)}
                          className="min-h-[44px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-500">Date</Label>
                        <Input
                          type="date"
                          value={item.editData.receipt_date}
                          onChange={(e) => updateEditData(item.id, 'receipt_date', e.target.value)}
                          className="min-h-[44px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-500">Tax ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.editData.tax_amount}
                          onChange={(e) => updateEditData(item.id, 'tax_amount', e.target.value)}
                          placeholder="0.00"
                          className="min-h-[44px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-500">Category</Label>
                        <Select
                          value={item.editData.category}
                          onValueChange={(v) => updateEditData(item.id, 'category', v)}
                        >
                          <SelectTrigger className="min-h-[44px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((c) => (
                              <SelectItem key={c} value={c} className="capitalize">
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-gray-500">Payment</Label>
                        <Select
                          value={item.editData.payment_method}
                          onValueChange={(v) => updateEditData(item.id, 'payment_method', v)}
                        >
                          <SelectTrigger className="min-h-[44px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((p) => (
                              <SelectItem key={p} value={p} className="capitalize">
                                {p.replace('_', ' ')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {drivers.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-500">Driver</Label>
                          <Select
                            value={item.editData.driver_id}
                            onValueChange={(v) => updateEditData(item.id, 'driver_id', v)}
                          >
                            <SelectTrigger className="min-h-[44px]">
                              <SelectValue placeholder="Select driver" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {drivers.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {trucks.length > 0 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium text-gray-500">Truck</Label>
                          <Select
                            value={item.editData.truck_id}
                            onValueChange={(v) => updateEditData(item.id, 'truck_id', v)}
                          >
                            <SelectTrigger className="min-h-[44px]">
                              <SelectValue placeholder="Select truck" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {trucks.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.truck_number}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-xs font-medium text-gray-500">Notes</Label>
                        <Textarea
                          value={item.editData.notes}
                          onChange={(e) => updateEditData(item.id, 'notes', e.target.value)}
                          placeholder="Additional details…"
                          rows={2}
                          className="min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 gap-2 min-h-[44px] flex-1"
                        onClick={() => confirmReceipt(item)}
                      >
                        <Save className="h-4 w-4" />
                        Confirm & Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="min-h-[44px] min-w-[44px] text-gray-400 hover:text-red-600"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Done state ─────────────────────────── */}
                {item.status === 'done' && (
                  <div className="border-t border-gray-100 pt-3 flex items-center gap-2 text-sm text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Receipt saved — {item.editData?.vendor}, ${parseFloat(item.editData?.amount ?? '0').toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {/* ── Queue summary actions ────────────────── */}
          {allDone && (
            <div className="text-center space-y-3">
              <p className="text-sm text-green-700 font-medium">
                <CheckCircle className="h-4 w-4 inline mr-1" />
                All {queue.length} receipt{queue.length > 1 ? 's' : ''} saved!
              </p>
              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={() => {
                  queue.forEach((q) => {
                    if (q.preview) URL.revokeObjectURL(q.preview);
                  });
                  setQueue([]);
                }}
              >
                Upload More Receipts
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Confirm All dialog ──────────────────────── */}
      <Dialog open={confirmAllDialogOpen} onOpenChange={(open) => { if (!open && !confirmingAll) setConfirmAllDialogOpen(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm {reviewItems.length} Receipt{reviewItems.length !== 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Review the summary below before saving all receipts at once.
          </p>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {reviewItems.map((item) => (
              <div key={item.id} className="rounded-lg bg-gray-50 border border-gray-100 p-3 flex items-center gap-3">
                {item.preview ? (
                  <img src={item.preview} alt="" className="h-10 w-10 rounded object-cover border border-gray-200 flex-shrink-0" />
                ) : (
                  <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FileImage className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.editData?.vendor || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{item.editData?.receipt_date} &middot; {item.editData?.category}</p>
                </div>
                <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                  ${parseFloat(item.editData?.amount ?? '0').toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3">
            <p className="text-sm text-blue-800 font-medium">
              Total: <strong>${reviewItems.reduce((s, i) => s + (parseFloat(i.editData?.amount ?? '0') || 0), 0).toFixed(2)}</strong>
              {' '}&middot; {reviewItems.length} receipt{reviewItems.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setConfirmAllDialogOpen(false)} disabled={confirmingAll}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 gap-2"
              onClick={confirmAllReceipts}
              disabled={confirmingAll}
            >
              {confirmingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCheck className="h-4 w-4" />
                  Confirm All
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
