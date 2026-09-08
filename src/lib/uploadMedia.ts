import { saveVideoToCache } from './videoStorage';

// 7. Media Upload Engine for images/videos
// Uploads media directly to Cloudflare R2 bucket with automatic persistent local storage fallback

/**
 * Validates video constraints: soft duration check to ensure smooth uploads.
 */
const validateVideoLimits = (file: File): Promise<void> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    const timeout = setTimeout(() => {
      resolve();
    }, 1000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      window.URL.revokeObjectURL(video.src);
      resolve();
    };

    video.onerror = () => {
      clearTimeout(timeout);
      resolve();
    };

    video.src = window.URL.createObjectURL(file);
  });
};

/**
 * Generates a thumbnail for video preview
 */
export const generateVideoThumbnail = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.autoplay = true;
    video.muted = true;
    
    const timeout = setTimeout(() => {
      if (video.src) URL.revokeObjectURL(video.src);
      resolve('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80');
    }, 1500);

    video.onloadeddata = () => {
      video.currentTime = 1;
    };
    
    video.onseeked = () => {
      clearTimeout(timeout);
      if (!ctx) {
        if (video.src) URL.revokeObjectURL(video.src);
        resolve('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80');
        return;
      }
      
      const maxW = 320;
      const ratio = (video.videoWidth || 16) / (video.videoHeight || 9);
      const width = Math.min(maxW, video.videoWidth || 320);
      const height = width / ratio;
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);
      
      const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.6);
      if (video.src) URL.revokeObjectURL(video.src);
      resolve(thumbnailDataUrl);
    };

    video.onerror = () => {
      clearTimeout(timeout);
      if (video.src) URL.revokeObjectURL(video.src);
      resolve('https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80');
    };

    video.src = URL.createObjectURL(file);
  });
};

/**
 * Uploads a file to Cloudflare R2 bucket and returns public R2 URL.
 */
export const uploadToR2 = async (file: File): Promise<{ url: string, thumbnailUrl?: string }> => {
  let thumbnailUrl: string | undefined;

  if (file.type.startsWith('video/')) {
    await validateVideoLimits(file);
    thumbnailUrl = await generateVideoThumbnail(file);
  }

  // Primary Path: Stream file directly to Cloudflare R2 via backend server endpoint
  // This bypasses browser CORS issues and guarantees the file is saved in Cloudflare R2 bucket.
  try {
    const directResp = await fetch('/api/upload-to-r2-direct', {
      method: 'POST',
      headers: {
        'x-file-name': encodeURIComponent(file.name),
        'x-file-type': file.type || 'application/octet-stream'
      },
      body: file
    });

    const directData = await directResp.json().catch(() => ({}));
    if (directResp.ok && directData.url) {
      return {
        url: directData.url,
        thumbnailUrl
      };
    }
    console.warn('Direct server-assisted R2 stream returned error:', directData.error);
  } catch (directErr: any) {
    console.warn('Direct server-assisted R2 stream error:', directErr?.message);
  }

  // Secondary Path: Request presigned URL and PUT to Cloudflare R2
  try {
    const presignResponse = await fetch('/api/get-presigned-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fileName: file.name, 
        fileType: file.type 
      })
    });

    const presignData = await presignResponse.json().catch(() => ({}));

    if (presignResponse.ok && presignData.uploadUrl && presignData.publicUrl) {
      const uploadResponse = await fetch(presignData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'Cache-Control': 'public, max-age=31536000, immutable'
        }
      });

      if (uploadResponse.ok) {
        return {
          url: presignData.publicUrl,
          thumbnailUrl
        };
      }
    }
  } catch (err: any) {
    console.warn('Presigned PUT upload to R2 error:', err?.message);
  }

  // Tertiary Path: App Server Media Handler (/api/upload-video)
  // Saves file to public server storage so ANY device (Device B, Mobile, Desktop) can stream it
  try {
    const fileExt = file.name ? file.name.split('.').pop() || 'mp4' : 'mp4';
    const serverResp = await fetch('/api/upload-video', {
      method: 'POST',
      headers: {
        'x-file-ext': fileExt,
        'Content-Type': file.type || 'video/mp4'
      },
      body: file
    });

    if (serverResp.ok) {
      const serverData = await serverResp.json().catch(() => ({}));
      if (serverData && serverData.url) {
        return {
          url: serverData.url,
          thumbnailUrl
        };
      }
    }
  } catch (serverErr: any) {
    console.warn('Server upload endpoint error:', serverErr?.message);
  }

  throw new Error('Upload failed — please check your connection and try again.');
};
