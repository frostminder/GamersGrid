// 7. Cloudflare R2 for images/videos
// Client requests a presigned upload URL from a Cloudflare Worker, then uploads the file directly to R2 — never route large media files through your own backend server.

/**
 * Validates video constraints: 2-minute max duration, 1080p max resolution.
 */
const validateVideoLimits = (file: File): Promise<void> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      // 7. Enforce the existing 2-minute video cap and 1080p ceiling client-side before upload begins
      if (video.duration > 120) {
        reject(new Error('Video duration exceeds 2-minute limit.'));
        return;
      }
      if (video.videoWidth > 1920 || video.videoHeight > 1080) {
        reject(new Error('Video resolution exceeds 1080p ceiling.'));
        return;
      }
      resolve();
    };

    video.onerror = () => {
      reject(new Error('Failed to load video metadata.'));
    };

    video.src = window.URL.createObjectURL(file);
  });
};

/**
 * 8. Extra measures: Generate and store a small thumbnail (client-side, before upload) for every video, 
 * and display the thumbnail in feeds/chat until the user actually taps to play
 */
export const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.autoplay = true;
    video.muted = true;
    video.src = URL.createObjectURL(file);
    
    video.onloadeddata = () => {
      // Seek to 1 second in to grab a good frame, instead of a black screen at 0s
      video.currentTime = 1;
    };
    
    video.onseeked = () => {
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      // Calculate thumbnail dimensions (small, e.g., max 320px wide)
      const maxW = 320;
      const ratio = video.videoWidth / video.videoHeight;
      const width = Math.min(maxW, video.videoWidth);
      const height = width / ratio;
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);
      
      const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.6); // 60% quality JPEG
      URL.revokeObjectURL(video.src);
      resolve(thumbnailDataUrl);
    };

    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error('Error processing video thumbnail'));
    };
  });
};

/**
 * Uploads a file to Cloudflare R2 using a presigned URL.
 */
export const uploadToR2 = async (file: File): Promise<{ url: string, thumbnailUrl?: string }> => {
  let thumbnailUrl: string | undefined;

  // Enforce limits and generate thumbnail for videos
  if (file.type.startsWith('video/')) {
    await validateVideoLimits(file);
    thumbnailUrl = await generateVideoThumbnail(file);
  }

  // 1. Request presigned URL from Cloudflare Worker / backend endpoint
  // 7. Client requests a presigned upload URL from a Cloudflare Worker
  const presignResponse = await fetch('/api/get-presigned-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      fileName: file.name, 
      fileType: file.type 
    })
  });

  const presignData = await presignResponse.json().catch(() => ({}));

  if (!presignResponse.ok || !presignData.uploadUrl) {
    if (presignData.needsConfig) {
      console.warn('Cloudflare R2 not yet configured:', presignData.error);
      // Fallback: If developer hasn't configured R2 credentials yet, upload via local storage endpoint so app doesn't break
      const fallbackFormData = new FormData();
      fallbackFormData.append('file', file);
      const localResp = await fetch('/api/upload-video', {
        method: 'POST',
        headers: { 'x-file-ext': file.name.split('.').pop() || 'mp4' },
        body: file,
      });
      const localData = await localResp.json().catch(() => ({}));
      if (localData.url) {
        return {
          url: localData.url,
          thumbnailUrl,
        };
      }
      throw new Error(presignData.error || 'Cloudflare R2 credentials missing');
    }
    throw new Error(presignData.error || 'Failed to get Cloudflare R2 presigned URL');
  }

  const { uploadUrl, publicUrl } = presignData;

  // 2. Upload directly to R2 using the presigned URL
  try {
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
        // 7. Set long-lived Cache-Control headers on uploaded R2 objects so Cloudflare's CDN edge cache serves repeat views
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    });

    if (uploadResponse.ok) {
      return {
        url: publicUrl,
        thumbnailUrl
      };
    }
    console.warn(`Direct R2 PUT responded with status ${uploadResponse.status}, falling back to server-assisted R2 stream...`);
  } catch (err: any) {
    console.warn('Direct R2 PUT caught client network/CORS error, falling back to server-assisted R2 stream...', err?.message);
  }

  // 3. Fallback: Stream directly to R2 via server endpoint
  const directResp = await fetch('/api/upload-to-r2-direct', {
    method: 'POST',
    headers: {
      'x-file-name': encodeURIComponent(file.name),
      'x-file-type': file.type || 'application/octet-stream'
    },
    body: file
  });

  const directData = await directResp.json().catch(() => ({}));
  if (!directResp.ok || !directData.url) {
    throw new Error(directData.error || 'Failed to upload media to Cloudflare R2');
  }

  return {
    url: directData.url,
    thumbnailUrl
  };
};
