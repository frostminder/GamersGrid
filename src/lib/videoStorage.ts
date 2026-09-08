// IndexedDB persistent media engine for local video caching & instant playback
import { uploadToR2 } from './uploadMedia';

const DB_NAME = 'GamersGridMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'videoClips';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a video Blob or File persistently in IndexedDB for the local browser
 */
export async function saveVideoToCache(clipId: string, blob: Blob | File): Promise<string> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const record = {
        id: clipId,
        blob: blob,
        mimeType: blob.type || 'video/mp4',
        createdAt: Date.now()
      };
      const req = store.put(record);
      req.onsuccess = () => resolve(`indexeddb://${clipId}`);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not save video to IndexedDB:', err);
    return '';
  }
}

/**
 * Retrieves a video Blob from IndexedDB and returns a playable Object URL
 */
export async function getVideoObjectUrl(clipId: string): Promise<string | null> {
  try {
    const cleanId = clipId.replace(/^indexeddb:\/\//, '');
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(cleanId);
      req.onsuccess = () => {
        if (req.result && req.result.blob) {
          const objectUrl = URL.createObjectURL(req.result.blob);
          resolve(objectUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to retrieve video from IndexedDB:', err);
    return null;
  }
}

/**
 * Uploads a video file to real cloud storage (Cloudflare R2) so it can be streamed across all devices
 */
export async function uploadVideoToCloud(videoFile: File | Blob): Promise<string> {
  // Strategy 1: Direct Cloudflare R2 upload using configured credentials
  try {
    const fileToUpload = videoFile instanceof File 
      ? videoFile 
      : new File([videoFile], `clip_${Date.now()}.mp4`, { type: videoFile.type || 'video/mp4' });

    const r2Result = await uploadToR2(fileToUpload);
    if (r2Result && r2Result.url) {
      return r2Result.url;
    }
  } catch (err) {
    console.warn('R2 upload failed, attempting fallback local storage:', err);
  }

  // Strategy 2: Upload to local server endpoint if running dev server
  try {
    const fileExt = (videoFile as File).name?.split('.').pop() || 'mp4';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch('/api/upload-video', {
      method: 'POST',
      headers: {
        'x-file-ext': fileExt,
        'Content-Type': videoFile.type || 'video/mp4'
      },
      body: videoFile,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('Local server upload endpoint unavailable:', err);
  }

  return '';
}

/**
 * Resolves any video URL: if it is an indexeddb:// URI or a dead blob:, loads cleanly.
 * Never returns fake sample or stock video links.
 */
export async function resolvePlayableVideoUrl(videoUrl?: string): Promise<string | null> {
  if (!videoUrl || videoUrl.trim() === '') {
    return null;
  }

  // Strip away any legacy fake or mock video links
  if (videoUrl.includes('game_clip_action') || videoUrl.includes('sample_clip')) {
    return null;
  }

  // 1. IndexedDB URIs
  if (videoUrl.startsWith('indexeddb://')) {
    const blobUrl = await getVideoObjectUrl(videoUrl);
    if (blobUrl) {
      return blobUrl;
    }
    return null;
  }

  // 2. In-memory blob: URLs (check if still active)
  if (videoUrl.startsWith('blob:')) {
    try {
      const checkRes = await fetch(videoUrl, { method: 'HEAD' });
      if (checkRes.ok) {
        return videoUrl;
      }
    } catch {
      // Dead blob
    }
    return videoUrl;
  }

  return videoUrl;
}
