import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Disc3,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useArchive } from '../context/ArchiveContext';
import { deleteStorageImageIfUploaded } from '../lib/storage';
import type {
  Character,
  CharacterInfoItem,
  CharacterPrompt,
  RelatedWorkLink,
  Song,
  StoredImage,
  Work,
} from '../types/archive';
import { getStoredImageAspectClass, ImageInput } from './ImageInput';
import { ArchiveImage } from './MoonMotif';

interface CharacterDetailProps {
  character: Character | null;
  work?: Work;
  relatedSongs: Song[];
  allSongs: Song[];
  onBack: () => void;
  onEditCharacter: (character: Character) => void;
  onDeleteCharacter: (character: Character) => void;
  onQuickSaveCharacter: (
    character: Character,
    patch: Partial<Omit<Character, 'id' | 'ownerId'>>,
  ) => Promise<void>;
  onQuickSaveLinkedSongs: (characterId: string, nextSongIds: string[]) => Promise<void>;
  onRequestDelete: (label: string, action: () => Promise<void>) => void;
  onNavigateToMusic: (songId?: string) => void;
}

export function CharacterDetail({
  character,
  work,
  relatedSongs,
  allSongs,
  onBack,
  onEditCharacter,
  onDeleteCharacter,
  onQuickSaveCharacter,
  onQuickSaveLinkedSongs,
  onRequestDelete,
  onNavigateToMusic,
}: CharacterDetailProps) {
  const { isAdmin } = useArchive();
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Info table inline state
  const [showInfoAddForm, setShowInfoAddForm] = useState(false);
  const [newInfoKey, setNewInfoKey] = useState('');
  const [newInfoVal, setNewInfoVal] = useState('');
  const [editingInfoIndex, setEditingInfoIndex] = useState<number | null>(null);
  const [editInfoKey, setEditInfoKey] = useState('');
  const [editInfoVal, setEditInfoVal] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // Introduction inline state
  const [editingIntro, setEditingIntro] = useState(false);
  const [introDraft, setIntroDraft] = useState('');
  const [savingIntro, setSavingIntro] = useState(false);

  // Gallery inline state
  const [showGalleryAdd, setShowGalleryAdd] = useState(false);
  const [editingGalleryIndex, setEditingGalleryIndex] = useState<number | null>(null);
  const [galleryDraft, setGalleryDraft] = useState<StoredImage>({ url: '', source: '' });
  const [uploadingGalleryItem, setUploadingGalleryItem] = useState(false);
  const [savingGallery, setSavingGallery] = useState(false);

  // Appearance Prompts inline state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showPromptForm, setShowPromptForm] = useState(false);
  const [editingPromptIndex, setEditingPromptIndex] = useState<number | null>(null);
  const [promptLabel, setPromptLabel] = useState('');
  const [promptVersion, setPromptVersion] = useState('');
  const [promptText, setPromptText] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);

  // Related Work Links inline state
  const [showWorkLinkForm, setShowWorkLinkForm] = useState(false);
  const [editingWorkLinkIndex, setEditingWorkLinkIndex] = useState<number | null>(null);
  const [workLinkLabel, setWorkLinkLabel] = useState('');
  const [workLinkUrl, setWorkLinkUrl] = useState('');
  const [savingWorkLink, setSavingWorkLink] = useState(false);

  // Related Music inline linker state
  const [editingLinkedSongs, setEditingLinkedSongs] = useState(false);
  const [linkedSongDraft, setLinkedSongDraft] = useState<string[]>([]);
  const [savingLinkedSongs, setSavingLinkedSongs] = useState(false);

  if (!character) {
    return (
      <div className="w-full">
        <div className="w-full border-b border-white/[0.09]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-blue-300/80" />
              <span>목록으로 돌아가기</span>
            </button>
          </div>
        </div>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
          <p className="text-sm text-slate-400">등록된 캐릭터 없음</p>
        </div>
      </div>
    );
  }

  const displayWork = work?.title || '작품 미지정';
  const mainImageUrl = character.heroImage?.url || character.coverImage?.url || '';
  const hasInfoItems = character.infoItems.length > 0;
  const hasPrompts = (character.prompts || []).length > 0;
  const hasIntro = Boolean(character.introduction?.trim());
  const hasGallery = character.gallery.length > 0;
  const hasRelatedWorkLinks = Boolean(work?.externalUrl) || character.relatedWorkLinks.length > 0;
  const hasRelatedSongs = relatedSongs.length > 0;

  const showPromptsSection = hasPrompts || isAdmin;
  const showInfoSection = hasInfoItems || isAdmin;
  const showIntroSection = hasIntro || isAdmin;
  const showGallerySection = hasGallery || isAdmin;
  const showRelatedWorksCol = hasRelatedWorkLinks || isAdmin;
  const showRelatedMusicCol = hasRelatedSongs || isAdmin;
  const showRelatedSection = showRelatedWorksCol || showRelatedMusicCol;

  const hasAnyExternalButtons = Boolean(
    character.crackUrl || character.caveduckUrl || character.relatedUrl,
  );

  // --- Prompt Handlers ---
  const handleCopyPrompt = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      window.setTimeout(() => {
        setCopiedIndex((current) => (current === idx ? null : current));
      }, 1800);
    } catch {
      // Clipboard blocked
    }
  };

  const openAddPrompt = () => {
    setEditingPromptIndex(null);
    setPromptLabel('');
    setPromptVersion('');
    setPromptText('');
    setShowPromptForm(true);
  };

  const openEditPrompt = (idx: number, item: CharacterPrompt) => {
    setEditingPromptIndex(idx);
    setPromptLabel(item.label);
    setPromptVersion(item.version);
    setPromptText(item.text);
    setShowPromptForm(true);
  };

  const handleSavePromptBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptLabel.trim() && !promptText.trim()) return;
    setSavingPrompt(true);
    try {
      const current = character.prompts || [];
      const nextBlock: CharacterPrompt = {
        label: promptLabel.trim(),
        version: promptVersion.trim(),
        text: promptText.trim(),
      };
      const next =
        editingPromptIndex !== null
          ? current.map((item, i) => (i === editingPromptIndex ? nextBlock : item))
          : [...current, nextBlock];
      await onQuickSaveCharacter(character, { prompts: next });
      setShowPromptForm(false);
      setEditingPromptIndex(null);
      setPromptLabel('');
      setPromptVersion('');
      setPromptText('');
    } finally {
      setSavingPrompt(false);
    }
  };

  const handleDeletePromptBlock = (idx: number, block: CharacterPrompt) => {
    onRequestDelete(block.label || '프롬프트', async () => {
      const next = (character.prompts || []).filter((_, i) => i !== idx);
      await onQuickSaveCharacter(character, { prompts: next });
    });
  };

  // --- Info Table Handlers ---
  const handleAddInfoRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInfoKey.trim() && !newInfoVal.trim()) return;
    setSavingInfo(true);
    try {
      const next: CharacterInfoItem[] = [
        ...character.infoItems,
        { label: newInfoKey.trim(), value: newInfoVal.trim() },
      ];
      await onQuickSaveCharacter(character, { infoItems: next });
      setNewInfoKey('');
      setNewInfoVal('');
      setShowInfoAddForm(false);
    } finally {
      setSavingInfo(false);
    }
  };

  const handleSaveEditInfoRow = async (e: React.FormEvent, idx: number) => {
    e.preventDefault();
    if (!editInfoKey.trim() && !editInfoVal.trim()) return;
    setSavingInfo(true);
    try {
      const next = character.infoItems.map((row, i) =>
        i === idx ? { label: editInfoKey.trim(), value: editInfoVal.trim() } : row,
      );
      await onQuickSaveCharacter(character, { infoItems: next });
      setEditingInfoIndex(null);
    } finally {
      setSavingInfo(false);
    }
  };

  const handleDeleteInfoRow = (idx: number, row: CharacterInfoItem) => {
    onRequestDelete(row.label || '정보 항목', async () => {
      const next = character.infoItems.filter((_, i) => i !== idx);
      await onQuickSaveCharacter(character, { infoItems: next });
    });
  };

  // --- Introduction Handlers ---
  const handleSaveIntro = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingIntro(true);
    try {
      await onQuickSaveCharacter(character, { introduction: introDraft.trim() });
      setEditingIntro(false);
    } finally {
      setSavingIntro(false);
    }
  };

  const handleDeleteIntro = () => {
    onRequestDelete('소개란 내용', async () => {
      await onQuickSaveCharacter(character, { introduction: '' });
      setEditingIntro(false);
    });
  };

  // --- Gallery Handlers ---
  const openAddGallery = () => {
    setEditingGalleryIndex(null);
    setGalleryDraft({ url: '', source: '' });
    setShowGalleryAdd(true);
  };

  const openEditGallery = (idx: number, item: StoredImage) => {
    setShowGalleryAdd(false);
    setEditingGalleryIndex(idx);
    setGalleryDraft(item);
  };

  const handleSaveGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!galleryDraft.url.trim()) return;
    setSavingGallery(true);
    try {
      const current = character.gallery || [];
      if (editingGalleryIndex !== null) {
        const previous = current[editingGalleryIndex];
        const next = current.map((img, i) => (i === editingGalleryIndex ? galleryDraft : img));
        await onQuickSaveCharacter(character, { gallery: next });
        if (previous && previous.url !== galleryDraft.url) {
          await deleteStorageImageIfUploaded(previous);
        }
        setEditingGalleryIndex(null);
      } else {
        const next = [...current, galleryDraft];
        await onQuickSaveCharacter(character, { gallery: next });
        setShowGalleryAdd(false);
      }
      setGalleryDraft({ url: '', source: '' });
    } finally {
      setSavingGallery(false);
    }
  };

  const handleDeleteGalleryItem = (idx: number, item: StoredImage) => {
    onRequestDelete(`갤러리 이미지 ${idx + 1}`, async () => {
      const next = character.gallery.filter((_, i) => i !== idx);
      await onQuickSaveCharacter(character, { gallery: next });
      await deleteStorageImageIfUploaded(item);
    });
  };

  // --- Related Work Link Handlers ---
  const openAddWorkLink = () => {
    setEditingWorkLinkIndex(null);
    setWorkLinkLabel('');
    setWorkLinkUrl('');
    setShowWorkLinkForm(true);
  };

  const openEditWorkLink = (idx: number, row: RelatedWorkLink) => {
    setEditingWorkLinkIndex(idx);
    setWorkLinkLabel(row.label);
    setWorkLinkUrl(row.url);
    setShowWorkLinkForm(true);
  };

  const handleSaveWorkLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workLinkLabel.trim() && !workLinkUrl.trim()) return;
    setSavingWorkLink(true);
    try {
      const current = character.relatedWorkLinks || [];
      const nextItem: RelatedWorkLink = {
        label: workLinkLabel.trim(),
        url: workLinkUrl.trim(),
      };
      const next =
        editingWorkLinkIndex !== null
          ? current.map((item, i) => (i === editingWorkLinkIndex ? nextItem : item))
          : [...current, nextItem];
      await onQuickSaveCharacter(character, { relatedWorkLinks: next });
      setShowWorkLinkForm(false);
      setEditingWorkLinkIndex(null);
      setWorkLinkLabel('');
      setWorkLinkUrl('');
    } finally {
      setSavingWorkLink(false);
    }
  };

  const handleDeleteWorkLink = (idx: number, row: RelatedWorkLink) => {
    onRequestDelete(row.label || row.url || '관련 작품 링크', async () => {
      const next = character.relatedWorkLinks.filter((_, i) => i !== idx);
      await onQuickSaveCharacter(character, { relatedWorkLinks: next });
    });
  };

  // --- Related Songs Handlers ---
  const openSongLinker = () => {
    setLinkedSongDraft(relatedSongs.map((s) => s.id));
    setEditingLinkedSongs(true);
  };

  const toggleSongDraft = (songId: string) => {
    setLinkedSongDraft((prev) =>
      prev.includes(songId) ? prev.filter((id) => id !== songId) : [...prev, songId],
    );
  };

  const handleSaveLinkedSongs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLinkedSongs(true);
    try {
      await onQuickSaveLinkedSongs(character.id, linkedSongDraft);
      setEditingLinkedSongs(false);
    } finally {
      setSavingLinkedSongs(false);
    }
  };

  const handleUnlinkSong = (song: Song) => {
    onRequestDelete(`${song.title} 연결`, async () => {
      const nextIds = relatedSongs.filter((s) => s.id !== song.id).map((s) => s.id);
      await onQuickSaveLinkedSongs(character.id, nextIds);
    });
  };

  return (
    <div className="w-full">
      {/* Top Return Bar */}
      <div className="w-full border-b border-white/[0.09]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-blue-300/80" />
            <span>목록으로 돌아가기</span>
          </button>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onEditCharacter(character)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-200 border border-blue-300/35 hover:bg-blue-400/10 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>수정</span>
              </button>
              <button
                type="button"
                onClick={() => onDeleteCharacter(character)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-300 border border-rose-400/35 hover:bg-rose-400/10 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>삭제</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upper 2-Column Profile */}
      <section className="w-full border-b border-white/[0.09]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left: Representative Image + Action Buttons + Appearance Prompt */}
          <div className="lg:col-span-5 space-y-6">
            <div className="aspect-[13/19] w-full border border-white/12 bg-[#0A0F1A] overflow-hidden moon-glow">
              <ArchiveImage
                src={mainImageUrl}
                alt={character.name}
                placeholderLabel="대표 이미지 (832x1216)"
                className="w-full h-full"
                imgClassName="w-full h-full object-cover"
              />
            </div>

            {(hasAnyExternalButtons || isAdmin) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                {character.crackUrl && (
                  <a
                    href={character.crackUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-between px-4 py-3 text-sm text-white border border-blue-300/45 bg-blue-400/10 hover:bg-blue-400/20 transition-colors"
                  >
                    <span>크랙에서 대화하기</span>
                    <ArrowUpRight className="w-4 h-4 text-blue-200" />
                  </a>
                )}

                {character.caveduckUrl && (
                  <a
                    href={character.caveduckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-between px-4 py-3 text-sm text-white border border-blue-300/35 bg-blue-400/[0.06] hover:bg-blue-400/15 transition-colors"
                  >
                    <span>케이브덕에서 대화하기</span>
                    <ArrowUpRight className="w-4 h-4 text-blue-200" />
                  </a>
                )}

                {character.relatedUrl && (
                  <a
                    href={character.relatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-between px-4 py-3 text-sm text-slate-200 border border-white/15 hover:border-blue-300/45 hover:text-white transition-colors"
                  >
                    <span>관련 링크</span>
                    <ArrowUpRight className="w-4 h-4 text-blue-300/80" />
                  </a>
                )}

                {isAdmin &&
                  (!character.crackUrl || !character.caveduckUrl || !character.relatedUrl) && (
                    <button
                      type="button"
                      onClick={() => onEditCharacter(character)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs text-blue-200 border border-dashed border-blue-300/40 bg-blue-400/[0.04] hover:bg-blue-400/10 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>외부 대화/관련 링크 추가</span>
                    </button>
                  )}
              </div>
            )}

            {/* Appearance Prompt Section */}
            {showPromptsSection && (
              <div className="pt-4 border-t border-white/[0.08] space-y-4">
                <div className="flex items-end justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="en-label text-blue-200/75">APPEARANCE PROMPT</p>
                    <h2 className="text-sm font-medium text-white">외형 프롬프트</h2>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={openAddPrompt}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-200 border border-blue-300/35 hover:bg-blue-400/10 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>항목 추가</span>
                    </button>
                  )}
                </div>

                {hasPrompts ? (
                  <div className="space-y-3">
                    {character.prompts.map((block, idx) => {
                      const isCopied = copiedIndex === idx;
                      return (
                        <div
                          key={`${block.label}-${idx}`}
                          className="border border-white/12 bg-[#0A0F1A]"
                        >
                          <div className="px-3.5 py-2.5 border-b border-white/[0.08] flex items-center justify-between gap-2">
                            <div className="flex items-baseline gap-2 min-w-0">
                              <span className="text-xs font-medium text-slate-200 truncate">
                                {block.label || '프롬프트 라벨'}
                              </span>
                              {block.version && (
                                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                                  {block.version}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isAdmin && (
                                <>
                                  <button
                                    type="button"
                                    disabled={savingPrompt}
                                    onClick={() => openEditPrompt(idx, block)}
                                    aria-label="프롬프트 수정"
                                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingPrompt}
                                    onClick={() => handleDeletePromptBlock(idx, block)}
                                    aria-label="프롬프트 삭제"
                                    className="p-1 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleCopyPrompt(block.text, idx)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] border border-white/15 text-slate-200 hover:border-blue-300/50 hover:text-white transition-colors cursor-pointer"
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3 h-3 text-blue-300" />
                                    <span className="text-blue-200">복사됨</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-slate-400" />
                                    <span>복사</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          <div className="p-3.5 max-h-40 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                            {block.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  isAdmin &&
                  !showPromptForm && (
                    <div className="border border-white/10 bg-[#0A0F1A]/60 p-4 text-center space-y-3">
                      <p className="text-xs text-slate-400">등록된 프롬프트 없음</p>
                      <button
                        type="button"
                        onClick={openAddPrompt}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs text-blue-200 border border-dashed border-blue-300/45 bg-blue-400/[0.06] hover:bg-blue-400/12 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ 항목 추가</span>
                      </button>
                    </div>
                  )
                )}

                {isAdmin && showPromptForm && (
                  <form
                    onSubmit={handleSavePromptBlock}
                    className="border border-blue-300/35 bg-[#0A0F1A] p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-200">
                        {editingPromptIndex !== null ? '프롬프트 수정' : '프롬프트 추가'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPromptForm(false)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={promptLabel}
                        onChange={(e) => setPromptLabel(e.target.value)}
                        placeholder="프롬프트 라벨"
                        className="col-span-2 bg-[#060911] border border-white/12 px-2.5 py-1.5 text-xs text-white focus:border-blue-300/60 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={promptVersion}
                        onChange={(e) => setPromptVersion(e.target.value)}
                        placeholder="버전"
                        className="col-span-1 bg-[#060911] border border-white/12 px-2.5 py-1.5 text-xs text-white focus:border-blue-300/60 focus:outline-none"
                      />
                    </div>
                    <textarea
                      rows={4}
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      placeholder="프롬프트 텍스트"
                      className="w-full bg-[#060911] border border-white/12 px-2.5 py-2 text-xs font-mono text-white focus:border-blue-300/60 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPromptForm(false)}
                        className="px-3 py-1 text-xs text-slate-400 border border-white/12 cursor-pointer"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={savingPrompt || (!promptLabel.trim() && !promptText.trim())}
                        className="px-3 py-1 text-xs text-white border border-blue-300/45 bg-blue-400/15 hover:bg-blue-400/25 disabled:opacity-40 cursor-pointer"
                      >
                        {savingPrompt ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right: Name, Work, Tagline, Key-Value Info Table */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-3 border-b border-white/[0.08] pb-7">
              <p className="text-xs text-blue-200/85 tracking-wide">{displayWork}</p>
              <h1 className="text-2xl sm:text-4xl font-medium text-white tracking-tight text-balance">
                {character.name}
              </h1>
              {character.tagline?.trim() && (
                <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                  {character.tagline}
                </p>
              )}
            </div>

            {showInfoSection && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="en-label text-slate-400">PROFILE TABLE</h2>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowInfoAddForm((prev) => !prev)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-200 border border-blue-300/35 hover:bg-blue-400/10 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>항목 추가</span>
                    </button>
                  )}
                </div>

                {hasInfoItems ? (
                  <div className="border-t border-white/[0.09]">
                    {character.infoItems.map((row, idx) =>
                      editingInfoIndex === idx && isAdmin ? (
                        <form
                          key={`${row.label}-${idx}-edit`}
                          onSubmit={(e) => void handleSaveEditInfoRow(e, idx)}
                          className="grid grid-cols-1 sm:grid-cols-12 gap-2 py-2.5 border-b border-white/[0.08]"
                        >
                          <input
                            type="text"
                            value={editInfoKey}
                            onChange={(e) => setEditInfoKey(e.target.value)}
                            placeholder="항목명"
                            className="sm:col-span-4 bg-[#060911] border border-blue-300/45 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                          />
                          <input
                            type="text"
                            value={editInfoVal}
                            onChange={(e) => setEditInfoVal(e.target.value)}
                            placeholder="내용"
                            className="sm:col-span-5 bg-[#060911] border border-blue-300/45 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                          />
                          <div className="sm:col-span-3 flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingInfoIndex(null)}
                              className="px-2.5 py-1 text-xs text-slate-400 border border-white/15 cursor-pointer"
                            >
                              취소
                            </button>
                            <button
                              type="submit"
                              disabled={savingInfo}
                              className="px-2.5 py-1 text-xs text-white border border-blue-300/50 bg-blue-400/15 cursor-pointer"
                            >
                              저장
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div
                          key={`${row.label}-${idx}`}
                          className="grid grid-cols-12 items-center border-b border-white/[0.08] py-3 text-sm gap-4"
                        >
                          <div className="col-span-4 sm:col-span-3 text-slate-400 font-medium truncate">
                            {row.label || '항목명'}
                          </div>
                          <div
                            className={`${
                              isAdmin ? 'col-span-6 sm:col-span-7' : 'col-span-8 sm:col-span-9'
                            } text-slate-100 break-words`}
                          >
                            {row.value}
                          </div>
                          {isAdmin && (
                            <div className="col-span-2 flex justify-end gap-1">
                              <button
                                type="button"
                                disabled={savingInfo}
                                onClick={() => {
                                  setEditingInfoIndex(idx);
                                  setEditInfoKey(row.label);
                                  setEditInfoVal(row.value);
                                }}
                                aria-label="항목 수정"
                                className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={savingInfo}
                                onClick={() => handleDeleteInfoRow(idx, row)}
                                aria-label="항목 삭제"
                                className="p-1 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  isAdmin &&
                  !showInfoAddForm && (
                    <div className="border border-white/10 bg-[#0A0F1A]/60 py-8 px-4 text-center space-y-3">
                      <p className="text-xs text-slate-400">등록된 정보 없음</p>
                      <button
                        type="button"
                        onClick={() => setShowInfoAddForm(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs text-blue-200 border border-dashed border-blue-300/45 bg-blue-400/[0.06] hover:bg-blue-400/12 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ 항목 추가</span>
                      </button>
                    </div>
                  )
                )}

                {isAdmin && showInfoAddForm && (
                  <form
                    onSubmit={handleAddInfoRow}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border border-blue-300/30 bg-[#0A0F1A] p-3"
                  >
                    <input
                      type="text"
                      value={newInfoKey}
                      onChange={(e) => setNewInfoKey(e.target.value)}
                      placeholder="항목명"
                      className="sm:col-span-4 bg-[#060911] border border-white/12 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-300/60 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={newInfoVal}
                      onChange={(e) => setNewInfoVal(e.target.value)}
                      placeholder="항목 내용"
                      className="sm:col-span-5 bg-[#060911] border border-white/12 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-300/60 focus:outline-none"
                    />
                    <div className="sm:col-span-3 flex gap-1.5 justify-end">
                      <button
                        type="button"
                        onClick={() => setShowInfoAddForm(false)}
                        className="px-3 py-2 text-xs text-slate-400 border border-white/15 cursor-pointer"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={savingInfo || (!newInfoKey.trim() && !newInfoVal.trim())}
                        className="px-3 py-2 text-xs border border-blue-300/45 bg-blue-400/15 text-white hover:bg-blue-400/25 disabled:opacity-40 cursor-pointer"
                      >
                        {savingInfo ? '저장...' : '저장'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Introduction */}
      {showIntroSection && (
        <section className="w-full border-b border-white/[0.09]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-5">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <p className="en-label text-blue-200/75">INTRODUCTION</p>
                <h2 className="text-lg sm:text-xl font-medium text-white">소개</h2>
              </div>

              {isAdmin && hasIntro && !editingIntro && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIntroDraft(character.introduction);
                      setEditingIntro(true);
                    }}
                    aria-label="소개 수정"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-200 border border-blue-300/35 hover:bg-blue-400/10 cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>수정</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteIntro}
                    aria-label="소개 삭제"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-300 border border-rose-400/35 hover:bg-rose-400/10 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>삭제</span>
                  </button>
                </div>
              )}
            </div>

            {editingIntro && isAdmin ? (
              <form onSubmit={handleSaveIntro} className="space-y-3 max-w-3xl">
                <textarea
                  rows={5}
                  value={introDraft}
                  onChange={(e) => setIntroDraft(e.target.value)}
                  placeholder="소개란 문구 영역"
                  className="w-full bg-[#0A0F1A] border border-blue-300/40 px-3.5 py-2.5 text-sm text-white focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingIntro(false)}
                    className="px-4 py-1.5 text-xs text-slate-300 border border-white/15 cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={savingIntro}
                    className="px-4 py-1.5 text-xs text-white border border-blue-300/50 bg-blue-400/15 hover:bg-blue-400/25 disabled:opacity-50 cursor-pointer"
                  >
                    {savingIntro ? '저장 중...' : '저장'}
                  </button>
                </div>
              </form>
            ) : hasIntro ? (
              <div className="max-w-3xl text-sm sm:text-base text-slate-300 leading-7 whitespace-pre-line">
                {character.introduction}
              </div>
            ) : (
              isAdmin && (
                <div className="border border-white/10 bg-[#0A0F1A]/60 py-8 px-4 text-center space-y-3">
                  <p className="text-xs text-slate-400">등록된 소개 없음</p>
                  <button
                    type="button"
                    onClick={() => {
                      setIntroDraft('');
                      setEditingIntro(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs text-blue-200 border border-dashed border-blue-300/45 bg-blue-400/[0.06] hover:bg-blue-400/12 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ 항목 추가</span>
                  </button>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Gallery */}
      {showGallerySection && (
        <section className="w-full border-b border-white/[0.09]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-6">
            <div className="flex items-end justify-between gap-4">
              <div className="space-y-1">
                <p className="en-label text-blue-200/75">GALLERY</p>
                <h2 className="text-lg sm:text-xl font-medium text-white">이미지 모음</h2>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={openAddGallery}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-200 border border-blue-300/35 hover:bg-blue-400/10 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>항목 추가</span>
                </button>
              )}
            </div>

            {isAdmin && (showGalleryAdd || editingGalleryIndex !== null) && (
              <form
                onSubmit={handleSaveGalleryItem}
                className="border border-blue-300/35 bg-[#0A0F1A] p-4 space-y-3 max-w-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-blue-200">
                    {editingGalleryIndex !== null ? '갤러리 이미지 수정' : '갤러리 이미지 추가'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowGalleryAdd(false);
                      setEditingGalleryIndex(null);
                    }}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <ImageInput
                  label="이미지 선택"
                  folder="gallery"
                  docId={character.id}
                  aspectPreset="gallery"
                  value={galleryDraft}
                  onChange={setGalleryDraft}
                  onUploadingChange={setUploadingGalleryItem}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowGalleryAdd(false);
                      setEditingGalleryIndex(null);
                    }}
                    className="px-3 py-1.5 text-xs text-slate-400 border border-white/15 cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={savingGallery || uploadingGalleryItem || !galleryDraft.url}
                    className="px-4 py-1.5 text-xs text-white border border-blue-300/50 bg-blue-400/15 hover:bg-blue-400/25 disabled:opacity-40 cursor-pointer"
                  >
                    {savingGallery ? '저장 중...' : '저장'}
                  </button>
                </div>
              </form>
            )}

            {hasGallery ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 items-start">
                {character.gallery.map((item, idx) => (
                  <div
                    key={`${item.url}-${idx}`}
                    className={`group relative ${getStoredImageAspectClass(item, 'landscape')} border border-white/10 bg-[#0A0F1A] overflow-hidden hover:border-blue-300/45 transition-colors`}
                  >
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(item.url)}
                      className="w-full h-full cursor-pointer"
                    >
                      <ArchiveImage
                        src={item.url}
                        alt={`${character.name} 이미지 ${idx + 1}`}
                        placeholderLabel="갤러리 이미지"
                        className="w-full h-full"
                        imgClassName="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </button>

                    {isAdmin && (
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditGallery(idx, item);
                          }}
                          aria-label={`갤러리 이미지 ${idx + 1} 수정`}
                          className="p-1.5 bg-[#060911]/85 border border-white/20 text-slate-200 hover:text-white cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGalleryItem(idx, item);
                          }}
                          aria-label={`갤러리 이미지 ${idx + 1} 삭제`}
                          className="p-1.5 bg-[#060911]/85 border border-white/20 text-slate-200 hover:text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              isAdmin &&
              !showGalleryAdd && (
                <div className="border border-white/10 bg-[#0A0F1A]/60 py-10 px-4 text-center space-y-3">
                  <p className="text-xs text-slate-400">등록된 이미지 없음</p>
                  <button
                    type="button"
                    onClick={openAddGallery}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs text-blue-200 border border-dashed border-blue-300/45 bg-blue-400/[0.06] hover:bg-blue-400/12 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ 항목 추가</span>
                  </button>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Related Works & Related Music */}
      {showRelatedSection && (
        <section className="w-full border-b border-white/[0.09]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Related Works */}
            {showRelatedWorksCol && (
              <div className="space-y-5">
                <div className="flex items-end justify-between gap-2">
                  <div className="space-y-1">
                    <p className="en-label text-blue-200/75">RELATED WORKS</p>
                    <h2 className="text-lg sm:text-xl font-medium text-white">관련 작품 링크</h2>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={openAddWorkLink}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-200 border border-blue-300/35 hover:bg-blue-400/10 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>항목 추가</span>
                    </button>
                  )}
                </div>

                {isAdmin && showWorkLinkForm && (
                  <form
                    onSubmit={handleSaveWorkLink}
                    className="border border-blue-300/35 bg-[#0A0F1A] p-3.5 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-200">
                        {editingWorkLinkIndex !== null ? '링크 수정' : '링크 추가'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowWorkLinkForm(false)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={workLinkLabel}
                      onChange={(e) => setWorkLinkLabel(e.target.value)}
                      placeholder="링크 제목"
                      className="w-full bg-[#060911] border border-white/12 px-2.5 py-1.5 text-xs text-white focus:border-blue-300/60 focus:outline-none"
                    />
                    <input
                      type="url"
                      value={workLinkUrl}
                      onChange={(e) => setWorkLinkUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-[#060911] border border-white/12 px-2.5 py-1.5 text-xs text-white focus:border-blue-300/60 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowWorkLinkForm(false)}
                        className="px-3 py-1 text-xs text-slate-400 border border-white/12 cursor-pointer"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={savingWorkLink || (!workLinkLabel.trim() && !workLinkUrl.trim())}
                        className="px-3 py-1 text-xs text-white border border-blue-300/45 bg-blue-400/15 disabled:opacity-40 cursor-pointer"
                      >
                        {savingWorkLink ? '저장...' : '저장'}
                      </button>
                    </div>
                  </form>
                )}

                {hasRelatedWorkLinks ? (
                  <div className="border-t border-white/[0.08]">
                    {work?.externalUrl && (
                      <a
                        href={work.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between py-3.5 border-b border-white/[0.08] text-sm text-slate-200 hover:text-blue-200 transition-colors"
                      >
                        <span>{work.title}</span>
                        <ArrowUpRight className="w-4 h-4 text-blue-300/80" />
                      </a>
                    )}

                    {character.relatedWorkLinks.map((item, idx) => (
                      <div
                        key={`${item.label}-${idx}`}
                        className="flex items-center justify-between gap-2 py-3.5 border-b border-white/[0.08]"
                      >
                        <a
                          href={item.url || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-0 flex items-center justify-between text-sm text-slate-200 hover:text-blue-200 transition-colors"
                        >
                          <span className="truncate">{item.label || item.url}</span>
                          <ArrowUpRight className="w-4 h-4 text-blue-300/80 shrink-0" />
                        </a>
                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0 pl-2">
                            <button
                              type="button"
                              onClick={() => openEditWorkLink(idx, item)}
                              aria-label="링크 수정"
                              className="p-1 text-slate-400 hover:text-white cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteWorkLink(idx, item)}
                              aria-label="링크 삭제"
                              className="p-1 text-slate-400 hover:text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  isAdmin &&
                  !showWorkLinkForm && (
                    <div className="border border-white/10 bg-[#0A0F1A]/60 py-8 px-4 text-center space-y-3">
                      <p className="text-xs text-slate-400">등록된 링크 없음</p>
                      <button
                        type="button"
                        onClick={openAddWorkLink}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs text-blue-200 border border-dashed border-blue-300/45 bg-blue-400/[0.06] hover:bg-blue-400/12 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ 항목 추가</span>
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            {/* Related Music */}
            {showRelatedMusicCol && (
              <div className="space-y-5">
                <div className="flex items-end justify-between gap-2">
                  <div className="space-y-1">
                    <p className="en-label text-blue-200/75">RELATED MUSIC</p>
                    <h2 className="text-lg sm:text-xl font-medium text-white">관련 음악</h2>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={openSongLinker}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-blue-200 border border-blue-300/35 hover:bg-blue-400/10 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>항목 추가</span>
                    </button>
                  )}
                </div>

                {isAdmin && editingLinkedSongs && (
                  <form
                    onSubmit={handleSaveLinkedSongs}
                    className="border border-blue-300/35 bg-[#0A0F1A] p-3.5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-blue-200">연결할 노래 선택</span>
                      <button
                        type="button"
                        onClick={() => setEditingLinkedSongs(false)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {allSongs.length === 0 ? (
                      <p className="text-xs text-slate-500">등록된 노래 없음</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {allSongs.map((song) => {
                          const selected = linkedSongDraft.includes(song.id);
                          return (
                            <button
                              key={song.id}
                              type="button"
                              onClick={() => toggleSongDraft(song.id)}
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
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingLinkedSongs(false)}
                        className="px-3 py-1 text-xs text-slate-400 border border-white/12 cursor-pointer"
                      >
                        취소
                      </button>
                      <button
                        type="submit"
                        disabled={savingLinkedSongs}
                        className="px-3 py-1 text-xs text-white border border-blue-300/45 bg-blue-400/15 disabled:opacity-40 cursor-pointer"
                      >
                        {savingLinkedSongs ? '저장...' : '저장'}
                      </button>
                    </div>
                  </form>
                )}

                {hasRelatedSongs ? (
                  <div className="border-t border-white/[0.08]">
                    {relatedSongs.map((song) => (
                      <div
                        key={song.id}
                        className="flex items-center justify-between gap-2 py-3.5 border-b border-white/[0.08]"
                      >
                        <button
                          type="button"
                          onClick={() => onNavigateToMusic(song.id)}
                          className="flex-1 min-w-0 flex items-center justify-between text-left text-sm text-slate-200 hover:text-blue-200 transition-colors cursor-pointer"
                        >
                          <span className="inline-flex items-center gap-2.5 truncate">
                            <Disc3 className="w-4 h-4 text-blue-300/80 shrink-0" />
                            <span className="truncate">{song.title}</span>
                          </span>
                          <span className="text-xs text-slate-400 shrink-0">노래 페이지로 이동 →</span>
                        </button>
                        {isAdmin && (
                          <div className="flex items-center gap-1 shrink-0 pl-2">
                            <button
                              type="button"
                              onClick={openSongLinker}
                              aria-label="연결 노래 수정"
                              className="p-1 text-slate-400 hover:text-white cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnlinkSong(song)}
                              aria-label={`${song.title} 연결 해제`}
                              className="p-1 text-slate-400 hover:text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  isAdmin &&
                  !editingLinkedSongs && (
                    <div className="border border-white/10 bg-[#0A0F1A]/60 py-8 px-4 text-center space-y-3">
                      <p className="text-xs text-slate-400">연결된 음악 없음</p>
                      <button
                        type="button"
                        onClick={openSongLinker}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs text-blue-200 border border-dashed border-blue-300/45 bg-blue-400/[0.06] hover:bg-blue-400/12 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ 항목 추가</span>
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Bottom Back Button */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 flex justify-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm text-slate-200 border border-white/15 hover:border-blue-300/50 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-blue-300/80" />
          <span>목록으로 돌아가기</span>
        </button>
      </div>

      {/* Gallery Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            aria-label="이미지 닫기"
            className="absolute top-5 right-5 p-2 text-slate-300 hover:text-white border border-white/20 bg-black/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="확대 이미지"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[85vh] object-contain border border-white/15"
          />
        </div>
      )}
    </div>
  );
}
