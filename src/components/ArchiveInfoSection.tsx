import React from 'react';
import { Pencil } from 'lucide-react';
import { useArchive } from '../context/ArchiveContext';
import type { LinkItem } from '../types/archive';
import { CrescentMoonIcon } from './MoonMotif';

interface ArchiveInfoSectionProps {
  archiveLink?: LinkItem;
  statusMessage?: string | null;
  worksCount: number;
  charactersCount: number;
  onEditArchiveInfo: () => void;
}

export function ArchiveInfoSection({
  archiveLink,
  statusMessage,
  worksCount,
  charactersCount,
  onEditArchiveInfo,
}: ArchiveInfoSectionProps) {
  const { isAdmin } = useArchive();
  const infoText = statusMessage || archiveLink?.label?.trim() || '한 줄 안내 문구 자리';

  return (
    <section className="w-full border-b border-white/[0.09]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2.5 text-blue-200/80">
            <CrescentMoonIcon className="w-4 h-4" />
            <span className="en-label">ARCHIVE</span>
          </div>
          <div className="flex items-center gap-3">
            <p
              className={`text-base sm:text-lg font-normal leading-relaxed ${
                statusMessage ? 'text-rose-300' : 'text-slate-200'
              }`}
            >
              {infoText}
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={onEditArchiveInfo}
                aria-label="안내 문구 편집"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-300 border border-blue-300/25 hover:border-blue-300/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                <span>편집</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-8 sm:gap-12 shrink-0 border-t md:border-t-0 border-white/[0.08] pt-5 md:pt-0">
          <div className="space-y-1">
            <p className="en-label text-slate-400">WORKS</p>
            <p className="text-2xl sm:text-3xl font-light text-white tabular-nums tracking-tight">
              {String(worksCount).padStart(2, '0')}
            </p>
          </div>
          <div className="w-px h-9 bg-white/10" aria-hidden="true" />
          <div className="space-y-1">
            <p className="en-label text-slate-400">CHARACTERS</p>
            <p className="text-2xl sm:text-3xl font-light text-white tabular-nums tracking-tight">
              {String(charactersCount).padStart(2, '0')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
