// IndexedDB persistent media engine for local video caching & instant playback
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
 * Saves a video Blob or File persistently in IndexedDB
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
 * Resolves any video URL: if it is an indexeddb:// URI, loads the blob URL; otherwise returns the original URL
 */
export async function resolvePlayableVideoUrl(videoUrl?: string): Promise<string | null> {
  if (!videoUrl) return null;
  if (videoUrl.startsWith('indexeddb://')) {
    const blobUrl = await getVideoObjectUrl(videoUrl);
    return blobUrl;
  }
  return videoUrl;
}
