import React, { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useArchive } from '../context/ArchiveContext';
import type { Work } from '../types/archive';

interface SearchAndFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  works: Work[];
  selectedWorkId: string;
  onSelectWork: (workId: string) => void;
  onAddWork: () => void;
  onEditWork: (work: Work) => void;
  onDeleteWork: (work: Work) => void;
}

export function SearchAndFilterBar({
  searchQuery,
  onSearchChange,
  works,
  selectedWorkId,
  onSelectWork,
  onAddWork,
  onEditWork,
  onDeleteWork,
}: SearchAndFilterBarProps) {
  const { isAdmin } = useArchive();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });
  const longPressTimerRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [menuWorkId, setMenuWorkId] = useState<string | null>(null);

  useEffect(() => {
    if (!menuWorkId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuWorkId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuWorkId]);

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    if (!el || e.pointerType === 'touch') return;
    dragStateRef.current = {
      isDown: true,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = scrollContainerRef.current;
    const state = dragStateRef.current;
    if (!el || !state.isDown) return;
    const delta = e.clientX - state.startX;
    if (Math.abs(delta) > 4) {
      state.moved = true;
      setIsDragging(true);
      clearLongPress();
      el.scrollLeft = state.scrollLeft - delta;
    }
  };

  const handlePointerUpOrLeave = () => {
    dragStateRef.current.isDown = false;
    clearLongPress();
    window.setTimeout(() => {
      setIsDragging(false);
    }, 0);
  };

  const handleChipClick = (workId: string) => {
    if (dragStateRef.current.moved) {
      dragStateRef.current.moved = false;
      return;
    }
    onSelectWork(workId);
  };

  const activeMenuWork = menuWorkId ? works.find((w) => w.id === menuWorkId) || null : null;

  return (
    <section className="w-full border-b border-white/[0.09]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Search Bar */}
        <div className="relative">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="작품 이름, 캐릭터 이름, 키워드 검색"
            aria-label="아카이브 검색"
            className="w-full bg-[#0A0F1A] border border-white/12 focus:border-blue-300/60 focus:outline-none pl-11 pr-10 py-3 text-sm text-white placeholder:text-slate-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="검색어 지우기"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Horizontal Swipe/Drag Filter Bar (Scrollbar Hidden) */}
        <div className="relative space-y-2">
          <div
            ref={scrollContainerRef}
            role="tablist"
            aria-label="작품 필터"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrLeave}
            onPointerLeave={handlePointerUpOrLeave}
            className={`flex items-center gap-2 overflow-x-auto no-scrollbar select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedWorkId === 'all'}
              onClick={() => handleChipClick('all')}
              className={`px-3.5 py-1.5 text-xs transition-colors border whitespace-nowrap shrink-0 cursor-pointer ${
                selectedWorkId === 'all'
                  ? 'border-blue-300/60 bg-blue-400/12 text-white moon-glow'
                  : 'border-white/12 bg-transparent text-slate-400 hover:text-slate-200 hover:border-white/25'
              }`}
            >
              전체
            </button>

            {works.map((work) => {
              const isActive = selectedWorkId === work.id;
              return (
                <div
                  key={work.id}
                  className={`inline-flex items-center border transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'border-blue-300/60 bg-blue-400/12 text-white moon-glow'
                      : 'border-white/12 bg-transparent text-slate-400 hover:text-slate-200 hover:border-white/25'
                  }`}
                  onPointerDown={() => {
                    if (!isAdmin) return;
                    clearLongPress();
                    longPressTimerRef.current = window.setTimeout(() => {
                      setMenuWorkId(work.id);
                    }, 500);
                  }}
                  onPointerUp={clearLongPress}
                  onPointerCancel={clearLongPress}
                  onContextMenu={(e) => {
                    if (!isAdmin) return;
                    e.preventDefault();
                    setMenuWorkId(work.id);
                  }}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleChipClick(work.id)}
                    className="px-3.5 py-1.5 text-xs cursor-pointer"
                  >
                    {work.title}
                  </button>

                  {isAdmin && (
                    <div className="inline-flex items-center pr-1.5 gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuWorkId(null);
                          onEditWork(work);
                        }}
                        aria-label={`${work.title} 수정`}
                        className="p-1 text-slate-400 hover:text-blue-200 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuWorkId(null);
                          onDeleteWork(work);
                        }}
                        aria-label={`${work.title} 삭제`}
                        className="p-1 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isAdmin && (
              <button
                type="button"
                onClick={onAddWork}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs text-blue-200 border border-dashed border-blue-300/45 bg-blue-400/10 hover:bg-blue-400/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>작품 추가</span>
              </button>
            )}
          </div>

          {/* Admin inline work chip long-press menu */}
          {isAdmin && activeMenuWork && (
            <div
              ref={menuRef}
              className="inline-flex items-center gap-2 border border-blue-300/35 bg-[#0A0F1A] px-3 py-2 text-xs moon-glow"
            >
              <span className="text-slate-300 max-w-[160px] truncate">{activeMenuWork.title}</span>
              <span className="text-slate-600" aria-hidden="true">|</span>
              <button
                type="button"
                onClick={() => {
                  const target = activeMenuWork;
                  setMenuWorkId(null);
                  onEditWork(target);
                }}
                className="inline-flex items-center gap-1 text-blue-200 hover:text-white cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                <span>이름 수정</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = activeMenuWork;
                  setMenuWorkId(null);
                  onDeleteWork(target);
                }}
                className="inline-flex items-center gap-1 text-rose-300 hover:text-rose-200 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>삭제</span>
              </button>
              <button
                type="button"
                onClick={() => setMenuWorkId(null)}
                aria-label="메뉴 닫기"
                className="text-slate-500 hover:text-white cursor-pointer ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
