import React, { useState } from 'react';
import { Disc3, Plus, Trash2, Upload, X } from 'lucide-react';
import type {
  Character,
  CharacterInfoItem,
  CharacterPrompt,
  LinkItem,
  RelatedWorkLink,
  Song,
  StoredImage,
  Video,
  Work,
} from '../types/archive';
import {
  deleteStorageImageIfUploaded,
  generateSafeId,
  uploadArchiveAudioWithProgress,
} from '../lib/storage';
import { extractYoutubeId, getYoutubeThumbnailUrl } from '../lib/youtube';
import { GalleryImageInput, ImageInput } from './ImageInput';

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalShell({ title, subtitle, onClose, children }: ModalShellProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-white/15 bg-[#0A0F1A] p-6 sm:p-8 space-y-6 moon-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
          <div className="space-y-1">
            {subtitle && <p className="en-label text-blue-200/80">{subtitle}</p>}
            <h2 className="text-lg font-medium text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1.5 text-slate-400 hover:text-white border border-white/10 hover:border-white/30 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// --- Site Links / Notice / Archive Info Modal ---
interface SiteLinksModalProps {
  noticeLink?: LinkItem;
  archiveLink?: LinkItem;
  crackLink?: LinkItem;
  spinspinLink?: LinkItem;
  onSave: (payload: {
    noticeLabel: string;
    noticeUrl: string;
    logoImage: StoredImage;
    archiveLabel: string;
    crackUrl: string;
    spinspinUrl: string;
  }) => Promise<void>;
  onClose: () => void;
}

export function SiteLinksModal({
  noticeLink,
  archiveLink,
  crackLink,
  spinspinLink,
  onSave,
  onClose,
}: SiteLinksModalProps) {
  const [noticeLabel, setNoticeLabel] = useState(noticeLink?.label || '');
  const [noticeUrl, setNoticeUrl] = useState(noticeLink?.url || '');
  const [logoImage, setLogoImage] = useState<StoredImage>(
    noticeLink?.image || { url: '', source: '' },
  );
  const [removedImages, setRemovedImages] = useState<StoredImage[]>([]);
  const [archiveLabel, setArchiveLabel] = useState(archiveLink?.label || '');
  const [crackUrl, setCrackUrl] = useState(crackLink?.url || '');
  const [spinspinUrl, setSpinspinUrl] = useState(spinspinLink?.url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ noticeLabel, noticeUrl, logoImage, archiveLabel, crackUrl, spinspinUrl });
      await Promise.all(removedImages.map((img) => deleteStorageImageIfUploaded(img)));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패 오류');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="공지 · 안내 · 바로가기 설정" subtitle="ARCHIVE LINKS" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-xs text-rose-300 border border-rose-400/30 bg-rose-400/10 p-3">
            {error}
          </p>
        )}

        <ImageInput
          label="공지 바 로고 이미지"
          folder="logos"
          docId="notice"
          aspectPreset="square"
          value={logoImage}
          onChange={setLogoImage}
          onMarkRemoved={(removed) => setRemovedImages((prev) => [...prev, removed])}
          onUploadingChange={setUploading}
        />

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-300">공지 바 문구</label>
          <input
            type="text"
            value={noticeLabel}
            onChange={(e) => setNoticeLabel(e.target.value)}
            placeholder="공지 바 제목"
            className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-300">공지 바 이동 링크 (선택)</label>
          <input
            type="url"
            value={noticeUrl}
            onChange={(e) => setNoticeUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-300">아카이브 한 줄 안내 문구</label>
          <input
            type="text"
            value={archiveLabel}
            onChange={(e) => setArchiveLabel(e.target.value)}
            placeholder="한 줄 안내 문구 자리"
            className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">크랙 바로가기 URL</label>
            <input
              type="url"
              value={crackUrl}
              onChange={(e) => setCrackUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">스핀스핀 바로가기 URL</label>
            <input
              type="url"
              value={spinspinUrl}
              onChange={(e) => setSpinspinUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-300 border border-white/15 hover:text-white cursor-pointer"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="px-5 py-2 text-xs text-white border border-blue-300/50 bg-blue-400/15 hover:bg-blue-400/25 disabled:opacity-50 cursor-pointer"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// --- Single Work Create / Edit Modal ---
interface WorkFormModalProps {
  initial?: Work | null;
  nextOrder: number;
  onSave: (payload: {
    id?: string;
    title: string;
    description: string;
    externalUrl: string;
    order?: number;
  }) => Promise<void>;
  onClose: () => void;
}

export function WorkFormModal({ initial, nextOrder, onSave, onClose }: WorkFormModalProps) {
  const [title, setTitle] = useState(initial?.title || '');
  const [externalUrl, setExternalUrl] = useState(initial?.externalUrl || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('작품 이름 입력 필요');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: initial?.id,
        title,
        description: initial?.description || '',
        externalUrl,
        order: initial ? initial.order : nextOrder,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패 오류');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={initial ? '작품 수정' : '작품 추가'}
      subtitle="WORK"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-xs text-rose-300 border border-rose-400/30 bg-rose-400/10 p-3">
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-300">작품 이름 *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="작품 이름"
            className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-300">작품 링크 (선택)</label>
          <input
            type="url"
            value={externalUrl}
            onChange={(e) => setExternalUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-300 border border-white/15 hover:text-white cursor-pointer"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-xs text-white border border-blue-300/50 bg-blue-400/15 hover:bg-blue-400/25 disabled:opacity-50 cursor-pointer"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// --- Character Form Modal ---
interface CharacterModalProps {
  initial?: Character | null;
  works: Work[];
  songs: Song[];
  onSave: (
    payload: Omit<Character, 'id' | 'ownerId'> & { id?: string },
    linkedSongIds: string[],
  ) => Promise<void>;
  onClose: () => void;
}

export function CharacterModal({
  initial,
  works,
  songs,
  onSave,
  onClose,
}: CharacterModalProps) {
  const [docId] = useState(() => initial?.id || generateSafeId('char'));
  const [name, setName] = useState(initial?.name || '');
  const [workId, setWorkId] = useState(initial?.workId || '');
  const [coverImage, setCoverImage] = useState<StoredImage>(
    initial?.coverImage || { url: '', source: '' },
  );
  const [heroImage, setHeroImage] = useState<StoredImage>(
    initial?.heroImage || initial?.coverImage || { url: '', source: '' },
  );
  const [tagline, setTagline] = useState(initial?.tagline || '');
  const [introduction, setIntroduction] = useState(initial?.introduction || '');
  const [crackUrl, setCrackUrl] = useState(initial?.crackUrl || '');
  const [caveduckUrl, setCaveduckUrl] = useState(initial?.caveduckUrl || '');
  const [relatedUrl, setRelatedUrl] = useState(initial?.relatedUrl || '');
  const [infoItems, setInfoItems] = useState<CharacterInfoItem[]>(
    initial?.infoItems?.length ? initial.infoItems : [{ label: '', value: '' }],
  );
  const [gallery, setGallery] = useState<StoredImage[]>(initial?.gallery || []);
  const [removedImages, setRemovedImages] = useState<StoredImage[]>([]);
  const [relatedWorkLinks, setRelatedWorkLinks] = useState<RelatedWorkLink[]>(
    initial?.relatedWorkLinks || [],
  );
  const [prompts, setPrompts] = useState<CharacterPrompt[]>(initial?.prompts || []);
  const [linkedSongIds, setLinkedSongIds] = useState<string[]>(() =>
    initial ? songs.filter((s) => s.characterIds.includes(initial.id)).map((s) => s.id) : [],
  );

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAnyUploading = uploadingCover || uploadingHero || uploadingGallery;

  const toggleSong = (songId: string) => {
    setLinkedSongIds((prev) =>
      prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('캐릭터 이름 입력 필요');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const effectiveCover = coverImage.url ? coverImage : heroImage;
      const effectiveHero = heroImage.url ? heroImage : coverImage;
      await onSave(
        {
          id: docId,
          name,
          workId,
          coverImage: effectiveCover,
          heroImage: effectiveHero,
          tagline,
          introduction,
          crackUrl,
          caveduckUrl,
          relatedUrl,
          infoItems,
          gallery,
          relatedWorkLinks,
          prompts,
          order: initial?.order ?? 0,
        },
        linkedSongIds,
      );
      await Promise.all(removedImages.map((img) => deleteStorageImageIfUploaded(img)));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패 오류');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={initial ? '캐릭터 수정' : '캐릭터 추가'}
      subtitle="CHARACTER"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-xs text-rose-300 border border-rose-400/30 bg-rose-400/10 p-3">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">캐릭터 이름 *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="캐릭터 이름"
              className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">소속 작품</label>
            <select
              value={workId}
              onChange={(e) => setWorkId(e.target.value)}
              className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
            >
              <option value="">작품 미지정</option>
              {works.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-300">한 줄 소개</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="한 줄 소개 문구 자리"
            className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
          />
        </div>

        <ImageInput
          label="커버 이미지 (목록 카드)"
          folder="characters"
          docId={docId}
          aspectPreset="portrait"
          value={coverImage}
          onChange={setCoverImage}
          onMarkRemoved={(removed) => setRemovedImages((prev) => [...prev, removed])}
          onUploadingChange={setUploadingCover}
        />

        <ImageInput
          label="대표 이미지 (상세 페이지)"
          folder="characters"
          docId={docId}
          aspectPreset="portrait"
          value={heroImage}
          onChange={setHeroImage}
          onMarkRemoved={(removed) => setRemovedImages((prev) => [...prev, removed])}
          onUploadingChange={setUploadingHero}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">크랙 대화 링크</label>
            <input
              type="url"
              value={crackUrl}
              onChange={(e) => setCrackUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">케이브덕 링크</label>
            <input
              type="url"
              value={caveduckUrl}
              onChange={(e) => setCaveduckUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">기타 관련 링크</label>
            <input
              type="url"
              value={relatedUrl}
              onChange={(e) => setRelatedUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
            />
          </div>
        </div>

        {/* Key-value table */}
        <div className="space-y-2 border-t border-white/[0.08] pt-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-300">정보 표 (항목 - 내용)</label>
            <button
              type="button"
              onClick={() => setInfoItems((prev) => [...prev, { label: '', value: '' }])}
              className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>항목 추가</span>
            </button>
          </div>
          {infoItems.map((item, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={item.label}
                onChange={(e) =>
                  setInfoItems((prev) =>
                    prev.map((row, i) => (i === idx ? { ...row, label: e.target.value } : row)),
                  )
                }
                placeholder="항목명"
                className="w-1/3 bg-[#060911] border border-white/12 px-3 py-1.5 text-xs text-white focus:border-blue-300/60 focus:outline-none"
              />
              <input
                type="text"
                value={item.value}
                onChange={(e) =>
                  setInfoItems((prev) =>
                    prev.map((row, i) => (i === idx ? { ...row, value: e.target.value } : row)),
                  )
                }
                placeholder="내용"
                className="flex-1 bg-[#060911] border border-white/12 px-3 py-1.5 text-xs text-white focus:border-blue-300/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setInfoItems((prev) => prev.filter((_, i) => i !== idx))}
                aria-label="행 삭제"
                className="p-1.5 text-slate-500 hover:text-rose-300 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-300">소개란</label>
          <textarea
            rows={4}
            value={introduction}
            onChange={(e) => setIntroduction(e.target.value)}
            placeholder="소개란 문구 영역"
            className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
          />
        </div>

        {/* Gallery */}
        <div className="border-t border-white/[0.08] pt-3">
          <GalleryImageInput
            label="갤러리 이미지"
            docId={docId}
            values={gallery}
            onChange={setGallery}
            onMarkRemoved={(removed) => setRemovedImages((prev) => [...prev, removed])}
            onUploadingChange={setUploadingGallery}
          />
        </div>

        {/* Appearance Prompts */}
        <div className="space-y-2 border-t border-white/[0.08] pt-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-300">외형 프롬프트</label>
            <button
              type="button"
              onClick={() => setPrompts((prev) => [...prev, { label: '', version: '', text: '' }])}
              className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>프롬프트 추가</span>
            </button>
          </div>
          {prompts.map((item, idx) => (
            <div key={idx} className="space-y-2 border border-white/10 bg-[#060911] p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) =>
                    setPrompts((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, label: e.target.value } : p)),
                    )
                  }
                  placeholder="프롬프트 라벨"
                  className="flex-1 bg-[#0A0F1A] border border-white/12 px-2.5 py-1.5 text-xs text-white focus:border-blue-300/60 focus:outline-none"
                />
                <input
                  type="text"
                  value={item.version}
                  onChange={(e) =>
                    setPrompts((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, version: e.target.value } : p)),
                    )
                  }
                  placeholder="버전"
                  className="w-24 bg-[#0A0F1A] border border-white/12 px-2.5 py-1.5 text-xs text-white focus:border-blue-300/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setPrompts((prev) => prev.filter((_, i) => i !== idx))}
                  aria-label="프롬프트 삭제"
                  className="p-1.5 text-slate-500 hover:text-rose-300 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                rows={3}
                value={item.text}
                onChange={(e) =>
                  setPrompts((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, text: e.target.value } : p)),
                  )
                }
                placeholder="외형 프롬프트 텍스트 영역"
                className="w-full bg-[#0A0F1A] border border-white/12 px-2.5 py-1.5 text-xs font-mono text-white focus:border-blue-300/60 focus:outline-none"
              />
            </div>
          ))}
        </div>

        {/* Related Work Links */}
        <div className="space-y-2 border-t border-white/[0.08] pt-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-300">기타 관련 작품 링크</label>
            <button
              type="button"
              onClick={() => setRelatedWorkLinks((prev) => [...prev, { label: '', url: '' }])}
              className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-white cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>링크 추가</span>
            </button>
          </div>
          {relatedWorkLinks.map((row, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={row.label}
                onChange={(e) =>
                  setRelatedWorkLinks((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)),
                  )
                }
                placeholder="링크 제목"
                className="w-1/3 bg-[#060911] border border-white/12 px-3 py-1.5 text-xs text-white focus:border-blue-300/60 focus:outline-none"
              />
              <input
                type="url"
                value={row.url}
                onChange={(e) =>
                  setRelatedWorkLinks((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, url: e.target.value } : r)),
                  )
                }
                placeholder="https://..."
                className="flex-1 bg-[#060911] border border-white/12 px-3 py-1.5 text-xs text-white focus:border-blue-300/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setRelatedWorkLinks((prev) => prev.filter((_, i) => i !== idx))}
                aria-label="링크 삭제"
                className="p-1.5 text-slate-500 hover:text-rose-300 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Linked Music */}
        <div className="space-y-2 border-t border-white/[0.08] pt-3">
          <label className="block text-xs text-slate-300">관련 음악 연결</label>
          {songs.length === 0 ? (
            <p className="text-xs text-slate-500">등록된 노래가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {songs.map((song) => {
                const selected = linkedSongIds.includes(song.id);
                return (
                  <button
                    key={song.id}
                    type="button"
                    onClick={() => toggleSong(song.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs border transition-colors cursor-pointer ${
                      selected
                        ? 'border-blue-300/60 bg-blue-400/15 text-white'
                        : 'border-white/12 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Disc3 className="w-3 h-3" />
                    <span>{song.title}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-300 border border-white/15 hover:text-white cursor-pointer"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={saving || isAnyUploading}
            className="px-5 py-2 text-xs text-white border border-blue-300/50 bg-blue-400/15 hover:bg-blue-400/25 disabled:opacity-50 cursor-pointer"
          >
            {saving ? '저장 중...' : isAnyUploading ? '업로드 중...' : '저장'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

// --- Video Form Modal ---
interface VideoModalProps {
  initial?: Video | null;
  works: Work[];
  characters: Character[];
  onSave: (payload: Omit<Video, 'id' | 'ownerId'> & { id?: string }) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

export function VideoModal({
  initial,
  works,
  characters,
  onSave,
  onDelete,
  onClose,
}: VideoModalProps) {
  const [title, setTitle] = useState(initial?.title || '');
  const [youtubeUrl, setYoutubeUrl] = useState(initial?.youtubeUrl || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [workId, setWorkId] = useState(initial?.workId || '');
  const [characterIds, setCharacterIds] = useState<string[]>(initial?.characterIds || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedId = extractYoutubeId(youtubeUrl);

  const toggleCharacter = (id: string) => {
    setCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedId) {
      setError('유효한 유튜브 링크 오류');
      return;
    }
    if (!title.trim()) {
      setError('영상 제목 입력 필요');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: initial?.id,
        title,
        youtubeUrl,
        youtubeId: parsedId,
        description,
        characterIds,
        workId,
        order: initial?.order ?? 0,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패 오류');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={initial ? '영상 수정' : '영상 추가'} subtitle="VIDEO" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-xs text-rose-300 border border-rose-400/30 bg-rose-400/10 p-3">
            {error}
          </p>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-300">유튜브 URL *</label>
          <input
            type="text"
            required
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
          />
          {youtubeUrl.trim() && !parsedId && (
            <p className="text-[11px] text-rose-300">유튜브 영상 ID 추출 불가</p>
          )}
        </div>

        {parsedId && (
          <div className="space-y-1.5">
            <p className="text-[11px] text-slate-400 font-mono">ID: {parsedId}</p>
            <div className="aspect-video w-full max-w-sm border border-white/12 overflow-hidden">
              <img
                src={getYoutubeThumbnailUrl(parsedId)}
                alt="유튜브 미리보기"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-300">제목 *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="영상 제목"
            className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-300">소속 작품 (선택)</label>
          <select
            value={workId}
            onChange={(e) => setWorkId(e.target.value)}
            className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
          >
            <option value="">선택 안 함</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </div>

        {characters.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs text-slate-300">연결 캐릭터 (선택)</label>
            <div className="flex flex-wrap gap-2">
              {characters.map((char) => {
                const selected = characterIds.includes(char.id);
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => toggleCharacter(char.id)}
                    className={`px-3 py-1 text-xs border transition-colors cursor-pointer ${
                      selected
                        ? 'border-blue-300/60 bg-blue-400/15 text-white'
                        : 'border-white/12 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {char.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-300">설명 (선택)</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="영상 설명 자리"
            className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.08]">
          <div>
            {initial && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs text-rose-300 border border-rose-400/35 hover:bg-rose-400/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>삭제</span>
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-300 border border-white/15 hover:text-white cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-xs text-white border border-blue-300/50 bg-blue-400/15 hover:bg-blue-400/25 disabled:opacity-50 cursor-pointer"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

// --- Song Form Modal ---
interface SongModalProps {
  initial?: Song | null;
  works: Work[];
  characters: Character[];
  onSave: (payload: Omit<Song, 'id' | 'ownerId'> & { id?: string }) => Promise<void>;
  onDelete?: () => void;
  onClose: () => void;
}

export function SongModal({
  initial,
  works,
  characters,
  onSave,
  onDelete,
  onClose,
}: SongModalProps) {
  const [docId] = useState(() => initial?.id || generateSafeId('song'));
  const [title, setTitle] = useState(initial?.title || '');
  const [artist, setArtist] = useState(initial?.artist || '');
  const [coverImage, setCoverImage] = useState<StoredImage>(
    initial?.coverImage || { url: '', source: '' },
  );
  const [removedImages, setRemovedImages] = useState<StoredImage[]>([]);
  const [audioUrl, setAudioUrl] = useState(initial?.audioUrl || '');
  const [lyrics, setLyrics] = useState(initial?.lyrics || '');
  const [workId, setWorkId] = useState(initial?.workId || '');
  const [characterIds, setCharacterIds] = useState<string[]>(initial?.characterIds || []);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudio(true);
    setAudioProgress(0);
    setError(null);
    try {
      const url = await uploadArchiveAudioWithProgress(file, setAudioProgress);
      setAudioUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 오류');
    } finally {
      setUploadingAudio(false);
      e.target.value = '';
    }
  };

  const toggleCharacter = (id: string) => {
    setCharacterIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('곡 제목 입력 필요');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: docId,
        title,
        artist,
        coverImage,
        audioUrl,
        lyrics,
        characterIds,
        workId,
        order: initial?.order ?? 0,
      });
      await Promise.all(removedImages.map((img) => deleteStorageImageIfUploaded(img)));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 실패 오류');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={initial ? '노래 수정' : '노래 추가'} subtitle="MUSIC" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="text-xs text-rose-300 border border-rose-400/30 bg-rose-400/10 p-3">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">곡 제목 *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="곡 제목"
              className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-300">아티스트 / 크레딧</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="아티스트 자리"
              className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
            />
          </div>
        </div>

        <ImageInput
          label="앨범 커버"
          folder="covers"
          docId={docId}
          aspectPreset="square"
          value={coverImage}
          onChange={setCoverImage}
          onMarkRemoved={(removed) => setRemovedImages((prev) => [...prev, removed])}
          onUploadingChange={setUploadingCover}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-xs text-slate-300">MP3 파일 업로드 또는 URL</label>
            <span className="text-[11px] text-slate-500">최대 25MB · mp3</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
            />
            <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-blue-300/40 bg-blue-400/10 text-blue-100 hover:bg-blue-400/20 cursor-pointer shrink-0">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploadingAudio ? `${audioProgress}%` : 'MP3 업로드'}</span>
              <input type="file" accept="audio/*,.mp3" onChange={handleAudioUpload} className="hidden" />
            </label>
          </div>
          {uploadingAudio && (
            <div className="space-y-1">
              <div className="w-full h-1 bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-blue-300 transition-all duration-150"
                  style={{ width: `${audioProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-blue-200 tabular-nums">업로드 중... {audioProgress}%</p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-300">소속 작품</label>
          <select
            value={workId}
            onChange={(e) => setWorkId(e.target.value)}
            className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
          >
            <option value="">선택 안 함</option>
            {works.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </div>

        {characters.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs text-slate-300">연결 캐릭터</label>
            <div className="flex flex-wrap gap-2">
              {characters.map((char) => {
                const selected = characterIds.includes(char.id);
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => toggleCharacter(char.id)}
                    className={`px-3 py-1 text-xs border transition-colors cursor-pointer ${
                      selected
                        ? 'border-blue-300/60 bg-blue-400/15 text-white'
                        : 'border-white/12 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {char.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-300">가사</label>
          <textarea
            rows={5}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="가사 표시 영역"
            className="w-full bg-[#060911] border border-white/12 px-3 py-2 text-sm text-white focus:border-blue-300/60 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/[0.08]">
          <div>
            {initial && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs text-rose-300 border border-rose-400/35 hover:bg-rose-400/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>삭제</span>
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-slate-300 border border-white/15 hover:text-white cursor-pointer"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving || uploadingCover || uploadingAudio}
              className="px-5 py-2 text-xs text-white border border-blue-300/50 bg-blue-400/15 hover:bg-blue-400/25 disabled:opacity-50 cursor-pointer"
            >
              {saving ? '저장 중...' : uploadingCover || uploadingAudio ? '업로드 중...' : '저장'}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

// --- Confirm Delete Modal ---
interface ConfirmDeleteModalProps {
  targetLabel: string;
  description?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export function ConfirmDeleteModal({
  targetLabel,
  description,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패 오류');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ModalShell title="항목 삭제 확인" subtitle="CONFIRM" onClose={onClose}>
      <div className="space-y-5">
        {error && (
          <p className="text-xs text-rose-300 border border-rose-400/30 bg-rose-400/10 p-3">
            {error}
          </p>
        )}
        <p className="text-sm text-slate-300 leading-relaxed">
          <span className="text-white font-medium">{targetLabel}</span> 항목을 삭제하시겠습니까?{' '}
          {description || '삭제 후에는 복구할 수 없습니다.'}
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-300 border border-white/15 hover:text-white cursor-pointer"
          >
            취소
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void handleConfirm()}
            className="px-4 py-2 text-xs text-rose-100 border border-rose-400/50 bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-50 cursor-pointer"
          >
            {deleting ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

// --- Login Modal ---
interface LoginModalProps {
  onGoogleLogin: () => Promise<void>;
  onClose: () => void;
}

export function LoginModal({ onGoogleLogin, onClose }: LoginModalProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setSubmitting(true);
    try {
      await onGoogleLogin();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell title="관리자 로그인" subtitle="AUTHENTICATION" onClose={onClose}>
      <div className="space-y-5">
        <p className="text-sm text-slate-300 leading-relaxed">
          허용된 Google 관리자 계정으로 로그인하면 아카이브 편집이 가능합니다.
        </p>
        <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-slate-300 border border-white/15 hover:text-white cursor-pointer"
          >
            닫기
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleLogin()}
            className="px-5 py-2 text-xs text-white border border-blue-300/50 bg-blue-400/15 hover:bg-blue-400/25 disabled:opacity-50 cursor-pointer"
          >
            {submitting ? '로그인 중...' : 'Google 계정으로 로그인'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
