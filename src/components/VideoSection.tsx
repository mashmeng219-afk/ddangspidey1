import React, { useState } from 'react';
import { Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { useArchive } from '../context/ArchiveContext';
import type { Character, Video, Work } from '../types/archive';
import { getYoutubeEmbedUrl, getYoutubeThumbnailUrl } from '../lib/youtube';
import { ArchiveImage } from './MoonMotif';

interface VideoSectionProps {
  videos: Video[];
  allVideosCount: number;
  works: Work[];
  characters: Character[];
  onAddVideo: () => void;
  onEditVideo: (video: Video) => void;
  onDeleteVideo: (video: Video) => void;
  onSelectCharacter: (characterId: string) => void;
}

export function VideoSection({
  videos,
  allVideosCount,
  works,
  characters,
  onAddVideo,
  onEditVideo,
  onDeleteVideo,
  onSelectCharacter,
}: VideoSectionProps) {
  const { isAdmin } = useArchive();
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const workMap = new Map(works.map((w) => [w.id, w.title]));
  const charMap = new Map(characters.map((c) => [c.id, c]));

  return (
    <section id="videos-section" className="w-full border-b border-white/[0.09]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-8">
        <div className="flex items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="space-y-1.5">
            <p className="en-label text-blue-200/75">VIDEOS</p>
            <h2 className="text-xl sm:text-2xl font-medium text-white tracking-tight">
              영상
            </h2>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={onAddVideo}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs text-white border border-blue-300/40 bg-blue-400/10 hover:bg-blue-400/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>영상 추가</span>
            </button>
          )}
        </div>

        {allVideosCount === 0 ? (
          <div className="border border-white/10 bg-[#0A0F1A]/70 py-14 px-6 text-center space-y-5">
            <p className="text-sm text-slate-400">등록된 영상 없음</p>
            {isAdmin && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onAddVideo}
                  className="inline-flex items-center gap-2 px-5 py-3 text-xs sm:text-sm text-blue-200 border border-dashed border-blue-300/45 bg-blue-400/[0.06] hover:bg-blue-400/[0.12] hover:border-blue-300/70 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ 영상 추가</span>
                </button>
              </div>
            )}
          </div>
        ) : videos.length === 0 ? (
          <div className="border border-white/10 bg-[#0A0F1A]/70 py-14 px-6 text-center text-sm text-slate-400">
            검색 또는 작품 필터에 일치하는 영상이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {videos.map((video) => {
              const isExpanded = activeVideoId === video.id;
              const workTitle = video.workId ? workMap.get(video.workId) : undefined;
              const linkedChars = (video.characterIds || [])
                .map((id) => charMap.get(id))
                .filter((c): c is Character => Boolean(c));

              return (
                <article
                  key={video.id}
                  className="group relative border border-white/10 bg-[#0A0F1A] hover:border-blue-300/40 transition-colors flex flex-col"
                >
                  {isAdmin && (
                    <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditVideo(video);
                        }}
                        aria-label={`${video.title} 수정`}
                        className="p-1.5 bg-[#060911]/85 border border-white/20 text-slate-200 hover:text-white hover:border-blue-300/60 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteVideo(video);
                        }}
                        aria-label={`${video.title} 삭제`}
                        className="p-1.5 bg-[#060911]/85 border border-white/20 text-slate-200 hover:text-rose-300 hover:border-rose-400/60 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="relative aspect-video w-full border-b border-white/[0.08] bg-black overflow-hidden">
                    {isExpanded ? (
                      <>
                        <iframe
                          src={getYoutubeEmbedUrl(video.youtubeId)}
                          title={video.title}
                          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full border-0"
                        />
                        <button
                          type="button"
                          onClick={() => setActiveVideoId(null)}
                          aria-label="플레이어 닫기"
                          className="absolute top-2 left-2 p-1.5 bg-[#060911]/85 border border-white/20 text-slate-200 hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setActiveVideoId(video.id)}
                        aria-label={`${video.title} 재생`}
                        className="relative w-full h-full block cursor-pointer"
                      >
                        <ArchiveImage
                          src={getYoutubeThumbnailUrl(video.youtubeId)}
                          alt={video.title}
                          placeholderLabel="영상 썸네일"
                          className="w-full h-full"
                          imgClassName="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full border border-blue-200/45 bg-[#060911]/80 flex items-center justify-center moon-glow group-hover:scale-105 transition-transform">
                            <Play className="w-4 h-4 text-white ml-0.5" />
                          </div>
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-1.5 flex-1">
                    <h3 className="text-sm font-medium text-white leading-snug line-clamp-2">
                      {video.title}
                    </h3>
                    {(workTitle || video.description) && (
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {workTitle ? `${workTitle}${video.description ? ` · ${video.description}` : ''}` : video.description}
                      </p>
                    )}
                    {linkedChars.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-blue-200/80 pt-1">
                        {linkedChars.map((char, i) => (
                          <React.Fragment key={char.id}>
                            {i > 0 && <span className="text-slate-600" aria-hidden="true">·</span>}
                            <button
                              type="button"
                              onClick={() => onSelectCharacter(char.id)}
                              className="hover:text-white underline-offset-2 hover:underline transition-colors cursor-pointer"
                            >
                              {char.name}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
