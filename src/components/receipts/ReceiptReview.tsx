'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { deleteReceipt as deleteStorageFile } from '@/lib/storage/upload';
import {
  Save,
  Trash2,
  X,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  AlertTriangle,
  CheckCircle,
  FileImage,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StorageImage from '@/components/ui/storage-image';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

export interface ReceiptRow {
  id: string;
  vendor: string;
  amount: number;
  receipt_date: string;
  tax_amount: number | null;
  category: string;
  payment_method: string;
  needs_review: boolean;
  notes: string | null;
  driver_id: string | null;
  truck_id: string | null;
  image_url: string;
  ocr_confidence: number | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ReceiptReviewProps {
  receipt: ReceiptRow;
  onSave: (updated: ReceiptRow) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  drivers?: { id: string; name: string }[];
  trucks?: { id: string; truck_number: string }[];
  open: boolean;
}

// ─── Constants ───────────────────────────────────────

const CATEGORIES = ['fuel', 'tolls', 'maintenance', 'insurance', 'other'] as const;
const PAYMENT_METHODS = ['cash', 'credit', 'debit', 'company_card', 'other'] as const;

// ─── Confidence helper ───────────────────────────────

function getConfidenceBadge(confidence: number | null) {
  const c = confidence ?? 0;
  if (c >= 80)
    return (
      <Badge variant="outline" className="border-green-300 text-green-700 bg-green-50 gap-1">
        <CheckCircle className="h-3 w-3" /> High ({c}%)
      </Badge>
    );
  if (c >= 50)
    return (
      <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50 gap-1">
        <AlertTriangle className="h-3 w-3" /> Medium ({c}%)
      </Badge>
    );
  return (
    <Badge variant="outline" className="border-red-300 text-red-700 bg-red-50 gap-1">
      <AlertTriangle className="h-3 w-3" /> Low ({c}%)
    </Badge>
  );
}

function needsHighlight(confidence: number | null): string {
  const c = confidence ?? 0;
  if (c < 50) return 'ring-2 ring-red-200';
  if (c < 80) return 'ring-2 ring-yellow-200';
  return '';
}

// ─── Component ───────────────────────────────────────

export default function ReceiptReview({
  receipt,
  onSave,
  onDelete,
  onCancel,
  drivers = [],
  trucks = [],
  open,
}: ReceiptReviewProps) {
  // Form state
  const [form, setForm] = useState({
    vendor: receipt.vendor,
    amount: receipt.amount.toString(),
    receipt_date: receipt.receipt_date,
    tax_amount: receipt.tax_amount?.toString() ?? '',
    category: receipt.category,
    payment_method: receipt.payment_method,
    notes: receipt.notes ?? '',
    driver_id: receipt.driver_id ?? '',
    truck_id: receipt.truck_id ?? '',
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  // Image viewer state
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Auto-save
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const [lastDraft, setLastDraft] = useState(form);

  // Reset form when receipt changes
  useEffect(() => {
    const newForm = {
      vendor: receipt.vendor,
      amount: receipt.amount.toString(),
      receipt_date: receipt.receipt_date,
      tax_amount: receipt.tax_amount?.toString() ?? '',
      category: receipt.category,
      payment_method: receipt.payment_method,
      notes: receipt.notes ?? '',
      driver_id: receipt.driver_id ?? '',
      truck_id: receipt.truck_id ?? '',
    };
    setForm(newForm);
    setLastDraft(newForm);
    setZoom(1);
    setRotation(0);
    setConfirmDelete(false);
    setError('');
  }, [receipt]);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      if (JSON.stringify(form) !== JSON.stringify(lastDraft)) {
        setLastDraft(form);
        // Save draft to localStorage
        try {
          localStorage.setItem(`receipt-draft-${receipt.id}`, JSON.stringify(form));
        } catch {}
      }
    }, 30000);

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [form, lastDraft, receipt.id]);

  // Load draft on mount
  useEffect(() => {
    try {
      const draft = localStorage.getItem(`receipt-draft-${receipt.id}`);
      if (draft) {
        const parsed = JSON.parse(draft);
        setForm(parsed);
      }
    } catch {}
  }, [receipt.id]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, form]);

  // ── Save ────────────────────────────────────────

  const handleSave = async () => {
    setError('');

    // Validate
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (!form.receipt_date) {
      setError('Date is required.');
      return;
    }
    if (!form.vendor.trim()) {
      setError('Vendor is required.');
      return;
    }

    setSaving(true);

    const updates = {
      vendor: form.vendor.trim(),
      amount,
      receipt_date: form.receipt_date,
      tax_amount: form.tax_amount ? parseFloat(form.tax_amount) : null,
      category: form.category as any,
      payment_method: form.payment_method as any,
      notes: form.notes || null,
      driver_id: form.driver_id || null,
      truck_id: form.truck_id || null,
      needs_review: false,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error: dbError } = await supabase
      .from('receipts')
      .update(updates)
      .eq('id', receipt.id)
      .select()
      .single();

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    // Clear draft
    try {
      localStorage.removeItem(`receipt-draft-${receipt.id}`);
    } catch {}

    onSave(data as ReceiptRow);
  };

  // ── Delete (DB + Storage) ───────────────────────

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    setError('');

    try {
      // 1. Delete from DB first
      const { error: dbError } = await supabase
        .from('receipts')
        .delete()
        .eq('id', receipt.id);

      if (dbError) throw new Error(dbError.message);

      // 2. Delete image from Storage
      if (receipt.image_url && receipt.image_url !== 'placeholder') {
        try {
          // Extract storage path from public URL
          const url = new URL(receipt.image_url);
          const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/receipts\/(.+)/);
          if (pathMatch) {
            await deleteStorageFile(pathMatch[1]);
          }
        } catch {
          // Storage delete is best-effort — don't block the flow
          console.warn('Could not delete storage file for receipt', receipt.id);
        }
      }

      // Clear draft
      try {
        localStorage.removeItem(`receipt-draft-${receipt.id}`);
      } catch {}

      onDelete?.(receipt.id);
    } catch (err: any) {
      setError(err.message || 'Delete failed');
      setDeleting(false);
    }
  };

  const hasImage = receipt.image_url && receipt.image_url !== 'placeholder';
  const confidence = receipt.ocr_confidence;
  const ringClass = needsHighlight(confidence);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden p-0 [&>button:last-child]:hidden">
        <div className="flex flex-col lg:flex-row h-full max-h-[95vh]">
          {/* ── LEFT: Image viewer ──────────────────── */}
          <div className="lg:w-1/2 bg-gray-900 flex flex-col min-h-[200px] lg:min-h-0">
            <div className="flex items-center justify-between p-3 bg-gray-800">
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
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
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

          {/* ── RIGHT: Edit form ────────────────────── */}
          <div className="lg:w-1/2 flex flex-col overflow-y-auto">
            <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-lg">Review Receipt</DialogTitle>
                {getConfidenceBadge(confidence)}
              </div>
              {confidence !== null && confidence < 80 && (
                <p className="text-xs text-yellow-600 mt-1">
                  Low confidence — please verify the highlighted fields.
                </p>
              )}
            </DialogHeader>

            <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-2 gap-3">
                {/* Vendor */}
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Vendor *</Label>
                  <Input
                    value={form.vendor}
                    onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                    className={`min-h-[44px] ${ringClass}`}
                    required
                  />
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Amount ($) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className={`min-h-[44px] ${ringClass}`}
                    required
                  />
                </div>

                {/* Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Date *</Label>
                  <Input
                    type="date"
                    value={form.receipt_date}
                    onChange={(e) => setForm({ ...form, receipt_date: e.target.value })}
                    className={`min-h-[44px] ${ringClass}`}
                    required
                  />
                </div>

                {/* Tax */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Tax ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.tax_amount}
                    onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
                    placeholder="0.00"
                    className="min-h-[44px]"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
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

                {/* Payment */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Payment Method</Label>
                  <Select
                    value={form.payment_method}
                    onValueChange={(v) => setForm({ ...form, payment_method: v })}
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

                {/* Driver */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Driver</Label>
                  <Select
                    value={form.driver_id || 'none'}
                    onValueChange={(v) => setForm({ ...form, driver_id: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="None" />
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

                {/* Truck */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Truck</Label>
                  <Select
                    value={form.truck_id || 'none'}
                    onValueChange={(v) => setForm({ ...form, truck_id: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger className="min-h-[44px]">
                      <SelectValue placeholder="None" />
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

                {/* Notes */}
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-medium text-gray-500">Notes</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Additional details…"
                    rows={2}
                    className="min-h-[44px]"
                  />
                </div>
              </div>

              {/* Metadata */}
              <div className="text-xs text-gray-400 pt-2 border-t border-gray-100 space-y-0.5">
                <p>Created: {new Date(receipt.created_at).toLocaleString()}</p>
                {receipt.reviewed_at && (
                  <p>Reviewed: {new Date(receipt.reviewed_at).toLocaleString()}</p>
                )}
                <p className="text-gray-300">
                  Ctrl+Enter to save · Esc to cancel
                </p>
              </div>
            </div>

            {/* ── Action buttons ─────────────────────── */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center gap-2">
              <Button
                className="bg-blue-600 hover:bg-blue-700 gap-2 flex-1 min-h-[44px]"
                onClick={handleSave}
                disabled={saving || deleting}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? 'Saving…' : 'Save'}
              </Button>

              <Button
                variant="outline"
                className="min-h-[44px]"
                onClick={onCancel}
                disabled={saving || deleting}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>

              <Button
                variant={confirmDelete ? 'destructive' : 'ghost'}
                className={`min-h-[44px] ${confirmDelete ? '' : 'text-gray-400 hover:text-red-600'}`}
                onClick={handleDelete}
                disabled={saving || deleting}
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1" />
                )}
                {confirmDelete ? 'Confirm Delete' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
