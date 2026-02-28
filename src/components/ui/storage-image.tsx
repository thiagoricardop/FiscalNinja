'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { FileImage } from 'lucide-react';

const BUCKET = 'receipts';

/**
 * Extract the storage path from a Supabase public URL.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/receipts/userId/file.jpg"
 *      → "userId/file.jpg"
 */
function extractPath(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/public\/receipts\/(.+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Cache signed URLs so we don't re-request them on every render. */
const urlCache = new Map<string, { url: string; expiresAt: number }>();

export async function getWorkingUrl(imageUrl: string): Promise<string> {
  // If it's not a Supabase Storage URL, return as-is
  if (!imageUrl.includes('/storage/v1/object/public/')) {
    return imageUrl;
  }

  const path = extractPath(imageUrl);
  if (!path) return imageUrl;

  // Check cache (valid for 50 min out of 60)
  const cached = urlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  // Try public URL first with a quick HEAD check
  try {
    const res = await fetch(imageUrl, { method: 'HEAD' });
    if (res.ok) {
      urlCache.set(path, { url: imageUrl, expiresAt: Date.now() + 50 * 60 * 1000 });
      return imageUrl;
    }
  } catch {
    // Public URL failed — fall through to signed URL
  }

  // Generate a signed URL (1 hour expiry)
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (!error && data?.signedUrl) {
    urlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 50 * 60 * 1000 });
    return data.signedUrl;
  }

  // Last resort: return original
  return imageUrl;
}

// ─── StorageImage Component ──────────────────────────

interface StorageImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Placeholder when no image / loading */
  fallbackClassName?: string;
}

export default function StorageImage({
  src,
  alt = '',
  className = '',
  style,
  fallbackClassName,
}: StorageImageProps) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setResolvedUrl(null);

    getWorkingUrl(src).then((url) => {
      if (!cancelled) setResolvedUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (failed || !resolvedUrl) {
    return (
      <div className={fallbackClassName ?? `${className} bg-gray-100 flex items-center justify-center`}>
        <FileImage className="h-1/3 w-1/3 max-h-6 max-w-6 text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
