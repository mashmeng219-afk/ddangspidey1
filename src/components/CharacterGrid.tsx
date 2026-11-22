import React from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useArchive } from '../context/ArchiveContext';
import type { Character, Work } from '../types/archive';
import { ArchiveImage } from './MoonMotif';

interface CharacterGridProps {
  characters: Character[];
  allCharactersCount: number;
  works: Work[];
  onSelectCharacter: (characterId: string) => void;
  onAddCharacter: () => void;
  onEditCharacter: (character: Character) => void;
  onDeleteCharacter: (character: Character) => void;
  onResetFilters: () => void;
}

export function CharacterGrid({
  characters,
  allCharactersCount,
  works,
  onSelectCharacter,
  onAddCharacter,
  onEditCharacter,
  onDeleteCharacter,
  onResetFilters,
}: CharacterGridProps) {
  const { isAdmin } = useArchive();
  const workMap = new Map(works.map((w) => [w.id, w.title]));

  return (
    <section id="characters-section" className="w-full border-b border-white/[0.09]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-8">
        <div className="flex items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="space-y-1.5">
            <p className="en-label text-blue-200/75">CHARACTERS</p>
            <h2 className="text-xl sm:text-2xl font-medium text-white tracking-tight">
              캐릭터
            </h2>
          </div>
        </div>

        {allCharactersCount === 0 ? (
          <div className="space-y-6">
            <div className="border border-white/10 bg-[#0A0F1A]/70 py-14 px-6 text-center space-y-5">
              <p className="text-sm text-slate-400">등록된 캐릭터 없음</p>
              {isAdmin && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={onAddCharacter}
                    className="inline-flex items-center gap-2 px-5 py-3 text-xs sm:text-sm text-blue-200 border border-dashed border-blue-300/45 bg-blue-400/[0.06] hover:bg-blue-400/[0.12] hover:border-blue-300/70 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ 캐릭터 추가</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : characters.length === 0 ? (
          <div className="space-y-6">
            <div className="border border-white/10 bg-[#0A0F1A]/70 py-14 px-6 text-center space-y-4">
              <p className="text-sm text-slate-400">검색 조건에 일치하는 캐릭터가 없습니다.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="px-4 py-2 text-xs text-blue-200 border border-blue-300/35 hover:bg-blue-400/10 transition-colors cursor-pointer"
                >
                  필터 초기화
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={onAddCharacter}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs text-blue-200 border border-dashed border-blue-300/45 bg-blue-400/[0.06] hover:bg-blue-400/[0.12] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ 캐릭터 추가</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-7">
            {isAdmin && (
              <button
                type="button"
                onClick={onAddCharacter}
                className="group border border-dashed border-blue-300/45 bg-blue-400/[0.04] hover:bg-blue-400/[0.09] hover:border-blue-300/70 transition-all duration-200 flex flex-col cursor-pointer text-left moon-glow-hover"
              >
                <div className="aspect-[13/19] w-full flex flex-col items-center justify-center gap-3 border-b border-white/[0.08] p-4">
                  <div className="w-11 h-11 rounded-full border border-blue-300/45 bg-[#0A0F1A] flex items-center justify-center text-blue-200 group-hover:scale-105 transition-transform">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm text-blue-200">캐릭터 추가</span>
                </div>
                <div className="p-3.5 sm:p-4 space-y-1">
                  <p className="text-sm sm:text-base font-medium text-blue-100 truncate">
                    + 캐릭터 추가
                  </p>
                  <p className="text-xs text-slate-500 truncate">새 프로필 등록</p>
                </div>
              </button>
            )}

            {characters.map((character) => {
              const workTitle = character.workId
                ? workMap.get(character.workId) || '작품 미지정'
                : '작품 미지정';
              const cardImgUrl = character.coverImage?.url || character.heroImage?.url || '';
              return (
                <article
                  key={character.id}
                  className="group relative border border-white/10 bg-[#0A0F1A] hover:border-blue-300/45 transition-all duration-200 moon-glow-hover flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => onSelectCharacter(character.id)}
                    className="text-left flex-1 flex flex-col cursor-pointer"
                  >
                    <div className="aspect-[13/19] w-full overflow-hidden border-b border-white/[0.08]">
                      <ArchiveImage
                        src={cardImgUrl}
                        alt={character.name}
                        placeholderLabel="캐릭터 이미지"
                        className="w-full h-full"
                        imgClassName="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3.5 sm:p-4 space-y-1">
                      <h3 className="text-sm sm:text-base font-medium text-white truncate">
                        {character.name}
                      </h3>
                      <p className="text-xs text-slate-400 truncate">{workTitle}</p>
                    </div>
                  </button>

                  {isAdmin && (
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditCharacter(character);
                        }}
                        aria-label={`${character.name} 수정`}
                        className="p-1.5 bg-[#060911]/85 border border-white/20 text-slate-200 hover:text-white hover:border-blue-300/60 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCharacter(character);
                        }}
                        aria-label={`${character.name} 삭제`}
                        className="p-1.5 bg-[#060911]/85 border border-white/20 text-slate-200 hover:text-rose-300 hover:border-rose-400/60 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
