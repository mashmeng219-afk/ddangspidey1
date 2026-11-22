import React from 'react';
import { Pencil } from 'lucide-react';
import { useArchive } from '../context/ArchiveContext';
import type { LinkItem } from '../types/archive';
import { ArchiveImage } from './MoonMotif';

interface NoticeBarProps {
  noticeLink?: LinkItem;
  onEditNotice: () => void;
}

export function NoticeBar({ noticeLink, onEditNotice }: NoticeBarProps) {
  const { isAdmin } = useArchive();
  const noticeText = noticeLink?.label?.trim() || '공지 바 제목';
  const noticeUrl = noticeLink?.url?.trim() || '';
  const logoUrl = noticeLink?.image?.url?.trim() || '';

  return (
    <div className="w-full border-b border-white/[0.09] bg-[#070B14] text-slate-200">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-5 h-5 rounded-full overflow-hidden border border-white/15 bg-[#0C1220] flex items-center justify-center shrink-0">
            {logoUrl ? (
              <ArchiveImage
                src={logoUrl}
                alt="땅거미 로고"
                placeholderLabel=""
                className="w-full h-full"
              />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="w-3 h-3 text-blue-200/80">
                <path
                  d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
              </svg>
            )}
          </div>
          <span className="text-xs font-bold tracking-tight text-white whitespace-nowrap">
            땅거미
          </span>
          <span className="text-[11px] text-slate-400 whitespace-nowrap font-en tracking-wide">
            AI Creator
          </span>
          {isAdmin && (
            <span className="text-[11px] text-blue-200 border border-blue-300/40 bg-blue-400/10 px-2 py-0.5 whitespace-nowrap">
              관리자 모드
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 min-w-0">
          {noticeUrl ? (
            <a
              href={noticeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-300 hover:text-blue-200 transition-colors truncate"
            >
              {noticeText}
            </a>
          ) : (
            <p className="text-xs text-slate-400 truncate">{noticeText}</p>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={onEditNotice}
              aria-label="공지 바 편집"
              className="inline-flex items-center gap-1 text-[11px] text-blue-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
              <span>편집</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
