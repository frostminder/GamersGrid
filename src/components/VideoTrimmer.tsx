import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Scissors, Play, Pause, Trash2, Plus, Scale } from 'lucide-react';
import { VideoSegment, formatFileSize } from '../lib/videoProcessor';

interface VideoTrimmerProps {
  videoFile: File;
  videoPreview: string;
  videoDuration: number;
  segments: VideoSegment[];
  setSegments: React.Dispatch<React.SetStateAction<VideoSegment[]>>;
}

const THUMBNAIL_COUNT = 14;

export const VideoTrimmer: React.FC<VideoTrimmerProps> = ({
  videoFile,
  videoPreview,
  videoDuration,
  segments,
  setSegments,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(true);
  const [draggingBoundary, setDraggingBoundary] = useState<number | null>(null); // index of segment whose END is being dragged

  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // --- Generate filmstrip thumbnails (CapCut-style: real frames, not a plain bar) ---
  useEffect(() => {
    if (!videoDuration || videoDuration <= 0) return;
    let cancelled = false;
    setThumbsLoading(true);

    const genVideo = document.createElement('video');
    genVideo.src = videoPreview;
    genVideo.muted = true;
    genVideo.preload = 'auto';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const captureFrame = (t: number): Promise<string> =>
      new Promise((resolve) => {
        genVideo.currentTime = Math.min(t, Math.max(0, videoDuration - 0.05));
        genVideo.onseeked = () => {
          if (!ctx) return resolve('');
          const w = 120;
          const ratio = (genVideo.videoWidth || 16) / (genVideo.videoHeight || 9);
          const h = w / ratio;
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(genVideo, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      });

    genVideo.onloadeddata = async () => {
      const frames: string[] = [];
      for (let i = 0; i < THUMBNAIL_COUNT; i++) {
        if (cancelled) return;
        const t = (videoDuration / THUMBNAIL_COUNT) * i;
        const frame = await captureFrame(t);
        frames.push(frame);
      }
      if (!cancelled) {
        setThumbnails(frames);
        setThumbsLoading(false);
      }
    };

    return () => { cancelled = true; };
  }, [videoPreview, videoDuration]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    if (isPlaying) {
      const activeSegment = segments.find(s => t >= s.start && t < s.end);
      if (activeSegment && !activeSegment.keep) {
        const nextKeep = segments.find(s => s.start >= activeSegment.end && s.keep);
        if (nextKeep) {
          videoRef.current.currentTime = nextKeep.start;
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) { videoRef.current.pause(); setIsPlaying(false); }
    else { videoRef.current.play(); setIsPlaying(true); }
  };

  const addCutPoint = () => {
    const t = currentTime;
    const activeSegmentIndex = segments.findIndex(s => t > s.start && t < s.end);
    if (activeSegmentIndex === -1) return;

    const activeSeg = segments[activeSegmentIndex];
    if (t - activeSeg.start < 0.5 || activeSeg.end - t < 0.5) return;

    const newSegments = [...segments];
    const firstPart = { ...activeSeg, end: t };
    const secondPart = { ...activeSeg, start: t };
    newSegments.splice(activeSegmentIndex, 1, firstPart, secondPart);
    setSegments(newSegments);
  };

  const toggleSegmentKeep = (index: number) => {
    const newSegments = [...segments];
    newSegments[index].keep = !newSegments[index].keep;
    setSegments(newSegments);
  };

  // --- Draggable boundary handles (CapCut-style precise adjustment) ---
  const timeFromClientX = useCallback((clientX: number): number => {
    if (!filmstripRef.current) return 0;
    const rect = filmstripRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * videoDuration;
  }, [videoDuration]);

  const handleBoundaryPointerDown = (segmentIndex: number) => (e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingBoundary(segmentIndex);
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (draggingBoundary === null) return;
    const t = timeFromClientX(e.clientX);
    setSegments((prev) => {
      const next = [...prev];
      const seg = next[draggingBoundary];
      const nextSeg = next[draggingBoundary + 1];
      if (!seg || !nextSeg) return prev;
      const minBound = seg.start + 0.3;
      const maxBound = nextSeg.end - 0.3;
      const clamped = Math.max(minBound, Math.min(maxBound, t));
      next[draggingBoundary] = { ...seg, end: clamped };
      next[draggingBoundary + 1] = { ...nextSeg, start: clamped };
      return next;
    });
  }, [draggingBoundary, timeFromClientX, setSegments]);

  const handlePointerUp = useCallback(() => setDraggingBoundary(null), []);

  useEffect(() => {
    if (draggingBoundary === null) return;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingBoundary, handlePointerMove, handlePointerUp]);

  const totalKeptDuration = segments.filter(s => s.keep).reduce((acc, s) => acc + (s.end - s.start), 0);

  return (
    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 space-y-4">
      {/* Header: title, kept duration, file size — all up front */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-bold text-gray-200 flex items-center gap-2">
          <Scissors className="w-4 h-4 text-[#5003BD]" />
          Trim Editor
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-1 rounded-md bg-[#232323] text-gray-300 flex items-center gap-1.5">
            <Scale className="w-3 h-3 text-purple-400" />
            {formatFileSize(videoFile.size)}
          </span>
          <span className={`text-xs font-mono px-2 py-1 rounded-md ${totalKeptDuration > 120 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
            Kept: {formatSecs(totalKeptDuration)} / 2:00 max
          </span>
        </div>
      </div>

      {/* Live video preview */}
      <div className="relative rounded-lg overflow-hidden bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoPreview}
          className="w-full max-h-[300px] object-contain"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          playsInline
        />
      </div>

      {/* Playback controls */}
      <div className="flex items-center gap-4">
        <button type="button" onClick={togglePlay} className="w-10 h-10 rounded-full bg-[#5003BD] hover:bg-[#6c1ce0] flex items-center justify-center text-white transition-colors shrink-0">
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
        </button>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{formatSecs(currentTime)}</span>
            <span>{formatSecs(videoDuration)}</span>
          </div>
          <input
            type="range" min={0} max={Math.max(1, videoDuration)} step={0.1} value={currentTime}
            onChange={(e) => { if (videoRef.current) videoRef.current.currentTime = parseFloat(e.target.value); }}
            className="w-full accent-[#5003BD] h-2 bg-[#2c2c2c] rounded-lg cursor-pointer"
          />
        </div>
        <button type="button" onClick={addCutPoint} className="px-3 py-2 bg-[#2c2c2c] hover:bg-[#383838] text-sm text-gray-200 rounded-lg font-medium flex items-center gap-1 transition-colors shrink-0">
          <Plus className="w-4 h-4" /> Cut Here
        </button>
      </div>

      {/* Filmstrip + draggable segment editor (CapCut-style) */}
      <div className="pt-2">
        <p className="text-xs text-gray-400 mb-2">Drag the dividers to adjust, tap a segment to Keep/Remove:</p>
        <div ref={filmstripRef} className="relative h-14 w-full rounded-lg overflow-hidden border border-[#333] select-none">
          {/* Filmstrip background */}
          {thumbsLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0d]">
              <span className="text-[10px] text-gray-500">Loading preview frames...</span>
            </div>
          ) : (
            <div className="absolute inset-0 flex">
              {thumbnails.map((src, i) => (
                <img key={i} src={src} alt="" className="h-full flex-1 object-cover" draggable={false} />
              ))}
            </div>
          )}

          {/* Keep/remove overlay per segment */}
          <div className="absolute inset-0 flex">
            {segments.map((seg, i) => {
              const widthPct = ((seg.end - seg.start) / videoDuration) * 100;
              return (
                <div
                  key={i}
                  onClick={() => toggleSegmentKeep(i)}
                  style={{ width: `${widthPct}%` }}
                  className={`h-full cursor-pointer relative transition-colors ${
                    seg.keep ? 'bg-[#5003BD]/25 hover:bg-[#5003BD]/40 border-y-2 border-[#5003BD]' : 'bg-black/70 hover:bg-black/80'
                  }`}
                >
                  {!seg.keep && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Trash2 className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Draggable boundary handles between segments */}
          {segments.slice(0, -1).map((seg, i) => {
            const leftPct = (seg.end / videoDuration) * 100;
            return (
              <div
                key={`handle-${i}`}
                onPointerDown={handleBoundaryPointerDown(i)}
                style={{ left: `calc(${leftPct}% - 4px)` }}
                className="absolute top-0 bottom-0 w-2 bg-white cursor-ew-resize z-20 hover:bg-purple-300 shadow-[0_0_6px_rgba(0,0,0,0.6)]"
                title="Drag to adjust cut point"
              />
            );
          })}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-10 pointer-events-none"
            style={{ left: `${(currentTime / videoDuration) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-4 text-[10px] text-gray-400 mt-2">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm border-2 border-[#5003BD] inline-block" /> Keep</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-black/70 inline-block" /> Remove</span>
        </div>
      </div>
    </div>
  );
};
