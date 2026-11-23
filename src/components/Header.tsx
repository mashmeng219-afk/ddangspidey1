import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LogOut, Pencil } from 'lucide-react';
import { useArchive } from '../context/ArchiveContext';
import type { LinkItem } from '../types/archive';

export type ArchivePage = 'characters' | 'videos' | 'music';

export interface QuickLink {
  label: string;
  url: string;
}

export const QUICK_LINKS: QuickLink[] = [
  { label: '크랙', url: '' },
  { label: '스핀스핀', url: '' },
  { label: '서버상태', url: 'https://rs.igx.kr' },
];

interface HeaderProps {
  activePage: ArchivePage;
  isDetailView: boolean;
  crackLink?: LinkItem;
  spinspinLink?: LinkItem;
  onNavigatePage: (page: ArchivePage) => void;
  onOpenLoginModal: () => void;
  onEditLinks: () => void;
}

function HeaderCrescentIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HeaderFullMoonIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="7.5" fill="currentColor" />
    </svg>
  );
}

export function Header({
  activePage,
  isDetailView,
  crackLink,
  spinspinLink,
  onNavigatePage,
  onOpenLoginModal,
  onEditLinks,
}: HeaderProps) {
  const { user, isAdmin, logout } = useArchive();
  const isSignedIn = Boolean(user);
  const userEmail = user?.email;
  const [linkHint, setLinkHint] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  const dynamicUrlByLabel: Record<string, string> = {
    크랙: crackLink?.url?.trim() || '',
    스핀스핀: spinspinLink?.url?.trim() || '',
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [menuOpen]);

  const handleEmptyExternalClick = (label: string) => {
    if (isAdmin) {
      onEditLinks();
      return;
    }
    setLinkHint(`${label} 링크가 아직 등록되지 않았습니다.`);
    window.setTimeout(() => setLinkHint(null), 2600);
  };

  const navItemClass = (page: ArchivePage) => {
    const isActive = !isDetailView && activePage === page;
    return `text-sm transition-colors whitespace-nowrap shrink-0 py-1 border-b cursor-pointer ${
      isActive
        ? 'text-white border-blue-300/80'
        : 'text-slate-300 border-transparent hover:text-white hover:border-blue-300/60'
    }`;
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/[0.09] bg-[#060911]/90 backdrop-blur-md">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3 sm:gap-4">
        <nav aria-label="주요 섹션" className="flex items-center gap-4 sm:gap-8 shrink-0">
          <button
            type="button"
            onClick={() => onNavigatePage('characters')}
            className={navItemClass('characters')}
          >
            캐릭터
          </button>
          <button
            type="button"
            onClick={() => onNavigatePage('videos')}
            className={navItemClass('videos')}
          >
            영상
          </button>
          <button
            type="button"
            onClick={() => onNavigatePage('music')}
            className={navItemClass('music')}
          >
            노래
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto no-scrollbar min-w-0">
            {QUICK_LINKS.map((item) => {
              const resolvedUrl = dynamicUrlByLabel[item.label] || item.url.trim();
              if (resolvedUrl) {
                return (
                  <a
                    key={item.label}
                    href={resolvedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs text-slate-200 border border-white/15 hover:border-blue-300/50 hover:text-white transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>{item.label}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-blue-300/80" />
                  </a>
                );
              }
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleEmptyExternalClick(item.label)}
                  className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs text-slate-400 border border-white/15 hover:border-blue-300/40 hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-300/60" />
                </button>
              );
            })}
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={onEditLinks}
              aria-label="바로가기 링크 편집"
              className="hidden sm:inline-flex items-center gap-1 px-2 py-1.5 text-xs text-blue-300 hover:text-white border border-blue-300/25 hover:border-blue-300/50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}

          {/* Subtle Moon Auth Icon */}
          <div className="relative shrink-0" ref={menuContainerRef}>
            {isSignedIn ? (
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-label="계정 메뉴"
                aria-expanded={menuOpen}
                className="p-2 text-blue-100/85 hover:text-white transition-all duration-200 hover:drop-shadow-[0_0_8px_rgba(147,197,253,0.75)] cursor-pointer"
              >
                <HeaderFullMoonIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenLoginModal}
                aria-label="로그인"
                className="p-2 text-slate-300/35 hover:text-blue-200 transition-all duration-200 hover:drop-shadow-[0_0_8px_rgba(147,197,253,0.75)] cursor-pointer"
              >
                <HeaderCrescentIcon className="w-4 h-4" />
              </button>
            )}

            {isSignedIn && menuOpen && (
              <div className="absolute right-0 mt-2 w-52 border border-white/15 bg-[#0A0F1A] p-3 space-y-2.5 moon-glow z-40">
                <div className="space-y-0.5 border-b border-white/[0.08] pb-2">
                  <p className="text-[11px] text-blue-200/80">
                    {isAdmin ? '관리자' : '일반 계정'}
                  </p>
                  <p className="text-xs text-slate-300 truncate">{userEmail || '로그인됨'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    void logout();
                  }}
                  className="w-full inline-flex items-center justify-between px-2.5 py-1.5 text-xs text-slate-200 border border-white/12 hover:border-blue-300/45 hover:text-white transition-colors cursor-pointer"
                >
                  <span>로그아웃</span>
                  <LogOut className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {linkHint && (
        <div className="border-t border-white/[0.06] bg-[#0B101B] py-1.5 px-4 text-center text-xs text-blue-200/90">
          {linkHint}
        </div>
      )}
    </header>
  );
}
