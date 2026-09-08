import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import imageCompression from 'browser-image-compression';

let ffmpeg: FFmpeg | null = null;

export const loadFfmpeg = async (onProgress?: (progress: number) => void) => {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = new FFmpeg();
  
  if (onProgress) {
    ffmpeg.on('progress', ({ progress, time }) => {
      onProgress(progress * 100);
    });
  }

  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
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

export const processVideoWithFfmpeg = async (
  file: File,
  segments: VideoSegment[],
  onProgress: (p: number) => void
): Promise<File> => {
  const ff = await loadFfmpeg(onProgress);
  
  const inputName = 'input' + (file.name ? file.name.substring(file.name.lastIndexOf('.')) : '.mp4');
  await ff.writeFile(inputName, await fetchFile(file));

  const keptSegments = segments.filter(s => s.keep);
  
  if (keptSegments.length === 0) {
    throw new Error("No segments selected to keep.");
  }

  const outputName = 'output.mp4';
  
  let filterComplex = '';
  let concatInputs = '';
  
  // Create filter_complex string for multi-segment trim and concat
  keptSegments.forEach((seg, index) => {
    // trim video and audio
    filterComplex += `[0:v]trim=start=${seg.start}:end=${seg.end},setpts=PTS-STARTPTS[v${index}];`;
    filterComplex += `[0:a]atrim=start=${seg.start}:end=${seg.end},asetpts=PTS-STARTPTS[a${index}];`;
    concatInputs += `[v${index}][a${index}]`;
  });
  
  // Concatenate all segments
  filterComplex += `${concatInputs}concat=n=${keptSegments.length}:v=1:a=1[outv][outa]`;

  // Compress: scale to 1080p ceiling, ~2.5 Mbps
  // Combine scale into outv if possible, or apply it after concat.
  filterComplex += `;[outv]scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease[finalv]`;

  const args = [
    '-i', inputName,
    '-filter_complex', filterComplex,
    '-map', '[finalv]',
    '-map', '[outa]',
    '-b:v', '2500k', // target 2.5 Mbps bitrate
    '-maxrate', '2500k',
    '-bufsize', '5000k',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-c:a', 'aac',
    '-b:a', '128k',
    outputName
  ];

  await ff.exec(args);

  const data = await ff.readFile(outputName);
  
  // cleanup
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  return new File([data as Uint8Array], 'processed_clip.mp4', { type: 'video/mp4' });
};

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  };
  try {
    const compressedBlob = await imageCompression(file, options);
    return new File([compressedBlob], file.name, { type: file.type });
  } catch (error) {
    console.warn("Image compression failed, returning original:", error);
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
