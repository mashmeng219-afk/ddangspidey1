import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { useArchive } from '../context/ArchiveContext';
import type { Character, Song } from '../types/archive';
import { ArchiveImage } from './MoonMotif';

interface MusicSectionProps {
  songs: Song[];
  allSongsCount: number;
  characters: Character[];
  highlightedSongId?: string | null;
  onAddSong: () => void;
  onEditSong: (song: Song) => void;
  onDeleteSong: (song: Song) => void;
  onSelectCharacter: (characterId: string) => void;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function MusicSection({
  songs,
  allSongsCount,
  characters,
  highlightedSongId,
  onAddSong,
  onEditSong,
  onDeleteSong,
  onSelectCharacter,
}: MusicSectionProps) {
  const { isAdmin } = useArchive();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [openLyricsIds, setOpenLyricsIds] = useState<Record<string, boolean>>({});
  const [progressMap, setProgressMap] = useState<Record<string, { current: number; duration: number }>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const characterMap = new Map(characters.map((c) => [c.id, c]));

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setPlayingId(null);
  };

  const handleToggleAlbum = (song: Song) => {
    if (playingId === song.id) {
      stopAudio();
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPlayingId(song.id);

    if (song.audioUrl) {
      const audio = new Audio(song.audioUrl);
      audioRef.current = audio;
      audio.addEventListener('timeupdate', () => {
        setProgressMap((prev) => ({
          ...prev,
          [song.id]: {
            current: audio.currentTime,
            duration: audio.duration || 0,
          },
        }));
      });
      audio.addEventListener('ended', () => {
        setPlayingId((current) => (current === song.id ? null : current));
      });
      void audio.play().catch(() => {
        // Ignore browser autoplay restrictions or missing media gracefully
      });
    }
  };

  const toggleLyrics = (id: string) => {
    setOpenLyricsIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section id="music-section" className="w-full border-b border-white/[0.09]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 space-y-8">
        <div className="flex items-end justify-between gap-4 border-b border-white/[0.08] pb-5">
          <div className="space-y-1.5">
            <p className="en-label text-blue-200/75">MUSIC</p>
            <h2 className="text-xl sm:text-2xl font-medium text-white tracking-tight">
              노래
            </h2>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={onAddSong}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs text-white border border-blue-300/40 bg-blue-400/10 hover:bg-blue-400/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>노래 추가</span>
            </button>
          )}
        </div>

        {allSongsCount === 0 ? (
          <div className="border border-white/10 bg-[#0A0F1A]/70 py-14 px-6 text-center space-y-5">
            <p className="text-sm text-slate-400">등록된 노래 없음</p>
            {isAdmin && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={onAddSong}
                  className="inline-flex items-center gap-2 px-5 py-3 text-xs sm:text-sm text-blue-200 border border-dashed border-blue-300/45 bg-blue-400/[0.06] hover:bg-blue-400/[0.12] hover:border-blue-300/70 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ 노래 추가</span>
                </button>
              </div>
            )}
          </div>
        ) : songs.length === 0 ? (
          <div className="border border-white/10 bg-[#0A0F1A]/70 py-14 px-6 text-center text-sm text-slate-400">
            검색 또는 작품 필터에 일치하는 노래가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {songs.map((song) => {
              const isPlaying = playingId === song.id;
              const isLyricsOpen = Boolean(openLyricsIds[song.id]);
              const isHighlighted = highlightedSongId === song.id;
              const progress = progressMap[song.id];
              const coverImageUrl = song.coverImage?.url || '';
              const linkedCharacters = song.characterIds
                .map((id) => characterMap.get(id))
                .filter((c): c is Character => Boolean(c));

              return (
                <article
                  key={song.id}
                  id={`song-${song.id}`}
                  className={`relative border transition-colors flex flex-col ${
                    isHighlighted || isPlaying
                      ? 'border-blue-300/55 bg-[#0B111F] moon-glow'
                      : 'border-white/10 bg-[#0A0F1A]'
                  }`}
                >
                  {isAdmin && (
                    <div className="absolute top-3 right-3 z-20 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditSong(song);
                        }}
                        aria-label={`${song.title} 수정`}
                        className="p-1.5 bg-[#060911]/85 border border-white/20 text-slate-200 hover:text-white hover:border-blue-300/60 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSong(song);
                        }}
                        aria-label={`${song.title} 삭제`}
                        className="p-1.5 bg-[#060911]/85 border border-white/20 text-slate-200 hover:text-rose-300 hover:border-rose-400/60 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* CD Sleeve + Emerging Disc Stage */}
                  <div className="p-6 pb-4 flex items-center justify-start overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleToggleAlbum(song)}
                      aria-label={isPlaying ? `${song.title} 정지` : `${song.title} 재생`}
                      className="relative w-44 h-44 sm:w-48 sm:h-48 shrink-0 text-left cursor-pointer group focus-visible:outline-none"
                    >
                      {/* Emerging CD Disc */}
                      <div
                        className={`absolute top-2 bottom-2 right-0 aspect-square rounded-full border border-blue-200/35 bg-[radial-gradient(circle_at_center,#0b101b_0%,#0b101b_16%,rgba(147,197,253,0.22)_18%,#162033_34%,#0b111d_54%,rgba(226,232,240,0.2)_72%,#0d1526_100%)] shadow-[0_0_24px_rgba(147,197,253,0.16)] transition-transform duration-500 ease-out flex items-center justify-center ${
                          isPlaying ? 'translate-x-[46%]' : 'translate-x-[12%] group-hover:translate-x-[20%]'
                        }`}
                      >
                        <div
                          className={`w-full h-full rounded-full relative flex items-center justify-center ${
                            isPlaying ? 'cd-spin-active' : ''
                          }`}
                        >
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(147,197,253,0.25)_45deg,transparent_95deg,rgba(255,255,255,0.16)_200deg,transparent_260deg)]"
                          />
                          <div className="w-10 h-10 rounded-full border border-white/25 bg-[#060911] flex items-center justify-center relative z-10">
                            <div className="w-3.5 h-3.5 rounded-full border border-blue-200/40 bg-[#0A0F1A]" />
                          </div>
                        </div>
                      </div>

                      {/* Album Cover Sleeve */}
                      <div className="relative z-10 w-full h-full border border-white/15 bg-[#0D1322] overflow-hidden shadow-2xl">
                        <ArchiveImage
                          src={coverImageUrl}
                          alt={song.title}
                          placeholderLabel="앨범 커버"
                          className="w-full h-full"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-end justify-end p-2.5">
                          <span className="w-8 h-8 rounded-full border border-white/25 bg-[#060911]/85 flex items-center justify-center text-white">
                            {isPlaying ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5 ml-0.5" />
                            )}
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Metadata & Controls */}
                  <div className="px-6 pb-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="min-w-0">
                        <h3 className="text-base font-medium text-white truncate">
                          {song.title}
                        </h3>
                        <p className="text-xs text-slate-400 truncate">
                          {song.artist || '땅거미'}
                          {isPlaying && !song.audioUrl ? ' · 오디오 파일 미등록' : ''}
                        </p>
                      </div>

                      {linkedCharacters.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-blue-200/80 pt-1">
                          {linkedCharacters.map((char, i) => (
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

                    {/* Progress + Lyrics Toggle */}
                    <div className="space-y-3 pt-2 border-t border-white/[0.08]">
                      {song.audioUrl && progress && (
                        <div className="space-y-1">
                          <div className="w-full h-1 bg-white/10 overflow-hidden">
                            <div
                              className="h-full bg-blue-300/80 transition-all duration-150"
                              style={{
                                width:
                                  progress.duration > 0
                                    ? `${Math.min(100, (progress.current / progress.duration) * 100)}%`
                                    : '0%',
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-500 tabular-nums">
                            <span>{formatTime(progress.current)}</span>
                            <span>{formatTime(progress.duration)}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleToggleAlbum(song)}
                          className="text-xs text-blue-200 hover:text-white transition-colors cursor-pointer"
                        >
                          {isPlaying ? '정지하기' : '재생하기'}
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleLyrics(song.id)}
                          className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                        >
                          <span>{isLyricsOpen ? '가사 닫기' : '가사 보기'}</span>
                          {isLyricsOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lyrics Panel */}
                  {isLyricsOpen && (
                    <div className="px-6 py-4 border-t border-white/[0.08] bg-[#070B14] max-h-60 overflow-y-auto">
                      <p className="en-label text-slate-500 mb-2">LYRICS</p>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                        {song.lyrics?.trim() || '등록된 가사가 없습니다.'}
                      </p>
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
