'use client';

import { useState } from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const SIZE_PX: Record<NonNullable<LogoProps['size']>, number> = {
  sm: 24,
  md: 32,
  lg: 48,
};

const TEXT_CLASS: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
};

/**
 * Reusable FiscalNinja logo component.
 * Renders public/logo.svg when available, falls back to a blue "F" rounded square.
 */
export default function Logo({ size = 'md', showText = false, className = '' }: LogoProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const px = SIZE_PX[size];
  const rounded = size === 'lg' ? 'rounded-xl' : 'rounded-lg';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {imgFailed ? (
        /* Fallback: blue square with "F" letter */
        <div
          className={`${rounded} bg-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0`}
          style={{ width: px, height: px, fontSize: Math.round(px * 0.45) }}
          aria-hidden="true"
        >
          F
        </div>
      ) : (
        <img
          src="/logo.svg"
          alt="FiscalNinja logo"
          width={px}
          height={px}
          className={`${rounded} flex-shrink-0`}
          style={{ objectFit: 'contain' }}
          onError={() => setImgFailed(true)}
        />
      )}

      {showText && (
        <span className={`font-bold ${TEXT_CLASS[size]}`}>FiscalNinja</span>
      )}
    </div>
  );
}
