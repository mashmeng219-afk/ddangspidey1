import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import type { ImageSource, StoredImage } from '../types/archive';
import { auth, storage } from './firebase';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25MB

export const LANDSCAPE_SPEC = { width: 1216, height: 832 } as const;
export const PORTRAIT_SPEC = { width: 832, height: 1216 } as const;

export type StorageImageCategory =
  | 'characters'
  | 'gallery'
  | 'covers'
  | 'songs'
  | 'videos'
  | 'logos';

const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export function generateSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`;
}

export function isGifFile(file: File): boolean {
  return file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
}

export function validateImageFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_IMAGE_EXT.some((ext) => lowerName.endsWith(ext));
  const hasAllowedMime = ALLOWED_IMAGE_MIME.has(file.type);

  if (!hasAllowedMime && !hasAllowedExt) {
    return '이미지 형식 오류 (jpg, png, webp, gif만 허용)';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return '파일 크기 초과 오류 (최대 10MB)';
  }
  return null;
}

export function getImageNaturalSize(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const result = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('업로드 오류'));
    };
    img.src = objectUrl;
  });
}

export interface CropParams {
  zoom: number; // >= 1
  panX: number; // -1 to 1
  panY: number; // -1 to 1
}

export function cropAndResizeImageToBlob(
  file: File,
  targetWidth: number,
  targetHeight: number,
  crop: CropParams = { zoom: 1, panX: 0, panY: 0 },
): Promise<{ blob: Blob; width: number; height: number; fileName: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('업로드 오류'));
          return;
        }

        const natW = img.naturalWidth || targetWidth;
        const natH = img.naturalHeight || targetHeight;
        const zoom = Math.max(1, crop.zoom);
        const baseScale = Math.max(targetWidth / natW, targetHeight / natH);
        const scale = baseScale * zoom;

        const drawnW = natW * scale;
        const drawnH = natH * scale;
        const maxPanX = Math.max(0, (drawnW - targetWidth) / 2);
        const maxPanY = Math.max(0, (drawnH - targetHeight) / 2);
        const clampedPanX = Math.max(-1, Math.min(1, crop.panX));
        const clampedPanY = Math.max(-1, Math.min(1, crop.panY));

        const drawX = (targetWidth - drawnW) / 2 + clampedPanX * maxPanX;
        const drawY = (targetHeight - drawnH) / 2 + clampedPanY * maxPanY;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, drawX, drawY, drawnW, drawnH);

        const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'image';

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error('업로드 오류'));
              return;
            }
            resolve({
              blob,
              width: targetWidth,
              height: targetHeight,
              fileName: `${baseName}.webp`,
              contentType: 'image/webp',
            });
          },
          'image/webp',
          0.9,
        );
      } catch {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('업로드 오류'));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('업로드 오류'));
    };
    img.src = objectUrl;
  });
}

export interface UploadImageOptions {
  category: StorageImageCategory;
  docId: string;
  fileName?: string;
  width?: number;
  height?: number;
  contentType?: string;
}

export function uploadArchiveImageWithProgress(
  fileOrBlob: Blob,
  options: UploadImageOptions,
  onProgress?: (percent: number) => void,
): Promise<StoredImage> {
  return new Promise((resolve, reject) => {
    if (!auth.currentUser) {
      reject(new Error('권한 없음'));
      return;
    }

    if (fileOrBlob.size > MAX_IMAGE_BYTES) {
      reject(new Error('파일 크기 초과 오류 (최대 10MB)'));
      return;
    }

    const rawName =
      options.fileName || (fileOrBlob instanceof File ? fileOrBlob.name : 'image.webp');
    const safeName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'image.webp';
    const safeDocId = options.docId.replace(/[^a-zA-Z0-9_-]/g, '_') || 'default';
    const storagePath = `images/${options.category}/${safeDocId}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    const task = uploadBytesResumable(storageRef, fileOrBlob, {
      contentType: options.contentType || fileOrBlob.type || 'image/webp',
    });

    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(percent);
        }
      },
      (error) => {
        if (error.code === 'storage/unauthorized') {
          reject(new Error('권한 없음'));
        } else {
          reject(new Error('업로드 오류'));
        }
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          const result: StoredImage = {
            url,
            storagePath,
            source: 'upload',
            ...(typeof options.width === 'number' && options.width > 0 ? { width: options.width } : {}),
            ...(typeof options.height === 'number' && options.height > 0 ? { height: options.height } : {}),
          };
          resolve(result);
        } catch {
          reject(new Error('업로드 오류'));
        }
      },
    );
  });
}

export function uploadArchiveAudioWithProgress(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!auth.currentUser) {
      reject(new Error('권한 없음'));
      return;
    }

    if (!file.type.startsWith('audio/') && !file.name.toLowerCase().endsWith('.mp3')) {
      reject(new Error('오디오 형식 오류 (mp3 또는 오디오 파일만 허용)'));
      return;
    }
    if (file.size > MAX_AUDIO_BYTES) {
      reject(new Error('파일 크기 초과 오류 (최대 25MB)'));
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `archive/audio/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'audio/mpeg',
    });

    task.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(percent);
        }
      },
      (error) => {
        if (error.code === 'storage/unauthorized') {
          reject(new Error('권한 없음'));
        } else {
          reject(new Error('업로드 오류'));
        }
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch {
          reject(new Error('업로드 오류'));
        }
      },
    );
  });
}

export async function deleteStorageImageIfUploaded(
  urlOrImage: string | StoredImage,
  legacySource?: ImageSource | '',
  legacyStoragePath?: string,
): Promise<void> {
  const url = typeof urlOrImage === 'string' ? urlOrImage : urlOrImage.url;
  const source = typeof urlOrImage === 'string' ? legacySource : urlOrImage.source;
  const storagePath =
    typeof urlOrImage === 'string' ? legacyStoragePath : urlOrImage.storagePath;

  if (storagePath) {
    try {
      await deleteObject(ref(storage, storagePath));
    } catch (error) {
      console.warn('Storage delete skipped:', error);
    }
    return;
  }

  if (source !== 'upload' || !url) return;
  try {
    await deleteObject(ref(storage, url));
  } catch (error) {
    console.warn('Storage delete skipped:', error);
  }
}

export async function deleteStorageUrlIfFirebase(url: string): Promise<void> {
  if (!url) return;
  if (!url.includes('firebasestorage.googleapis.com') && !url.startsWith('gs://')) {
    return;
  }
  try {
    await deleteObject(ref(storage, url));
  } catch (error) {
    console.warn('Storage delete skipped:', error);
  }
}
