import React, { useEffect, useMemo, useState } from 'react';
import { ArchiveInfoSection } from './components/ArchiveInfoSection';
import { CharacterDetail } from './components/CharacterDetail';
import { CharacterGrid } from './components/CharacterGrid';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { type ArchivePage, Header } from './components/Header';
import { MusicSection } from './components/MusicSection';
import { NoticeBar } from './components/NoticeBar';
import { SearchAndFilterBar } from './components/SearchAndFilterBar';
import { VideoSection } from './components/VideoSection';
import {
  CharacterModal,
  ConfirmDeleteModal,
  LoginModal,
  SiteLinksModal,
  SongModal,
  VideoModal,
  WorkFormModal,
} from './components/AdminModals';
import { ArchiveProvider, useArchive } from './context/ArchiveContext';
import type { Character, Song, Video, Work } from './types/archive';

function ArchiveApp() {
  const {
    user,
    isAdmin,
    authError,
    setAuthError,
    works,
    characters,
    videos,
    songs,
    links,
    loginWithGoogle,
    saveWork,
    removeWork,
    saveCharacter,
    removeCharacter,
    saveVideo,
    removeVideo,
    saveSong,
    removeSong,
    upsertLink,
  } = useArchive();

  const [activePage, setActivePage] = useState<ArchivePage>('characters');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkId, setSelectedWorkId] = useState<string>('all');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [highlightedSongId, setHighlightedSongId] = useState<string | null>(null);

  // Admin & Auth modal states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSiteLinksModal, setShowSiteLinksModal] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null | 'new'>(null);
  const [editingCharacter, setEditingCharacter] = useState<Character | null | 'new'>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null | 'new'>(null);
  const [editingSong, setEditingSong] = useState<Song | null | 'new'>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    label: string;
    description?: string;
    action: () => Promise<void>;
  } | null>(null);

  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const notifySuccess = (message: string) => {
    setToast({ kind: 'success', message });
    window.setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 2400);
  };

  const notifyError = (err: unknown) => {
    const message = err instanceof Error ? err.message : '요청 처리 오류';
    setToast({ kind: 'error', message });
    window.setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 3200);
  };

  // Sync URL hash for page & Character Detail back/forward navigation
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#character/')) {
        const id = decodeURIComponent(hash.slice('#character/'.length));
        setSelectedCharacterId(id || null);
        setActivePage('characters');
      } else if (hash === '#videos') {
        setSelectedCharacterId(null);
        setActivePage('videos');
      } else if (hash === '#music') {
        setSelectedCharacterId(null);
        setActivePage('music');
      } else {
        setSelectedCharacterId(null);
        setActivePage('characters');
      }
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const openCharacterDetail = (characterId: string) => {
    setSelectedCharacterId(characterId);
    setActivePage('characters');
    window.location.hash = `character/${encodeURIComponent(characterId)}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeCharacterDetail = () => {
    setSelectedCharacterId(null);
    if (window.location.hash.startsWith('#character/')) {
      window.history.pushState(null, '', window.location.pathname + window.location.search);
    }
  };

  const navigateToPage = (page: ArchivePage) => {
    setSelectedCharacterId(null);
    setActivePage(page);
    if (page === 'characters') {
      if (window.location.hash) {
        window.history.pushState(null, '', window.location.pathname + window.location.search);
      }
    } else {
      window.location.hash = page;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navigateToMusicFromDetail = (songId?: string) => {
    setSelectedCharacterId(null);
    setActivePage('music');
    window.location.hash = 'music';
    if (songId) {
      setHighlightedSongId(songId);
    }
    window.setTimeout(() => {
      if (songId) {
        const targetEl = document.getElementById(`song-${songId}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 80);
  };

  // Lookup well-known links
  const noticeLink = links.find((l) => l.id === 'notice');
  const archiveLink = links.find((l) => l.id === 'archive');
  const crackLink = links.find((l) => l.id === 'crack');
  const spinspinLink = links.find((l) => l.id === 'spinspin');

  const workMap = useMemo(() => new Map(works.map((w) => [w.id, w])), [works]);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredCharacters = useMemo(() => {
    return characters.filter((char) => {
      if (selectedWorkId !== 'all' && char.workId !== selectedWorkId) {
        return false;
      }
      if (!normalizedQuery) return true;
      const workTitle = char.workId ? workMap.get(char.workId)?.title || '' : '';
      const infoText = char.infoItems.map((item) => `${item.label} ${item.value}`).join(' ');
      const haystack = `${char.name} ${workTitle} ${char.tagline} ${char.introduction} ${infoText}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [characters, selectedWorkId, normalizedQuery, workMap]);

  const activeCharacter = selectedCharacterId
    ? characters.find((c) => c.id === selectedCharacterId) || null
    : null;

  const isDetailView = selectedCharacterId !== null;

  return (
    <div className="min-h-screen flex flex-col bg-[#060911] text-slate-100">
      <NoticeBar
        noticeLink={noticeLink}
        onEditNotice={() => setShowSiteLinksModal(true)}
      />

      <Header
        activePage={activePage}
        isDetailView={isDetailView}
        crackLink={crackLink}
        spinspinLink={spinspinLink}
        onNavigatePage={navigateToPage}
        onOpenLoginModal={() => setShowLoginModal(true)}
        onEditLinks={() => setShowSiteLinksModal(true)}
      />

      {authError && (
        <div className="w-full border-b border-rose-400/25 bg-rose-500/10">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4 text-xs text-rose-200">
            <span>{authError}</span>
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="text-rose-200 hover:text-white underline cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 border px-4 py-2.5 text-xs moon-glow bg-[#0A0F1A] transition-opacity flex items-center gap-3 border-blue-300/45 text-blue-100">
          <span className={toast.kind === 'error' ? 'text-rose-300' : 'text-blue-100'}>
            {toast.message}
          </span>
        </div>
      )}

      <main className="flex-1">
        {isDetailView ? (
          <CharacterDetail
            character={activeCharacter}
            work={activeCharacter?.workId ? workMap.get(activeCharacter.workId) : undefined}
            relatedSongs={
              activeCharacter
                ? songs.filter((s) => s.characterIds.includes(activeCharacter.id))
                : []
            }
            allSongs={songs}
            onBack={closeCharacterDetail}
            onEditCharacter={(char) => setEditingCharacter(char)}
            onDeleteCharacter={(char) =>
              setDeleteTarget({
                label: char.name,
                action: async () => {
                  await removeCharacter(char.id);
                  closeCharacterDetail();
                  notifySuccess('삭제됨');
                },
              })
            }
            onQuickSaveCharacter={async (char, patch) => {
              try {
                await saveCharacter({ ...char, ...patch });
                notifySuccess('저장됨');
              } catch (err) {
                notifyError(err);
                throw err;
              }
            }}
            onQuickSaveLinkedSongs={async (characterId, nextSongIds) => {
              const target = characters.find((c) => c.id === characterId);
              if (!target) return;
              try {
                await saveCharacter(target, nextSongIds);
                notifySuccess('저장됨');
              } catch (err) {
                notifyError(err);
                throw err;
              }
            }}
            onRequestDelete={(label, action) =>
              setDeleteTarget({
                label,
                action: async () => {
                  await action();
                  notifySuccess('삭제됨');
                },
              })
            }
            onNavigateToMusic={navigateToMusicFromDetail}
          />
        ) : activePage === 'videos' ? (
          <VideoSection
            videos={videos}
            allVideosCount={videos.length}
            works={works}
            characters={characters}
            onAddVideo={() => setEditingVideo('new')}
            onEditVideo={(video) => setEditingVideo(video)}
            onDeleteVideo={(video) =>
              setDeleteTarget({
                label: video.title,
                action: async () => {
                  await removeVideo(video.id);
                  notifySuccess('삭제됨');
                },
              })
            }
            onSelectCharacter={openCharacterDetail}
          />
        ) : activePage === 'music' ? (
          <MusicSection
            songs={songs}
            allSongsCount={songs.length}
            characters={characters}
            highlightedSongId={highlightedSongId}
            onAddSong={() => setEditingSong('new')}
            onEditSong={(song) => setEditingSong(song)}
            onDeleteSong={(song) =>
              setDeleteTarget({
                label: song.title,
                action: async () => {
                  await removeSong(song.id);
                  notifySuccess('삭제됨');
                },
              })
            }
            onSelectCharacter={openCharacterDetail}
          />
        ) : (
          <>
            <ArchiveInfoSection
              archiveLink={archiveLink}
              statusMessage={authError}
              worksCount={works.length}
              charactersCount={characters.length}
              onEditArchiveInfo={() => setShowSiteLinksModal(true)}
            />

            <SearchAndFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              works={works}
              selectedWorkId={selectedWorkId}
              onSelectWork={setSelectedWorkId}
              onAddWork={() => setEditingWork('new')}
              onEditWork={(work) => setEditingWork(work)}
              onDeleteWork={(work) =>
                setDeleteTarget({
                  label: work.title,
                  description: '소속 캐릭터는 삭제되지 않고 작품 미지정 상태로 변경됩니다.',
                  action: async () => {
                    await removeWork(work.id);
                    if (selectedWorkId === work.id) {
                      setSelectedWorkId('all');
                    }
                    notifySuccess('삭제됨');
                  },
                })
              }
            />

            <CharacterGrid
              characters={filteredCharacters}
              allCharactersCount={characters.length}
              works={works}
              onSelectCharacter={openCharacterDetail}
              onAddCharacter={() => setEditingCharacter('new')}
              onEditCharacter={(char) => setEditingCharacter(char)}
              onDeleteCharacter={(char) =>
                setDeleteTarget({
                  label: char.name,
                  action: async () => {
                    await removeCharacter(char.id);
                    notifySuccess('삭제됨');
                  },
                })
              }
              onResetFilters={() => {
                setSearchQuery('');
                setSelectedWorkId('all');
              }}
            />
          </>
        )}
      </main>

      <Footer />

      {/* Login Modal */}
      {showLoginModal && !user && (
        <LoginModal
          onGoogleLogin={loginWithGoogle}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {/* Admin Modals */}
      {isAdmin && showSiteLinksModal && (
        <SiteLinksModal
          noticeLink={noticeLink}
          archiveLink={archiveLink}
          crackLink={crackLink}
          spinspinLink={spinspinLink}
          onClose={() => setShowSiteLinksModal(false)}
          onSave={async (payload) => {
            await upsertLink({
              id: 'notice',
              kind: 'notice',
              label: payload.noticeLabel,
              url: payload.noticeUrl,
              image: payload.logoImage,
              order: 0,
            });
            await upsertLink({
              id: 'archive',
              kind: 'archive',
              label: payload.archiveLabel,
              url: '',
              image: { url: '', source: '' },
              order: 1,
            });
            await upsertLink({
              id: 'crack',
              kind: 'header',
              label: '크랙',
              url: payload.crackUrl,
              image: { url: '', source: '' },
              order: 2,
            });
            await upsertLink({
              id: 'spinspin',
              kind: 'header',
              label: '스핀스핀',
              url: payload.spinspinUrl,
              image: { url: '', source: '' },
              order: 3,
            });
            notifySuccess('저장됨');
          }}
        />
      )}

      {isAdmin && editingWork !== null && (
        <WorkFormModal
          initial={editingWork === 'new' ? null : editingWork}
          nextOrder={works.length}
          onSave={async (payload) => {
            await saveWork(payload);
            notifySuccess('저장됨');
          }}
          onClose={() => setEditingWork(null)}
        />
      )}

      {isAdmin && editingCharacter !== null && (
        <CharacterModal
          initial={editingCharacter === 'new' ? null : editingCharacter}
          works={works}
          songs={songs}
          onSave={async (payload, linkedSongIds) => {
            await saveCharacter(payload, linkedSongIds);
            notifySuccess('저장됨');
          }}
          onClose={() => setEditingCharacter(null)}
        />
      )}

      {isAdmin && editingVideo !== null && (
        <VideoModal
          initial={editingVideo === 'new' ? null : editingVideo}
          works={works}
          characters={characters}
          onSave={async (payload) => {
            await saveVideo(payload);
            notifySuccess('저장됨');
          }}
          onDelete={
            editingVideo !== 'new'
              ? () => {
                  const target = editingVideo;
                  setEditingVideo(null);
                  setDeleteTarget({
                    label: target.title,
                    action: async () => {
                      await removeVideo(target.id);
                      notifySuccess('삭제됨');
                    },
                  });
                }
              : undefined
          }
          onClose={() => setEditingVideo(null)}
        />
      )}

      {isAdmin && editingSong !== null && (
        <SongModal
          initial={editingSong === 'new' ? null : editingSong}
          works={works}
          characters={characters}
          onSave={async (payload) => {
            await saveSong(payload);
            notifySuccess('저장됨');
          }}
          onDelete={
            editingSong !== 'new'
              ? () => {
                  const target = editingSong;
                  setEditingSong(null);
                  setDeleteTarget({
                    label: target.title,
                    action: async () => {
                      await removeSong(target.id);
                      notifySuccess('삭제됨');
                    },
                  });
                }
              : undefined
          }
          onClose={() => setEditingSong(null)}
        />
      )}

      {isAdmin && deleteTarget && (
        <ConfirmDeleteModal
          targetLabel={deleteTarget.label}
          description={deleteTarget.description}
          onConfirm={deleteTarget.action}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ArchiveProvider>
        <ArchiveApp />
      </ArchiveProvider>
    </ErrorBoundary>
  );
}
