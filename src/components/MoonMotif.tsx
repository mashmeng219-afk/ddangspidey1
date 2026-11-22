import React, { useState } from 'react';

export function CrescentMoonIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ArchiveImageProps {
  src?: string;
  alt: string;
  placeholderLabel: string;
  className?: string;
  imgClassName?: string;
}

export function ArchiveImage({
  src,
  alt,
  placeholderLabel,
  className = '',
  imgClassName = 'w-full h-full object-cover',
}: ArchiveImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-gradient-to-b from-[#0E1525] via-[#0A0F1B] to-[#070B14] text-slate-500 select-none overflow-hidden ${className}`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(147,197,253,0.11),transparent_62%)]"
        />
        <CrescentMoonIcon className="w-6 h-6 text-blue-200/40 mb-2 relative z-10" />
        <span className="text-xs text-slate-400/80 tracking-wide px-3 text-center relative z-10">
          {placeholderLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={imgClassName}
    />
  );
}
