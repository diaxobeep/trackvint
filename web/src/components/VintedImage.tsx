'use client';

import { useState } from 'react';

type Props = {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackText?: string;
};

export function VintedImage({ src, alt, className = '', fallbackText }: Props) {
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-slate-400 text-xs font-semibold ${className}`}
        aria-label={alt}
      >
        {fallbackText || alt.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
