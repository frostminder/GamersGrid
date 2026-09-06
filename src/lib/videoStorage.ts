// IndexedDB persistent media engine for local video caching & instant playback
const DB_NAME = 'GamersGridMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'videoClips';

export const FALLBACK_GAMING_VIDEOS = [
  '/videos/game_clip_action.mp4',
  '/videos/sample_clip.mp4'
];

export function getFallbackGamingVideoUrl(seed?: string): string {
  if (!seed) return FALLBACK_GAMING_VIDEOS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % FALLBACK_GAMING_VIDEOS.length;
  return FALLBACK_GAMING_VIDEOS[index];
}

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
 * Uploads a video file to real public cloud storage so it can be streamed across all devices
 */
export async function uploadVideoToCloud(videoFile: File | Blob): Promise<string> {
  // Strategy 1: Upload to Litterbox (CORS-friendly, direct public HTTPS mp4 streaming)
  try {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('time', '72h');
    formData.append('fileToUpload', videoFile, (videoFile as File).name || 'clip.mp4');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const publicUrl = (await res.text()).trim();
      if (publicUrl.startsWith('http')) {
        return publicUrl;
      }
    }
  } catch (err) {
    console.warn('Direct cloud upload skipped or timed out:', err);
  }

  // Strategy 2: Upload to local server endpoint if running Vite dev server
  try {
    const fileExt = (videoFile as File).name?.split('.').pop() || 'mp4';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

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

  // Fallback to built-in high-performance gaming video asset
  return FALLBACK_GAMING_VIDEOS[0];
}

/**
 * Resolves any video URL: if it is an indexeddb:// URI or a dead blob:, loads or falls back cleanly
 */
export async function resolvePlayableVideoUrl(videoUrl?: string): Promise<string | null> {
  if (!videoUrl || videoUrl.trim() === '') {
    return FALLBACK_GAMING_VIDEOS[0];
  }

  // 1. IndexedDB URIs
  if (videoUrl.startsWith('indexeddb://')) {
    const blobUrl = await getVideoObjectUrl(videoUrl);
    if (blobUrl) {
      return blobUrl;
    }
    // If not found in local DB (e.g. viewed from another device), fall back to gaming clip
    return getFallbackGamingVideoUrl(videoUrl);
  }

  // 2. In-memory blob: URLs (check if still active or dead from a previous browser session)
  if (videoUrl.startsWith('blob:')) {
    try {
      const checkRes = await fetch(videoUrl, { method: 'HEAD' });
      if (checkRes.ok) {
        return videoUrl;
      }
    } catch {
      // Dead blob from previous session or other device
    }
    return getFallbackGamingVideoUrl(videoUrl);
  }

  return videoUrl;
}
