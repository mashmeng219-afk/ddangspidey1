import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  ADMIN_EMAIL,
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  deleteStorageImageIfUploaded,
  deleteStorageUrlIfFirebase,
  generateSafeId,
} from '../lib/storage';
import type {
  Character,
  ImageSource,
  LinkItem,
  LinkKind,
  Song,
  StoredImage,
  Video,
  Work,
} from '../types/archive';

function clampString(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function normalizeStoredImage(raw: unknown, legacyUrl?: unknown): StoredImage {
  let rawUrl = '';
  let sourceRaw = '';
  let storagePath = '';
  let width: number | undefined;
  let height: number | undefined;

  if (raw && typeof raw === 'object') {
    const obj = raw as {
      url?: unknown;
      source?: unknown;
      storagePath?: unknown;
      width?: unknown;
      height?: unknown;
    };
    rawUrl = clampString(String(obj.url ?? ''), 1000);
    sourceRaw = String(obj.source ?? '');
    if (typeof obj.storagePath === 'string') {
      storagePath = clampString(obj.storagePath, 500);
    }
    if (typeof obj.width === 'number' && Number.isFinite(obj.width) && obj.width > 0) {
      width = Math.round(obj.width);
    }
    if (typeof obj.height === 'number' && Number.isFinite(obj.height) && obj.height > 0) {
      height = Math.round(obj.height);
    }
  } else {
    rawUrl = clampString(String(legacyUrl ?? ''), 1000);
  }

  // Never allow base64 data URLs or blob URLs in Firestore
  const isForbiddenScheme =
    rawUrl.startsWith('data:') || rawUrl.startsWith('blob:');
  const url = isForbiddenScheme ? '' : rawUrl;
  const source: ImageSource | '' =
    sourceRaw === 'upload' || sourceRaw === 'link' ? sourceRaw : url ? 'link' : '';

  if (!url) {
    return { url: '', source: '' };
  }

  if (source === 'link') {
    return { url, source: 'link' };
  }

  const result: StoredImage = { url, source };
  if (storagePath) result.storagePath = storagePath;
  if (width) result.width = width;
  if (height) result.height = height;
  return result;
}

export function useArchiveData() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [works, setWorks] = useState<Work[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Global Auth listener — sets isAdmin immediately when user.email === ADMIN_EMAIL
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      if (nextUser.email !== ADMIN_EMAIL) {
        setUser(null);
        setIsAdmin(false);
        setAuthError('권한 없음');
        setAuthReady(true);
        await signOut(auth);
        return;
      }

      setUser(nextUser);
      setIsAdmin(true);
      setAuthError(null);
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  // Firestore real-time subscriptions
  useEffect(() => {
    const loaded = {
      works: false,
      characters: false,
      videos: false,
      songs: false,
      links: false,
    };

    const markLoaded = (key: keyof typeof loaded) => {
      loaded[key] = true;
      if (Object.values(loaded).every(Boolean)) {
        setLoading(false);
      }
    };

    const unsubWorks = onSnapshot(
      query(collection(db, 'works'), orderBy('order', 'asc')),
      (snap) => {
        setWorks(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title ?? ''),
              description: String(data.description ?? ''),
              externalUrl: String(data.externalUrl ?? ''),
              order: Number(data.order ?? 0),
              ownerId: String(data.ownerId ?? ''),
            };
          }),
        );
        markLoaded('works');
      },
      (error) => {
        markLoaded('works');
        handleFirestoreError(error, OperationType.LIST, 'works');
      },
    );

    const unsubCharacters = onSnapshot(
      query(collection(db, 'characters'), orderBy('order', 'asc')),
      (snap) => {
        setCharacters(
          snap.docs.map((d) => {
            const data = d.data();
            const galleryList: StoredImage[] = Array.isArray(data.gallery)
              ? data.gallery
                  .map((item: unknown) => normalizeStoredImage(item))
                  .filter((img: StoredImage) => Boolean(img.url))
              : Array.isArray(data.galleryUrls)
                ? data.galleryUrls
                    .map((u: unknown) => normalizeStoredImage(null, u))
                    .filter((img: StoredImage) => Boolean(img.url))
                : [];

            const coverImage = normalizeStoredImage(data.coverImage, data.coverImageUrl);
            const heroImage = data.heroImage
              ? normalizeStoredImage(data.heroImage)
              : coverImage;

            return {
              id: d.id,
              name: String(data.name ?? ''),
              workId: String(data.workId ?? ''),
              coverImage,
              heroImage,
              tagline: String(data.tagline ?? ''),
              introduction: String(data.introduction ?? ''),
              crackUrl: String(data.crackUrl ?? ''),
              caveduckUrl: String(data.caveduckUrl ?? ''),
              relatedUrl: String(data.relatedUrl ?? ''),
              infoItems: Array.isArray(data.infoItems)
                ? data.infoItems.map((item: { label?: unknown; value?: unknown }) => ({
                    label: String(item?.label ?? ''),
                    value: String(item?.value ?? ''),
                  }))
                : [],
              gallery: galleryList,
              relatedWorkLinks: Array.isArray(data.relatedWorkLinks)
                ? data.relatedWorkLinks.map((item: { label?: unknown; url?: unknown }) => ({
                    label: String(item?.label ?? ''),
                    url: String(item?.url ?? ''),
                  }))
                : [],
              prompts: Array.isArray(data.prompts)
                ? data.prompts.map((item: { label?: unknown; version?: unknown; text?: unknown }) => ({
                    label: String(item?.label ?? ''),
                    version: String(item?.version ?? ''),
                    text: String(item?.text ?? ''),
                  }))
                : [],
              order: Number(data.order ?? 0),
              ownerId: String(data.ownerId ?? ''),
            };
          }),
        );
        markLoaded('characters');
      },
      (error) => {
        markLoaded('characters');
        handleFirestoreError(error, OperationType.LIST, 'characters');
      },
    );

    const unsubVideos = onSnapshot(
      query(collection(db, 'videos'), orderBy('order', 'asc')),
      (snap) => {
        setVideos(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title ?? ''),
              youtubeUrl: String(data.youtubeUrl ?? ''),
              youtubeId: String(data.youtubeId ?? ''),
              description: String(data.description ?? ''),
              characterIds: Array.isArray(data.characterIds)
                ? data.characterIds.map((id: unknown) => String(id ?? '')).filter(Boolean)
                : [],
              workId: String(data.workId ?? ''),
              order: Number(data.order ?? 0),
              ownerId: String(data.ownerId ?? ''),
            };
          }),
        );
        markLoaded('videos');
      },
      (error) => {
        markLoaded('videos');
        handleFirestoreError(error, OperationType.LIST, 'videos');
      },
    );

    const unsubSongs = onSnapshot(
      query(collection(db, 'songs'), orderBy('order', 'asc')),
      (snap) => {
        setSongs(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title ?? ''),
              artist: String(data.artist ?? ''),
              coverImage: normalizeStoredImage(data.coverImage, data.coverImageUrl),
              audioUrl: String(data.audioUrl ?? ''),
              lyrics: String(data.lyrics ?? ''),
              characterIds: Array.isArray(data.characterIds)
                ? data.characterIds.map((id: unknown) => String(id ?? '')).filter(Boolean)
                : [],
              workId: String(data.workId ?? ''),
              order: Number(data.order ?? 0),
              ownerId: String(data.ownerId ?? ''),
            };
          }),
        );
        markLoaded('songs');
      },
      (error) => {
        markLoaded('songs');
        handleFirestoreError(error, OperationType.LIST, 'songs');
      },
    );

    const unsubLinks = onSnapshot(
      query(collection(db, 'links'), orderBy('order', 'asc')),
      (snap) => {
        setLinks(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              kind: (data.kind as LinkKind) || 'custom',
              label: String(data.label ?? ''),
              url: String(data.url ?? ''),
              image: normalizeStoredImage(data.image, data.imageUrl),
              order: Number(data.order ?? 0),
              ownerId: String(data.ownerId ?? ''),
            };
          }),
        );
        markLoaded('links');
      },
      (error) => {
        markLoaded('links');
        handleFirestoreError(error, OperationType.LIST, 'links');
      },
    );

    return () => {
      unsubWorks();
      unsubCharacters();
      unsubVideos();
      unsubSongs();
      unsubLinks();
    };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email !== ADMIN_EMAIL) {
        await signOut(auth);
        setUser(null);
        setIsAdmin(false);
        setAuthError('권한 없음');
      } else {
        setUser(result.user);
        setIsAdmin(true);
        setAuthError(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '로그인 오류';
      if (!message.includes('popup-closed-by-user')) {
        setAuthError(message);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    setUser(null);
    setIsAdmin(false);
    await signOut(auth);
  }, []);

  // --- CRUD Operations ---
  const saveWork = useCallback(
    async (payload: { id?: string; title: string; description: string; externalUrl: string; order?: number }) => {
      if (!auth.currentUser) throw new Error('권한 없음');
      const title = clampString(payload.title, 120);
      if (!title) throw new Error('작품 이름 입력 필요');
      const docId = payload.id || generateSafeId('work');
      const path = `works/${docId}`;

      try {
        if (payload.id) {
          await updateDoc(doc(db, 'works', docId), {
            title,
            description: clampString(payload.description, 1000),
            externalUrl: clampString(payload.externalUrl, 500),
            order: payload.order ?? 0,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'works', docId), {
            title,
            description: clampString(payload.description, 1000),
            externalUrl: clampString(payload.externalUrl, 500),
            order: payload.order ?? works.length,
            ownerId: auth.currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, payload.id ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    },
    [works.length],
  );

  const removeWork = useCallback(
    async (workId: string) => {
      if (!auth.currentUser) throw new Error('권한 없음');
      try {
        // Detach characters, videos, songs (keep them as "작품 미지정")
        const linkedChars = characters.filter((c) => c.workId === workId);
        await Promise.all(
          linkedChars.map((c) =>
            updateDoc(doc(db, 'characters', c.id), { workId: '', updatedAt: serverTimestamp() }),
          ),
        );
        const linkedVideos = videos.filter((v) => v.workId === workId);
        await Promise.all(
          linkedVideos.map((v) =>
            updateDoc(doc(db, 'videos', v.id), { workId: '', updatedAt: serverTimestamp() }),
          ),
        );
        const linkedSongs = songs.filter((s) => s.workId === workId);
        await Promise.all(
          linkedSongs.map((s) =>
            updateDoc(doc(db, 'songs', s.id), { workId: '', updatedAt: serverTimestamp() }),
          ),
        );
        await deleteDoc(doc(db, 'works', workId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `works/${workId}`);
      }
    },
    [characters, videos, songs],
  );

  const saveCharacter = useCallback(
    async (
      payload: Omit<Character, 'id' | 'ownerId'> & { id?: string },
      linkedSongIds?: string[],
    ) => {
      if (!auth.currentUser) throw new Error('권한 없음');
      const name = clampString(payload.name, 120);
      if (!name) throw new Error('캐릭터 이름 입력 필요');
      const docId = payload.id || generateSafeId('char');
      const existsInDb = Boolean(payload.id && characters.some((c) => c.id === payload.id));
      const path = `characters/${docId}`;

      const cleanData = {
        name,
        workId: clampString(payload.workId, 128),
        coverImage: normalizeStoredImage(payload.coverImage),
        heroImage: normalizeStoredImage(payload.heroImage),
        tagline: clampString(payload.tagline, 300),
        introduction: payload.introduction.trim().slice(0, 10000),
        crackUrl: clampString(payload.crackUrl, 500),
        caveduckUrl: clampString(payload.caveduckUrl, 500),
        relatedUrl: clampString(payload.relatedUrl, 500),
        infoItems: payload.infoItems
          .slice(0, 30)
          .map((item) => ({
            label: clampString(item.label, 80),
            value: clampString(item.value, 300),
          }))
          .filter((item) => item.label || item.value),
        gallery: payload.gallery
          .slice(0, 30)
          .map((img) => normalizeStoredImage(img))
          .filter((img) => Boolean(img.url)),
        relatedWorkLinks: payload.relatedWorkLinks
          .slice(0, 20)
          .map((item) => ({
            label: clampString(item.label, 120),
            url: clampString(item.url, 500),
          }))
          .filter((item) => item.label || item.url),
        prompts: (payload.prompts || [])
          .slice(0, 30)
          .map((item) => ({
            label: clampString(item.label, 80),
            version: clampString(item.version, 40),
            text: item.text.trim().slice(0, 5000),
          }))
          .filter((item) => item.label || item.text),
        order: payload.order ?? characters.length,
      };

      try {
        if (existsInDb) {
          await updateDoc(doc(db, 'characters', docId), {
            ...cleanData,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'characters', docId), {
            ...cleanData,
            ownerId: auth.currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        // Synchronize linked songs if provided
        if (linkedSongIds) {
          const selectedSet = new Set(linkedSongIds);
          const updates = songs
            .map((song) => {
              const currentlyLinked = song.characterIds.includes(docId);
              const shouldBeLinked = selectedSet.has(song.id);
              if (currentlyLinked === shouldBeLinked) return null;
              const nextIds = shouldBeLinked
                ? [...song.characterIds, docId].slice(0, 30)
                : song.characterIds.filter((id) => id !== docId);
              return updateDoc(doc(db, 'songs', song.id), {
                characterIds: nextIds,
                updatedAt: serverTimestamp(),
              });
            })
            .filter(Boolean);
          await Promise.all(updates);
        }
      } catch (error) {
        handleFirestoreError(error, existsInDb ? OperationType.UPDATE : OperationType.CREATE, path);
      }
      return docId;
    },
    [characters, songs],
  );

  const removeCharacter = useCallback(
    async (characterId: string) => {
      if (!auth.currentUser) throw new Error('권한 없음');
      const target = characters.find((c) => c.id === characterId);
      try {
        await deleteDoc(doc(db, 'characters', characterId));
        if (target) {
          await deleteStorageImageIfUploaded(target.coverImage);
          if (target.heroImage.url && target.heroImage.url !== target.coverImage.url) {
            await deleteStorageImageIfUploaded(target.heroImage);
          }
          await Promise.all(
            target.gallery.map((img) => deleteStorageImageIfUploaded(img)),
          );
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `characters/${characterId}`);
      }
    },
    [characters],
  );

  const saveVideo = useCallback(
    async (payload: Omit<Video, 'id' | 'ownerId'> & { id?: string }) => {
      if (!auth.currentUser) throw new Error('권한 없음');
      const title = clampString(payload.title, 160);
      const youtubeId = clampString(payload.youtubeId, 40);
      if (!title || !youtubeId) throw new Error('영상 제목과 유튜브 링크 입력 필요');
      const docId = payload.id || generateSafeId('video');
      const path = `videos/${docId}`;

      const cleanData = {
        title,
        youtubeUrl: clampString(payload.youtubeUrl, 500),
        youtubeId,
        description: clampString(payload.description, 1000),
        characterIds: (payload.characterIds || []).slice(0, 30).filter(Boolean),
        workId: clampString(payload.workId, 128),
        order: payload.order ?? videos.length,
      };

      try {
        if (payload.id) {
          await updateDoc(doc(db, 'videos', docId), {
            ...cleanData,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'videos', docId), {
            ...cleanData,
            ownerId: auth.currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, payload.id ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    },
    [videos.length],
  );

  const removeVideo = useCallback(async (videoId: string) => {
    if (!auth.currentUser) throw new Error('권한 없음');
    try {
      await deleteDoc(doc(db, 'videos', videoId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `videos/${videoId}`);
    }
  }, []);

  const saveSong = useCallback(
    async (payload: Omit<Song, 'id' | 'ownerId'> & { id?: string }) => {
      if (!auth.currentUser) throw new Error('권한 없음');
      const title = clampString(payload.title, 160);
      if (!title) throw new Error('노래 제목 입력 필요');
      const docId = payload.id || generateSafeId('song');
      const existsInDb = Boolean(payload.id && songs.some((s) => s.id === payload.id));
      const path = `songs/${docId}`;

      const cleanData = {
        title,
        artist: clampString(payload.artist, 120),
        coverImage: normalizeStoredImage(payload.coverImage),
        audioUrl: clampString(payload.audioUrl, 1000),
        lyrics: payload.lyrics.trim().slice(0, 15000),
        characterIds: payload.characterIds.slice(0, 30).filter(Boolean),
        workId: clampString(payload.workId, 128),
        order: payload.order ?? songs.length,
      };

      try {
        if (existsInDb) {
          await updateDoc(doc(db, 'songs', docId), {
            ...cleanData,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'songs', docId), {
            ...cleanData,
            ownerId: auth.currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, existsInDb ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    },
    [songs],
  );

  const removeSong = useCallback(
    async (songId: string) => {
      if (!auth.currentUser) throw new Error('권한 없음');
      const target = songs.find((s) => s.id === songId);
      try {
        await deleteDoc(doc(db, 'songs', songId));
        if (target) {
          await deleteStorageImageIfUploaded(target.coverImage);
          await deleteStorageUrlIfFirebase(target.audioUrl);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `songs/${songId}`);
      }
    },
    [songs],
  );

  const upsertLink = useCallback(
    async (payload: {
      id: string;
      kind: LinkKind;
      label: string;
      url: string;
      image: StoredImage;
      order: number;
    }) => {
      if (!auth.currentUser) throw new Error('권한 없음');
      const exists = links.some((l) => l.id === payload.id);
      const path = `links/${payload.id}`;
      const cleanData = {
        kind: payload.kind,
        label: clampString(payload.label, 300),
        url: clampString(payload.url, 500),
        image: normalizeStoredImage(payload.image),
        order: payload.order,
      };

      try {
        if (exists) {
          await updateDoc(doc(db, 'links', payload.id), {
            ...cleanData,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(doc(db, 'links', payload.id), {
            ...cleanData,
            ownerId: auth.currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(error, exists ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    },
    [links],
  );

  return {
    user,
    authReady,
    isAdmin,
    authError,
    setAuthError,
    loading,
    works,
    characters,
    videos,
    songs,
    links,
    loginWithGoogle,
    logout,
    saveWork,
    removeWork,
    saveCharacter,
    removeCharacter,
    saveVideo,
    removeVideo,
    saveSong,
    removeSong,
    upsertLink,
  };
}
