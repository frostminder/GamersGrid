import React, { useState, useRef, useEffect } from 'react';
import { Scissors, Play, Pause, Trash2, Plus } from 'lucide-react';
import { VideoSegment, formatFileSize } from '../lib/videoProcessor';

interface VideoTrimmerProps {
  videoFile: File;
  videoPreview: string;
  videoDuration: number;
  segments: VideoSegment[];
  setSegments: React.Dispatch<React.SetStateAction<VideoSegment[]>>;
}

export const VideoTrimmer: React.FC<VideoTrimmerProps> = ({
  videoFile,
  videoPreview,
  videoDuration,
  segments,
  setSegments,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Format seconds to mm:ss
  const formatSecs = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    // Skip removed segments during playback
    if (isPlaying) {
      const activeSegment = segments.find(s => t >= s.start && t < s.end);
      if (activeSegment && !activeSegment.keep) {
        // Find next kept segment
        const nextKeep = segments.find(s => s.start >= activeSegment.end && s.keep);
        if (nextKeep) {
          videoRef.current.currentTime = nextKeep.start;
        } else {
          // No more kept segments, pause
          videoRef.current.pause();
          setIsPlaying(false);
        }
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const addCutPoint = () => {
    const t = currentTime;
    const activeSegmentIndex = segments.findIndex(s => t > s.start && t < s.end);
    if (activeSegmentIndex === -1) return; // on a boundary or out of bounds

    const activeSeg = segments[activeSegmentIndex];
    
    // Don't cut if it's too close to a boundary (e.g., < 0.5s)
    if (t - activeSeg.start < 0.5 || activeSeg.end - t < 0.5) return;

    const newSegments = [...segments];
    // Split into two
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

  const totalKeptDuration = segments.filter(s => s.keep).reduce((acc, s) => acc + (s.end - s.start), 0);

  return (
    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-200 flex items-center gap-2">
          <Scissors className="w-4 h-4 text-[#5003BD]" />
          Multi-Segment Trimmer
        </h3>
        <span className={`text-xs font-mono px-2 py-1 rounded-md ${totalKeptDuration > 120 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
          Kept: {formatSecs(totalKeptDuration)} / 2:00 max
        </span>
      </div>

      <div className="relative rounded-lg overflow-hidden bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoPreview}
          className="w-full max-h-[300px] object-contain"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          playsInline
        />
        
        {/* Scrubber overlay over video, or below it */}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-[#5003BD] hover:bg-[#6c1ce0] flex items-center justify-center text-white transition-colors"
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
        </button>

        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{formatSecs(currentTime)}</span>
            <span>{formatSecs(videoDuration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(1, videoDuration)}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              if (videoRef.current) {
                videoRef.current.currentTime = parseFloat(e.target.value);
              }
            }}
            className="w-full accent-[#5003BD] h-2 bg-[#2c2c2c] rounded-lg cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={addCutPoint}
          className="px-3 py-2 bg-[#2c2c2c] hover:bg-[#383838] text-sm text-gray-200 rounded-lg font-medium flex items-center gap-1 transition-colors"
        >
          <Plus className="w-4 h-4" /> Cut Here
        </button>
      </div>

      {/* Segments Visualization */}
      <div className="pt-2">
        <p className="text-xs text-gray-400 mb-2">Tap segments to Keep or Remove:</p>
        <div className="h-12 w-full flex rounded-lg overflow-hidden border border-[#333] cursor-pointer">
          {segments.map((seg, i) => {
            const widthPct = ((seg.end - seg.start) / videoDuration) * 100;
            return (
              <div
                key={i}
                onClick={() => toggleSegmentKeep(i)}
                style={{ width: `${widthPct}%` }}
                className={`h-full border-r border-[#121212] flex items-center justify-center transition-colors relative ${seg.keep ? 'bg-[#5003BD] hover:bg-[#6c1ce0]' : 'bg-[#2c2c2c] hover:bg-[#383838]'}`}
                title={`Segment ${i+1}: ${formatSecs(seg.start)} - ${formatSecs(seg.end)}`}
              >
                {!seg.keep && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </div>
                )}
                {seg.keep && widthPct > 5 && (
                  <span className="text-[10px] font-mono text-white/80">{formatSecs(seg.end - seg.start)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <p className="text-xs text-gray-500 italic">
        Original File Size: {formatFileSize(videoFile.size)}
      </p>
    </div>
  );
};
