import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import imageCompression from 'browser-image-compression';

let ffmpeg: FFmpeg | null = null;

export const loadFfmpeg = async (onProgress?: (progress: number) => void) => {
  if (ffmpeg) {
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => onProgress(progress * 100));
    }
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => onProgress(progress * 100));
  }

  // FIX: use the /dist/esm build, not /dist/umd — this is the reliably
  // documented pairing for the class-based FFmpeg() API used here. The umd
  // build has been an intermittent source of silent load failures.
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  return ffmpeg;
};

export type VideoSegment = {
  start: number;
  end: number;
  keep: boolean;
};

/**
 * FIX: replaced the old single-pass filter_complex approach (which hardcoded
 * an [0:a]atrim audio filter on every segment — breaking entirely on any
 * video without an audio track, with an unhelpful ffmpeg.wasm error).
 *
 * This version cuts + compresses each kept segment individually (so audio
 * presence/absence is handled naturally per-segment by ffmpeg, not assumed),
 * then concatenates the results. Simpler, and each step fails independently
 * and legibly rather than one large opaque filter graph failing as a whole.
 */
export const processVideoWithFfmpeg = async (
  file: File,
  segments: VideoSegment[],
  onProgress: (p: number) => void
): Promise<File> => {
  const ff = await loadFfmpeg(onProgress);

  const keptSegments = segments.filter((s) => s.keep).sort((a, b) => a.start - b.start);
  if (keptSegments.length === 0) {
    throw new Error('No segments selected to keep.');
  }

  const inputName = 'input' + (file.name ? file.name.substring(file.name.lastIndexOf('.')) : '.mp4');
  await ff.writeFile(inputName, await fetchFile(file));

  const segmentFileNames: string[] = [];
  for (let i = 0; i < keptSegments.length; i++) {
    const { start, end } = keptSegments[i];
    const segName = `segment_${i}.mp4`;

    // Detect whether the input has an audio stream; if not, skip -c:a entirely
    // instead of assuming one exists.
    let hasAudio = true;
    try {
      // ffprobe isn't bundled by default; simplest robust approach is to try
      // encoding with audio and fall back to video-only on failure.
      await ff.exec([
        '-i', inputName,
        '-ss', String(start),
        '-to', String(end),
        '-vf', "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
        '-b:v', '2500k',
        '-maxrate', '2500k',
        '-bufsize', '5000k',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-c:a', 'aac',
        '-b:a', '128k',
        segName,
      ]);
    } catch (err) {
      hasAudio = false;
      console.warn(`Segment ${i}: encode with audio failed, retrying without audio track:`, err);
      await ff.exec([
        '-i', inputName,
        '-ss', String(start),
        '-to', String(end),
        '-vf', "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease",
        '-b:v', '2500k',
        '-maxrate', '2500k',
        '-bufsize', '5000k',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-an', // no audio
        segName,
      ]);
    }

    segmentFileNames.push(segName);
  }

  let outputName = segmentFileNames[0];

  if (segmentFileNames.length > 1) {
    const concatList = segmentFileNames.map((name) => `file '${name}'`).join('\n');
    await ff.writeFile('concat_list.txt', new TextEncoder().encode(concatList));
    outputName = 'final_output.mp4';
    await ff.exec(['-f', 'concat', '-safe', '0', '-i', 'concat_list.txt', '-c', 'copy', outputName]);
  }

  const data = await ff.readFile(outputName);

  // cleanup
  try {
    await ff.deleteFile(inputName);
    for (const name of segmentFileNames) await ff.deleteFile(name);
    if (segmentFileNames.length > 1) {
      await ff.deleteFile('concat_list.txt');
      await ff.deleteFile(outputName);
    }
  } catch {
    // best-effort cleanup only
  }

  return new File([data as Uint8Array], 'processed_clip.mp4', { type: 'video/mp4' });
};

export const compressImage = async (file: File): Promise<File> => {
  const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
  try {
    const compressedBlob = await imageCompression(file, options);
    return new File([compressedBlob], file.name, { type: file.type });
  } catch (error) {
    console.warn('Image compression failed, returning original:', error);
    return file;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Robustly reads a video file's duration, working around the well-known
 * browser bug where a blob-URL video's `.duration` reports Infinity/NaN on
 * the first loadedmetadata event (common with phone-recorded MP4s). Falls
 * back to seeking near the end to force the browser to resolve the real
 * duration, then resets playback position to 0.
 */
export const getReliableVideoDuration = (objectUrl: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = objectUrl;

    const finish = (dur: number) => {
      video.removeAttribute('src');
      video.load();
      resolve(dur);
    };

    const timeout = setTimeout(() => {
      reject(new Error('Timed out reading video duration.'));
    }, 8000);

    video.onloadedmetadata = () => {
      if (isFinite(video.duration) && video.duration > 0) {
        clearTimeout(timeout);
        finish(video.duration);
        return;
      }
      // Duration came back Infinity/NaN — force resolution by seeking near the end.
      video.currentTime = 1e10;
      video.ontimeupdate = () => {
        video.ontimeupdate = null;
        clearTimeout(timeout);
        const resolved = isFinite(video.duration) ? video.duration : 0;
        video.currentTime = 0;
        finish(resolved);
      };
    };

    video.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load video metadata.'));
    };
  });
};