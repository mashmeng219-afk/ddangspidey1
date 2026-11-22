import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Link as LinkIcon,
  Move,
  RotateCcw,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from 'lucide-react';
import type { StoredImage } from '../types/archive';
import {
  cropAndResizeImageToBlob,
  getImageNaturalSize,
  isGifFile,
  LANDSCAPE_SPEC,
  PORTRAIT_SPEC,
  type StorageImageCategory,
  uploadArchiveImageWithProgress,
  validateImageFile,
} from '../lib/storage';

export type ImageAspectPreset = 'portrait' | 'landscape' | 'gallery' | 'square';

interface PendingCropItem {
  file: File;
  previewUrl: string;
  natW: number;
  natH: number;
  orientation: 'landscape' | 'portrait' | 'square';
}

function getTargetDimensions(
  preset: ImageAspectPreset,
  orientation: 'landscape' | 'portrait' | 'square',
): { width: number; height: number; aspectClass: string; label: string } {
  if (preset === 'portrait' || (preset === 'gallery' && orientation === 'portrait')) {
    return {
      width: PORTRAIT_SPEC.width,
      height: PORTRAIT_SPEC.height,
      aspectClass: 'aspect-[13/19]',
      label: '832x1216',
    };
  }
  if (preset === 'landscape' || (preset === 'gallery' && orientation === 'landscape')) {
    return {
      width: LANDSCAPE_SPEC.width,
      height: LANDSCAPE_SPEC.height,
      aspectClass: 'aspect-[19/13]',
      label: '1216x832',
    };
  }
  return {
    width: 1024,
    height: 1024,
    aspectClass: 'aspect-square',
    label: '1:1',
  };
}

function getRecommendationText(preset: ImageAspectPreset): string {
  if (preset === 'portrait') return '권장 크기 832x1216';
  if (preset === 'landscape') return '권장 크기 1216x832';
  if (preset === 'gallery') return '권장 크기 1216x832 / 832x1216';
  return '정사각형 비율';
}

export function getStoredImageAspectClass(
  image: Pick<StoredImage, 'width' | 'height'>,
  fallback: 'portrait' | 'landscape' | 'square' = 'landscape',
): string {
  if (image.width && image.height) {
    if (image.width === image.height) return 'aspect-square';
    return image.height > image.width ? 'aspect-[13/19]' : 'aspect-[19/13]';
  }
  if (fallback === 'portrait') return 'aspect-[13/19]';
  if (fallback === 'square') return 'aspect-square';
  return 'aspect-[19/13]';
}

interface BaseImageTabProps {
  folder: StorageImageCategory;
  docId: string;
  aspectPreset: ImageAspectPreset;
  onAddImage: (image: StoredImage) => void;
  multiple?: boolean;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
}

function ImageTabSelector({
  folder,
  docId,
  aspectPreset,
  onAddImage,
  multiple = false,
  onUploadStart,
  onUploadEnd,
}: BaseImageTabProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Crop preview state
  const [cropQueue, setCropQueue] = useState<PendingCropItem[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const cropBoxRef = useRef<HTMLDivElement | null>(null);
  const dragPanRef = useRef<{
    active: boolean;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
  }>({ active: false, startClientX: 0, startClientY: 0, startPanX: 0, startPanY: 0 });

  // Image link state
  const [linkInput, setLinkInput] = useState('');
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [linkOrientation, setLinkOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [linkError, setLinkError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Cleanup any leftover object URLs on unmount
  const queueRef = useRef<PendingCropItem[]>([]);
  queueRef.current = cropQueue;
  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, []);

  const currentCrop = cropQueue[0] || null;

  const resetCropControls = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  const handleCancelCropQueue = () => {
    cropQueue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setCropQueue([]);
    resetCropControls();
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = multiple ? Array.from(fileList) : [fileList[0]];

    setUploadError(null);

    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setUploadError(validationError);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    const gifFiles = files.filter((f) => isGifFile(f));
    const staticFiles = files.filter((f) => !isGifFile(f));

    // Upload GIFs directly without resizing so animation is preserved
    if (gifFiles.length > 0) {
      setUploading(true);
      setProgress(0);
      onUploadStart?.();
      try {
        for (let i = 0; i < gifFiles.length; i += 1) {
          const gif = gifFiles[i];
          const size = await getImageNaturalSize(gif).catch(() => ({ width: 0, height: 0 }));
          const uploaded = await uploadArchiveImageWithProgress(
            gif,
            {
              category: folder,
              docId,
              fileName: gif.name,
              width: size.width || undefined,
              height: size.height || undefined,
              contentType: 'image/gif',
            },
            (pct) => {
              const aggregate = Math.round(((i + pct / 100) / gifFiles.length) * 100);
              setProgress(aggregate);
            },
          );
          onAddImage(uploaded);
        }
        setProgress(100);
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : '업로드 오류');
      } finally {
        setUploading(false);
        onUploadEnd?.();
      }
    }

    // Queue non-GIF files for Crop + Resize Preview
    if (staticFiles.length > 0) {
      try {
        const items: PendingCropItem[] = await Promise.all(
          staticFiles.map(async (file) => {
            const { width: natW, height: natH } = await getImageNaturalSize(file);
            const orientation: 'landscape' | 'portrait' | 'square' =
              aspectPreset === 'portrait'
                ? 'portrait'
                : aspectPreset === 'landscape'
                  ? 'landscape'
                  : aspectPreset === 'square'
                    ? 'square'
                    : natH > natW
                      ? 'portrait'
                      : 'landscape';
            return {
              file,
              previewUrl: URL.createObjectURL(file),
              natW,
              natH,
              orientation,
            };
          }),
        );
        setCropQueue((prev) => [...prev, ...items]);
        resetCropControls();
      } catch {
        setUploadError('업로드 오류');
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadCroppedItem = async (
    item: PendingCropItem,
    cropParams: { zoom: number; panX: number; panY: number },
    onProgressPct: (pct: number) => void,
  ) => {
    const target = getTargetDimensions(aspectPreset, item.orientation);
    const { blob, width, height, fileName, contentType } = await cropAndResizeImageToBlob(
      item.file,
      target.width,
      target.height,
      cropParams,
    );
    return uploadArchiveImageWithProgress(
      blob,
      {
        category: folder,
        docId,
        fileName,
        width,
        height,
        contentType,
      },
      onProgressPct,
    );
  };

  const handleConfirmCurrentCrop = async () => {
    if (!currentCrop) return;
    setUploading(true);
    setProgress(0);
    setUploadError(null);
    onUploadStart?.();
    try {
      const uploaded = await uploadCroppedItem(
        currentCrop,
        { zoom, panX, panY },
        setProgress,
      );
      onAddImage(uploaded);
      URL.revokeObjectURL(currentCrop.previewUrl);
      setCropQueue((prev) => prev.slice(1));
      resetCropControls();
      setProgress(100);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '업로드 오류');
    } finally {
      setUploading(false);
      onUploadEnd?.();
    }
  };

  const handleUploadAllCenterCropped = async () => {
    if (cropQueue.length === 0) return;
    setUploading(true);
    setProgress(0);
    setUploadError(null);
    onUploadStart?.();
    const items = [...cropQueue];
    try {
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        const params = i === 0 ? { zoom, panX, panY } : { zoom: 1, panX: 0, panY: 0 };
        const uploaded = await uploadCroppedItem(item, params, (pct) => {
          const aggregate = Math.round(((i + pct / 100) / items.length) * 100);
          setProgress(aggregate);
        });
        onAddImage(uploaded);
        URL.revokeObjectURL(item.previewUrl);
      }
      setCropQueue([]);
      resetCropControls();
      setProgress(100);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '업로드 오류');
    } finally {
      setUploading(false);
      onUploadEnd?.();
    }
  };

  // Interactive crop preview geometry matching Canvas crop math
  const targetMeta = currentCrop
    ? getTargetDimensions(aspectPreset, currentCrop.orientation)
    : getTargetDimensions(aspectPreset, aspectPreset === 'portrait' ? 'portrait' : 'landscape');

  const computeImageStylePct = () => {
    if (!currentCrop) return { wPct: 100, hPct: 100 };
    const aspectImg = currentCrop.natW / (currentCrop.natH || 1);
    const aspectTarget = targetMeta.width / targetMeta.height;
    let wPct = 100;
    let hPct = 100;
    if (aspectImg >= aspectTarget) {
      hPct = 100 * zoom;
      wPct = (aspectImg / aspectTarget) * 100 * zoom;
    } else {
      wPct = 100 * zoom;
      hPct = (aspectTarget / aspectImg) * 100 * zoom;
    }
    return { wPct, hPct };
  };

  const { wPct, hPct } = computeImageStylePct();
  const leftPct = -((wPct - 100) / 2) + panX * ((wPct - 100) / 2);
  const topPct = -((hPct - 100) / 2) + panY * ((hPct - 100) / 2);

  const handleCropPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!currentCrop || uploading) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragPanRef.current = {
      active: true,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPanX: panX,
      startPanY: panY,
    };
  };

  const handleCropPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragPanRef.current.active || !cropBoxRef.current) return;
    const rect = cropBoxRef.current.getBoundingClientRect();
    const dx = e.clientX - dragPanRef.current.startClientX;
    const dy = e.clientY - dragPanRef.current.startClientY;

    const maxShiftPxX = ((wPct - 100) / 200) * rect.width;
    const maxShiftPxY = ((hPct - 100) / 200) * rect.height;

    if (maxShiftPxX > 0.5) {
      const nextX = dragPanRef.current.startPanX + dx / maxShiftPxX;
      setPanX(Math.max(-1, Math.min(1, nextX)));
    }
    if (maxShiftPxY > 0.5) {
      const nextY = dragPanRef.current.startPanY + dy / maxShiftPxY;
      setPanY(Math.max(-1, Math.min(1, nextY)));
    }
  };

  const handleCropPointerUp = () => {
    dragPanRef.current.active = false;
  };

  // Image link handlers
  const handleLinkChange = (value: string) => {
    setLinkInput(value);
    setLinkError(null);
    const trimmed = value.trim();
    if (!trimmed) {
      setPreviewState('idle');
      return;
    }
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      setPreviewState('error');
      setLinkError('이미지 링크 형식 오류');
      return;
    }
    try {
      const parsed = new URL(trimmed);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setPreviewState('error');
        setLinkError('이미지 링크 형식 오류');
        return;
      }
      setPreviewState('loading');
    } catch {
      setPreviewState('error');
      setLinkError('이미지 링크 형식 오류');
    }
  };

  const handleConfirmLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed) {
      setLinkError('이미지 링크 입력 필요');
      return;
    }
    if (previewState === 'error') {
      setLinkError('이미지 불러오기 실패 오류');
      return;
    }
    // Link images must save ONLY { url, source: 'link' } without storagePath
    onAddImage({ url: trimmed, source: 'link' });
    setLinkInput('');
    setPreviewState('idle');
    setLinkError(null);
  };

  const linkPreviewAspectClass =
    aspectPreset === 'portrait'
      ? 'aspect-[13/19]'
      : aspectPreset === 'landscape'
        ? 'aspect-[19/13]'
        : aspectPreset === 'square'
          ? 'aspect-square'
          : linkOrientation === 'portrait'
            ? 'aspect-[13/19]'
            : 'aspect-[19/13]';

  return (
    <div className="border border-white/12 bg-[#060911]">
      {/* Tabs */}
      <div className="grid grid-cols-2 border-b border-white/[0.08]">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`py-2 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-blue-400/12 text-white border-b border-blue-300/70'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>파일 업로드</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('link')}
          className={`py-2 text-xs flex items-center justify-center gap-1.5 transition-colors border-l border-white/[0.08] cursor-pointer ${
            activeTab === 'link'
              ? 'bg-blue-400/12 text-white border-b border-blue-300/70'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>이미지 링크</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="p-3.5 space-y-3">
        {activeTab === 'upload' ? (
          <>
            {currentCrop ? (
              <div className="border border-blue-300/35 bg-[#0A0F1A] p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs text-blue-200">
                      크롭 위치 조절 ({targetMeta.label})
                      {cropQueue.length > 1 ? ` · 대기 ${cropQueue.length}장` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Move className="w-3 h-3" />
                      <span>드래그하여 위치 이동 · 확대/축소 후 확인</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleCancelCropQueue}
                    aria-label="크롭 취소"
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {aspectPreset === 'gallery' && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCropQueue((prev) =>
                          prev.map((item, idx) =>
                            idx === 0 ? { ...item, orientation: 'landscape' } : item,
                          ),
                        );
                        resetCropControls();
                      }}
                      className={`px-2.5 py-1 text-[11px] border cursor-pointer ${
                        currentCrop.orientation === 'landscape'
                          ? 'border-blue-300/60 bg-blue-400/15 text-white'
                          : 'border-white/15 text-slate-400'
                      }`}
                    >
                      가로형 1216x832
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCropQueue((prev) =>
                          prev.map((item, idx) =>
                            idx === 0 ? { ...item, orientation: 'portrait' } : item,
                          ),
                        );
                        resetCropControls();
                      }}
                      className={`px-2.5 py-1 text-[11px] border cursor-pointer ${
                        currentCrop.orientation === 'portrait'
                          ? 'border-blue-300/60 bg-blue-400/15 text-white'
                          : 'border-white/15 text-slate-400'
                      }`}
                    >
                      세로형 832x1216
                    </button>
                  </div>
                )}

                <div className="flex justify-center bg-[#060911] border border-white/10 p-3">
                  <div
                    ref={cropBoxRef}
                    onPointerDown={handleCropPointerDown}
                    onPointerMove={handleCropPointerMove}
                    onPointerUp={handleCropPointerUp}
                    onPointerCancel={handleCropPointerUp}
                    className={`relative w-full ${
                      currentCrop.orientation === 'portrait' ? 'max-w-[220px]' : 'max-w-[340px]'
                    } ${targetMeta.aspectClass} border border-blue-300/50 overflow-hidden bg-black select-none touch-none cursor-grab active:cursor-grabbing`}
                  >
                    <img
                      src={currentCrop.previewUrl}
                      alt="크롭 미리보기"
                      draggable={false}
                      style={{
                        position: 'absolute',
                        width: `${wPct}%`,
                        height: `${hPct}%`,
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        maxWidth: 'none',
                        maxHeight: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-3">
                  <ZoomIn className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.05}
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    aria-label="확대/축소"
                    className="flex-1 accent-blue-300 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-300 tabular-nums w-10 text-right">
                    {zoom.toFixed(2)}x
                  </span>
                  <button
                    type="button"
                    onClick={resetCropControls}
                    aria-label="크롭 위치 초기화"
                    className="p-1 text-slate-400 hover:text-white border border-white/12 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={handleCancelCropQueue}
                    className="px-3 py-1.5 text-xs text-slate-300 border border-white/15 hover:text-white cursor-pointer"
                  >
                    취소
                  </button>
                  {cropQueue.length > 1 && (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => void handleUploadAllCenterCropped()}
                      className="px-3 py-1.5 text-xs text-blue-100 border border-blue-300/35 bg-blue-400/10 hover:bg-blue-400/20 disabled:opacity-50 cursor-pointer"
                    >
                      전체 자동 크롭 업로드 ({cropQueue.length}장)
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => void handleConfirmCurrentCrop()}
                    className="inline-flex items-center gap-1 px-4 py-1.5 text-xs text-white border border-blue-300/50 bg-blue-400/20 hover:bg-blue-400/30 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{uploading ? '업로드 중...' : '확인'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  void handleFiles(e.dataTransfer.files);
                }}
                onClick={() => !uploading && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !uploading) {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`border border-dashed py-5 px-4 text-center space-y-1.5 transition-colors cursor-pointer ${
                  dragActive
                    ? 'border-blue-300/70 bg-blue-400/10'
                    : 'border-white/15 hover:border-blue-300/45 bg-[#0A0F1A]/60'
                }`}
              >
                <Upload className="w-4 h-4 text-blue-200/80 mx-auto" />
                <p className="text-xs text-slate-200">
                  {multiple
                    ? '클릭하여 여러 장 선택 또는 드래그 앤 드롭'
                    : '클릭하여 파일 선택 또는 드래그 앤 드롭'}
                </p>
                <p className="text-[11px] text-slate-400">{getRecommendationText(aspectPreset)}</p>
                <p className="text-[11px] text-slate-500">
                  jpg · png · webp · gif / 최대 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple={multiple}
                  onChange={(e) => void handleFiles(e.target.files)}
                  className="hidden"
                />
              </div>
            )}

            {uploading && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-blue-200 tabular-nums">
                  <span>업로드 진행 중</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-blue-300 transition-all duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadError && (
              <p className="text-xs text-rose-300 border border-rose-400/30 bg-rose-400/10 px-3 py-2">
                {uploadError}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] text-slate-400">{getRecommendationText(aspectPreset)}</p>
            <div className="flex gap-2">
              <input
                type="url"
                value={linkInput}
                onChange={(e) => handleLinkChange(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-[#0A0F1A] border border-white/12 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-blue-300/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleConfirmLink}
                disabled={!linkInput.trim() || previewState === 'error'}
                className="inline-flex items-center gap-1 px-3.5 py-2 text-xs text-white border border-blue-300/45 bg-blue-400/15 hover:bg-blue-400/25 disabled:opacity-40 transition-colors shrink-0 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>확인</span>
              </button>
            </div>

            {linkInput.trim() && previewState !== 'error' && (
              <div className="border border-white/10 bg-[#0A0F1A] p-2.5 space-y-2">
                <p className="text-[11px] text-slate-400">링크 미리보기</p>
                <div
                  className={`mx-auto w-full ${
                    linkPreviewAspectClass === 'aspect-[13/19]' ? 'max-w-[160px]' : 'max-w-[260px]'
                  } ${linkPreviewAspectClass} overflow-hidden bg-[#060911] border border-white/10`}
                >
                  <img
                    src={linkInput.trim()}
                    alt="링크 미리보기"
                    referrerPolicy="no-referrer"
                    onLoad={(e) => {
                      const imgEl = e.currentTarget;
                      if (aspectPreset === 'gallery') {
                        setLinkOrientation(
                          imgEl.naturalHeight > imgEl.naturalWidth ? 'portrait' : 'landscape',
                        );
                      }
                      setPreviewState('loaded');
                      setLinkError(null);
                    }}
                    onError={() => {
                      setPreviewState('error');
                      setLinkError('이미지 불러오기 실패 오류');
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {linkError && (
              <p className="text-xs text-rose-300 border border-rose-400/30 bg-rose-400/10 px-3 py-2">
                {linkError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Single Image Input ---
interface ImageInputProps {
  label: string;
  folder: StorageImageCategory;
  docId: string;
  aspectPreset: ImageAspectPreset;
  value: StoredImage;
  onChange: (next: StoredImage) => void;
  onMarkRemoved?: (removed: StoredImage) => void;
  onUploadingChange?: (busy: boolean) => void;
}

export function ImageInput({
  label,
  folder,
  docId,
  aspectPreset,
  value,
  onChange,
  onMarkRemoved,
  onUploadingChange,
}: ImageInputProps) {
  const handleReplace = (next: StoredImage) => {
    if (value.url && (value.storagePath || value.source === 'upload') && value.url !== next.url) {
      onMarkRemoved?.(value);
    }
    onChange(next);
  };

  const handleRemove = () => {
    if (value.url && (value.storagePath || value.source === 'upload')) {
      onMarkRemoved?.(value);
    }
    onChange({ url: '', source: '' });
  };

  const previewFallback =
    aspectPreset === 'portrait'
      ? 'portrait'
      : aspectPreset === 'square'
        ? 'square'
        : 'landscape';
  const thumbAspectClass = getStoredImageAspectClass(value, previewFallback);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs text-slate-300">{label}</label>
        <span className="text-[11px] text-slate-500">{getRecommendationText(aspectPreset)}</span>
      </div>

      {value.url && (
        <div className="flex items-center gap-3 border border-white/12 bg-[#060911] p-2.5">
          <div
            className={`w-16 shrink-0 border border-white/10 bg-[#0A0F1A] overflow-hidden ${thumbAspectClass}`}
          >
            <img
              src={value.url}
              alt={label}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-[11px] text-blue-200/80">
              {value.source === 'upload' ? '업로드 이미지' : '외부 이미지 링크'}
              {value.width && value.height ? ` · ${value.width}x${value.height}` : ''}
            </p>
            <p className="text-xs text-slate-400 truncate">{value.url}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            aria-label="이미지 삭제"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-rose-300 border border-rose-400/30 hover:bg-rose-400/10 transition-colors shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>삭제</span>
          </button>
        </div>
      )}

      <ImageTabSelector
        folder={folder}
        docId={docId}
        aspectPreset={aspectPreset}
        onAddImage={handleReplace}
        onUploadStart={() => onUploadingChange?.(true)}
        onUploadEnd={() => onUploadingChange?.(false)}
      />
    </div>
  );
}

// --- Multi-Image Gallery Input ---
interface GalleryImageInputProps {
  label: string;
  docId: string;
  values: StoredImage[];
  onChange: (next: StoredImage[]) => void;
  onMarkRemoved?: (removed: StoredImage) => void;
  onUploadingChange?: (busy: boolean) => void;
}

export function GalleryImageInput({
  label,
  docId,
  values,
  onChange,
  onMarkRemoved,
  onUploadingChange,
}: GalleryImageInputProps) {
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const handleAppend = (image: StoredImage) => {
    const next = [...valuesRef.current, image];
    valuesRef.current = next;
    onChange(next);
  };

  const handleRemove = (index: number) => {
    const target = values[index];
    if (target?.url && (target.storagePath || target.source === 'upload')) {
      onMarkRemoved?.(target);
    }
    onChange(values.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= values.length) return;
    const next = [...values];
    const [moved] = next.splice(index, 1);
    next.splice(targetIdx, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-300">{label}</label>
          <span className="text-[11px] text-slate-500">권장 크기 1216x832 / 832x1216</span>
        </div>
        <span className="text-[11px] text-slate-500 tabular-nums">{values.length}장</span>
      </div>

      {values.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-start">
          {values.map((item, idx) => (
            <div
              key={`${item.url}-${idx}`}
              className="border border-white/12 bg-[#060911] flex flex-col"
            >
              <div
                className={`${getStoredImageAspectClass(item, 'landscape')} w-full overflow-hidden bg-[#0A0F1A]`}
              >
                <img
                  src={item.url}
                  alt={`갤러리 ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="px-2 py-1.5 flex items-center justify-between gap-1 border-t border-white/[0.08]">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, -1)}
                    aria-label="앞으로 이동"
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === values.length - 1}
                    onClick={() => handleMove(idx, 1)}
                    aria-label="뒤로 이동"
                    className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-[10px] text-slate-500">
                  {item.source === 'upload' ? '업로드' : '링크'}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  aria-label="갤러리 이미지 삭제"
                  className="p-1 text-slate-400 hover:text-rose-300 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImageTabSelector
        folder="gallery"
        docId={docId}
        aspectPreset="gallery"
        multiple
        onAddImage={handleAppend}
        onUploadStart={() => onUploadingChange?.(true)}
        onUploadEnd={() => onUploadingChange?.(false)}
      />
    </div>
  );
}
