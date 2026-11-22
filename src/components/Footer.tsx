import React from 'react';
import { useArchive } from '../context/ArchiveContext';
import { CrescentMoonIcon } from './MoonMotif';

export function Footer() {
  const { isAdmin } = useArchive();

  return (
    <footer className="w-full bg-[#050810]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-4 text-xs text-slate-500">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-slate-300">
            <CrescentMoonIcon className="w-3.5 h-3.5 text-blue-200/75" />
            <span className="font-semibold text-white">땅거미</span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-en tracking-wide text-slate-400">AI Creator</span>
          </div>
          <p className="en-label text-slate-500">© 2026 PERSONAL ARCHIVE</p>
        </div>

        {isAdmin && (
          <p className="pt-3 border-t border-white/[0.06] text-[11px] text-slate-500">
            Firebase 콘솔 → Firestore Database에서 기존 샘플 문서를 직접 삭제하세요.
          </p>
        )}
      </div>
    </footer>
  );
}
