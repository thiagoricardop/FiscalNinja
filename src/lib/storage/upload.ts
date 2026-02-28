/* =====================================================
 * Supabase Storage — Receipt Upload Service
 * src/lib/storage/upload.ts
 *
 * Client-side utilities for uploading, deleting, and
 * compressing receipt images with Supabase Storage.
 * ===================================================== */

import { supabase } from '@/lib/supabase/client';
import imageCompression from 'browser-image-compression';

const BUCKET = 'receipts';

// ─── Types ───────────────────────────────────────────

export interface UploadResult {
  /** Path within the Storage bucket. */
  path: string;
  /** Public URL of the uploaded file. */
  publicUrl: string;
}

export interface CompressionOptions {
  /** Maximum file size in MB after compression (default: 2). */
  maxSizeMB?: number;
  /** Maximum width/height in pixels (default: 2048). */
  maxWidthOrHeight?: number;
  /** Use web worker for compression (default: true). */
  useWebWorker?: boolean;
}

// ─── 1. uploadReceipt ────────────────────────────────

/**
 * Upload a receipt image to Supabase Storage.
 *
 * @param file   The file (or compressed blob) to upload.
 * @param userId The authenticated user's ID (used as folder prefix).
 * @returns      `{ path, publicUrl }` of the uploaded file.
 */
export async function uploadReceipt(
  file: File,
  userId: string
): Promise<UploadResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const random = Math.random().toString(36).slice(2, 8);
  const path = `${userId}/${Date.now()}_${random}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(data.path);

  return { path: data.path, publicUrl };
}

// ─── 2. deleteReceipt ────────────────────────────────

/**
 * Delete a receipt file from Supabase Storage.
 *
 * @param filePath The path within the bucket (e.g. "userId/abc123.jpg").
 */
export async function deleteReceipt(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) {
    throw new Error(`Delete failed: ${error.message}`);
  }
}

// ─── 3. getSignedUrl ─────────────────────────────────

/**
 * Generate a temporary signed URL for a private file.
 *
 * @param filePath  Path within the bucket.
 * @param expiresIn Seconds until the URL expires (default: 3600 = 1 hour).
 * @returns         A signed URL string.
 */
export async function getSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message ?? 'unknown error'}`);
  }

  return data.signedUrl;
}

// ─── 4. compressImage ────────────────────────────────

/**
 * Compress a large image before upload using browser-image-compression.
 * Returns the original file untouched for non-image files or if already small enough.
 *
 * @param file    The image File to compress.
 * @param options Compression options.
 * @returns       A compressed File.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // Skip non-image files (e.g. PDFs)
  if (!file.type.startsWith('image/')) return file;

  const {
    maxSizeMB = 2,
    maxWidthOrHeight = 2048,
    useWebWorker = true,
  } = options;

  // Skip if already small enough
  if (file.size <= maxSizeMB * 1024 * 1024) return file;

  const compressed = await imageCompression(file, {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker,
    fileType: file.type as any,
  });

  // browser-image-compression returns a Blob; convert to File to keep the name
  return new File([compressed], file.name, { type: compressed.type });
}
