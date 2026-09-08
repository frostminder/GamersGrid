import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Video, Image, Send, Trash2, AlertCircle, 
  Loader2, Scissors, Plus, Hash, X, Clock, UploadCloud,
  Play, Pause
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { uploadToR2 } from '../lib/uploadMedia';
import { AVAILABLE_GAMES } from '../data/gamesAndPlatforms';

interface CreatePostScreenProps {
  onBack?: () => void;
  onPostCreated?: () => void;
}

const PRESET_TAGS = ['Clutch', 'Sniper', 'SoloVQuad', 'Ranked', 'SquadWipe', 'Highlights', 'ProPlayer', 'GamingLife', 'Victory', 'ApexLegends'];

export const CreatePostScreen: React.FC<CreatePostScreenProps> = ({ onBack, onPostCreated }) => {
  const [postType, setPostType] = useState<'clip' | 'image' | 'text'>('clip');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedGame, setSelectedGame] = useState('Gaming');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  // Media files & previews
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Trimming State (Max 2 minutes = 120s)
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error]);

  // Video playback loop between trim boundaries
  useEffect(() => {
    const video = videoRef.current;
    if (!video || postType !== 'clip' || !videoFile) return;

    const handleTimeUpdate = () => {
      if (video.currentTime < trimStart) {
        video.currentTime = trimStart;
      }
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [trimStart, trimEnd, postType, videoFile]);

  // Clean object URLs
  useEffect(() => {
    return () => {
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [videoPreview, imagePreviews]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;

    setError(null);

    if (postType === 'clip') {
      const file = files[0];
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file (.mp4, .webm, .mov).');
        return;
      }

      setVideoFile(file);
      setImageFiles([]);
      setImagePreviews([]);

      const objectUrl = URL.createObjectURL(file);
      setVideoPreview(objectUrl);

      // Read video duration
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = objectUrl;
      tempVideo.onloadedmetadata = () => {
        const dur = tempVideo.duration || 0;
        setVideoDuration(dur);
        setTrimStart(0);
        setTrimEnd(Math.min(dur, 120)); // Auto set initial trim to first 120 seconds max
      };
    } else if (postType === 'image') {
      const selectedImages = files.filter(f => f.type.startsWith('image/'));
      if (!selectedImages.length) {
        setError('Please select valid image files.');
        return;
      }

      if (imageFiles.length + selectedImages.length > 10) {
        setError('Maximum of 10 images allowed per post.');
        selectedImages.splice(10 - imageFiles.length);
      }

      setImageFiles(prev => [...prev, ...selectedImages]);
      setVideoFile(null);
      setVideoPreview(null);

      const newPreviews = selectedImages.map(f => URL.createObjectURL(f));
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearVideo = () => {
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    setVideoFile(null);
    setVideoPreview(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.currentTime = trimStart;
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleToggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(prev => prev.filter(t => t !== tag));
    } else {
      if (tags.length >= 5) {
        setError('Maximum of 5 tags allowed.');
        return;
      }
      setTags(prev => [...prev, tag]);
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTag.trim().replace(/^#/, '');
    if (!clean) return;
    if (tags.includes(clean)) {
      setCustomTag('');
      return;
    }
    if (tags.length >= 5) {
      setError('Maximum of 5 tags allowed.');
      return;
    }
    setTags(prev => [...prev, clean]);
    setCustomTag('');
  };

  // Trim video segment before uploading
  const prepareVideoForUpload = async (file: File, start: number, end: number, totalDuration: number): Promise<File> => {
    // If video is under 120s and start is near beginning and end is near full length
    const durationSpan = Math.max(0, end - start);
    const isWholeVideoSelected = start <= 1.0 && (end <= 0 || end >= totalDuration - 2.0 || end >= 120.0);
    
    if (totalDuration <= 122.0 && isWholeVideoSelected) {
      return file;
    }

    if (durationSpan <= 0) {
      return file;
    }

    return new Promise((resolve) => {
      let resolved = false;

      const safeResolve = (resultFile: File) => {
        if (!resolved) {
          resolved = true;
          resolve(resultFile);
        }
      };

      // Fail-safe timeout: never hang longer than 3.5 seconds
      const safetyTimeout = setTimeout(() => {
        console.warn('Trim operation timed out, using original file');
        safeResolve(file);
      }, 3500);

      try {
        const video = document.createElement('video');
        const objectUrl = URL.createObjectURL(file);
        video.src = objectUrl;
        video.currentTime = start;
        video.muted = true;
        video.playsInline = true;

        const cleanup = () => {
          clearTimeout(safetyTimeout);
          try { video.pause(); } catch {}
          try { URL.revokeObjectURL(objectUrl); } catch {}
        };

        video.onseeked = async () => {
          try {
            const stream = (video as any).captureStream ? (video as any).captureStream() : (video as any).mozCaptureStream ? (video as any).mozCaptureStream() : null;
            
            if (!stream || typeof MediaRecorder === 'undefined') {
              cleanup();
              safeResolve(file);
              return;
            }

            const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
              ? 'video/mp4;codecs=avc1'
              : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
              ? 'video/webm;codecs=vp9'
              : 'video/webm';

            const recorder = new MediaRecorder(stream, { mimeType });
            const chunks: Blob[] = [];

            recorder.ondataavailable = e => {
              if (e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
              cleanup();
              const blob = new Blob(chunks, { type: mimeType });
              if (blob.size > 0) {
                const trimmedFile = new File([blob], `trimmed_${file.name}`, { type: mimeType });
                safeResolve(trimmedFile);
              } else {
                safeResolve(file);
              }
            };

            recorder.start(100);
            await video.play().catch(() => {});

            const checkInterval = setInterval(() => {
              if (video.currentTime >= end || video.ended || resolved) {
                clearInterval(checkInterval);
                try {
                  if (recorder.state !== 'inactive') {
                    recorder.stop();
                  }
                } catch {
                  cleanup();
                  safeResolve(file);
                }
              }
            }, 50);
          } catch (e) {
            console.warn('Trim capture fallback:', e);
            cleanup();
            safeResolve(file);
          }
        };

        video.onerror = () => {
          cleanup();
          safeResolve(file);
        };

        // In case onseeked doesn't fire immediately, attempt fallback trigger
        setTimeout(() => {
          if (!resolved && video.readyState >= 1) {
            try { video.dispatchEvent(new Event('seeked')); } catch {}
          }
        }, 600);

      } catch (err) {
        console.warn('Trim recording error:', err);
        clearTimeout(safetyTimeout);
        safeResolve(file);
      }
    });
  };

  const selectedSpan = Math.max(0, trimEnd - trimStart);
  const isTrimOverLimit = selectedSpan > 120.5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;

    if (!caption.trim()) {
      setError('Please enter a description for your post.');
      return;
    }

    if (postType === 'clip') {
      if (!title.trim()) {
        setError('Please enter a title for your video clip.');
        return;
      }
      if (!videoFile) {
        setError('Please attach a gaming video clip.');
        return;
      }
      if (isTrimOverLimit) {
        setError('Video duration must be trimmed to 2 minutes (120s) or less.');
        return;
      }
    }

    if (postType === 'image' && imageFiles.length === 0) {
      setError('Please attach at least one image.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadProgress(15);
    setUploadStatus('Processing video clip...');

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('You must be signed in to publish posts.');

      // Fetch user profile
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      const userProfile = userSnap.exists() ? userSnap.data() : null;

      let finalVideoUrl = '';
      let finalThumbnailUrl = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80';
      const uploadedImageUrls: string[] = [];
      let formattedDuration = '0:00';

      if (postType === 'clip' && videoFile) {
        setUploadProgress(30);
        setUploadStatus('Trimming selected 2-minute highlight...');

        const videoToUpload = await prepareVideoForUpload(videoFile, trimStart, trimEnd, videoDuration);

        setUploadProgress(60);
        setUploadStatus('Uploading video clip...');

        const r2Res = await uploadToR2(videoToUpload);
        if (!r2Res || !r2Res.url) {
          throw new Error('Failed to process video clip. Please try a different clip.');
        }

        finalVideoUrl = r2Res.url;
        if (r2Res.thumbnailUrl) {
          finalThumbnailUrl = r2Res.thumbnailUrl;
        }

        const mins = Math.floor(selectedSpan / 60);
        const secs = Math.floor(selectedSpan % 60).toString().padStart(2, '0');
        formattedDuration = `${mins}:${secs}`;
      } else if (postType === 'image' && imageFiles.length > 0) {
        setUploadStatus('Uploading images...');

        for (let i = 0; i < imageFiles.length; i++) {
          setUploadProgress(20 + Math.floor(((i + 1) / imageFiles.length) * 60));
          const r2Res = await uploadToR2(imageFiles[i]);
          if (!r2Res || !r2Res.url) {
            throw new Error(`Failed to process image ${i + 1}.`);
          }
          uploadedImageUrls.push(r2Res.url);
        }
      }

      setUploadProgress(90);
      setUploadStatus('Publishing post...');

      const currentGamertag = userProfile?.gamertag || userProfile?.gamertagLower || user.displayName || 'gamer';
      const currentDisplayName = userProfile?.name || userProfile?.gamertag || user.displayName || 'Gamer';
      const currentAvatar = userProfile?.photoURL || user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

      const postPayload = {
        title: postType === 'clip' ? title.trim() : '',
        caption: caption.trim(),
        game: selectedGame.trim(),
        gameCategory: selectedGame.trim(),
        videoUrl: postType === 'clip' ? finalVideoUrl : '',
        thumbnailUrl: postType === 'clip' ? finalThumbnailUrl : (uploadedImageUrls[0] || ''),
        imageUrls: postType === 'image' ? uploadedImageUrls : [],
        duration: formattedDuration,
        isNew: true,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 1,
        isLiked: false,
        userId: user.uid,
        creator: {
          id: user.uid,
          username: currentGamertag,
          displayName: currentDisplayName,
          avatar: currentAvatar,
          level: userProfile?.level || 1,
          xp: userProfile?.xp || 0,
          isVerified: true
        },
        user: {
          uid: user.uid,
          name: currentDisplayName,
          username: currentGamertag,
          avatar: currentAvatar,
          verified: true
        },
        createdAt: serverTimestamp(),
        createdAtTimestamp: Date.now(),
        tags: tags
      };

      await addDoc(collection(db, 'posts'), postPayload);

      setUploadProgress(100);
      setUploadStatus('Post published!');

      setTimeout(() => {
        setIsUploading(false);
        if (onPostCreated) {
          onPostCreated();
        } else if (onBack) {
          onBack();
        }
      }, 400);

    } catch (err: any) {
      console.error('Post submission error:', err);
      setIsUploading(false);
      setError(err?.message || 'Failed to publish post. Please check your connection.');
    }
  };

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white pt-14 pb-24 px-4 sm:px-6">
      {/* Hidden File Input */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={postType === 'clip' ? 'video/mp4,video/webm,video/quicktime,video/*' : 'image/*'}
        multiple={postType === 'image'}
        className="hidden"
      />

      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Top Header Nav */}
        <div className="flex items-center gap-3 border-b border-[#282828] pb-4">
          {onBack && (
            <button 
              type="button"
              onClick={onBack}
              className="p-2.5 rounded-xl bg-[#1e1e1e] border border-[#333333] text-gray-300 hover:text-white hover:bg-[#2a2a2a] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
              Create Post
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              Share your gaming highlights, clips, and screenshots with the squad
            </p>
          </div>
        </div>

        {/* Error Notification Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-sm flex items-start gap-3 animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-red-100">Action Required</p>
              <p className="text-red-200/90 text-xs mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white p-1 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Post Type Selector Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-[#1e1e1e] border border-[#2a2a2a]">
          <button
            type="button"
            onClick={() => {
              setPostType('clip');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              postType === 'clip' 
                ? 'bg-[#5003BD] text-white shadow-md' 
                : 'text-gray-400 hover:text-white hover:bg-[#282828]'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Gaming Clip</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPostType('image');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              postType === 'image' 
                ? 'bg-[#5003BD] text-white shadow-md' 
                : 'text-gray-400 hover:text-white hover:bg-[#282828]'
            }`}
          >
            <Image className="w-4 h-4" />
            <span>Media Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPostType('text');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              postType === 'text' 
                ? 'bg-[#5003BD] text-white shadow-md' 
                : 'text-gray-400 hover:text-white hover:bg-[#282828]'
            }`}
          >
            <Hash className="w-4 h-4" />
            <span>Discussion</span>
          </button>
        </div>

        {/* Media Selection / Upload Section */}
        {postType === 'clip' && (
          <div className="space-y-4">
            {!videoFile ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group relative border-2 border-dashed border-[#3d3d3d] hover:border-[#5003BD] rounded-3xl p-8 sm:p-12 text-center bg-[#181818] hover:bg-[#1f1f1f] transition-all cursor-pointer flex flex-col items-center justify-center gap-4"
              >
                <div className="p-4 rounded-2xl bg-[#282828] border border-[#3a3a3a] text-purple-400 group-hover:scale-110 transition-all">
                  <UploadCloud className="w-10 h-10" />
                </div>
                <div>
                  <p className="font-bold text-base sm:text-lg text-white">
                    Tap to select gaming video clip
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supports MP4, WEBM, MOV • Max 2 minutes (120s)
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#222222] border border-[#333333] text-xs font-medium text-gray-300">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Clips over 2 minutes can be trimmed using the built-in tool</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4 rounded-3xl bg-[#181818] border border-[#2a2a2a] p-4 sm:p-6">
                
                {/* Video Player & Preview */}
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-[#2e2e2e] flex items-center justify-center group">
                  {videoPreview && (
                    <video
                      ref={videoRef}
                      src={videoPreview || undefined}
                      className="w-full h-full object-contain"
                      playsInline
                      muted
                      loop={false}
                    />
                  )}

                  <button
                    type="button"
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <div className="p-4 rounded-full bg-[#5003BD] text-white shadow-xl hover:scale-110 transition-transform">
                      {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={clearVideo}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-black/80 border border-red-500/40 text-red-400 hover:text-white hover:bg-red-600 transition-all cursor-pointer shadow-lg z-10"
                    title="Remove Video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-black/80 border border-white/10 text-xs font-mono font-bold text-gray-200">
                    Selected Segment: {formatSecs(selectedSpan)} / 2:00 max
                  </div>
                </div>

                {/* Trimming Controls for Video */}
                <div className="p-4 rounded-2xl bg-[#202020] border border-[#303030] space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Scissors className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-sm text-white uppercase tracking-wider">
                        Video Trim Selector
                      </span>
                    </div>

                    <span className="text-xs font-mono font-semibold text-gray-400">
                      Total Length: {formatSecs(videoDuration)}
                    </span>
                  </div>

                  {videoDuration > 120 && (
                    <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-medium">
                      ⚡ Video is longer than 2 minutes. Use the sliders below to pick your favorite 2-minute highlight segment to trim before publishing.
                    </div>
                  )}

                  {/* Trim Range Handles */}
                  <div className="space-y-3 pt-1">
                    {/* Start Time */}
                    <div>
                      <div className="flex justify-between text-xs font-medium text-gray-300 mb-1">
                        <span>Trim Start: <strong className="text-purple-300 font-mono">{formatSecs(trimStart)}</strong></span>
                        <div className="flex items-center gap-1">
                          <button 
                            type="button" 
                            onClick={() => setTrimStart(prev => Math.max(0, prev - 1))}
                            className="px-2 py-0.5 rounded bg-[#2c2c2c] text-[10px] hover:bg-[#383838] font-bold text-gray-200 cursor-pointer"
                          >
                            -1s
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setTrimStart(prev => Math.min(trimEnd - 1, prev + 1))}
                            className="px-2 py-0.5 rounded bg-[#2c2c2c] text-[10px] hover:bg-[#383838] font-bold text-gray-200 cursor-pointer"
                          >
                            +1s
                          </button>
                        </div>
                      </div>
                      <input 
                        type="range"
                        min={0}
                        max={Math.max(1, videoDuration - 1)}
                        step={0.5}
                        value={trimStart}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val < trimEnd) setTrimStart(val);
                        }}
                        className="w-full accent-[#5003BD] cursor-pointer h-2 bg-[#121212] rounded-lg"
                      />
                    </div>

                    {/* End Time */}
                    <div>
                      <div className="flex justify-between text-xs font-medium text-gray-300 mb-1">
                        <span>Trim End: <strong className="text-purple-300 font-mono">{formatSecs(trimEnd)}</strong></span>
                        <div className="flex items-center gap-1">
                          <button 
                            type="button" 
                            onClick={() => setTrimEnd(prev => Math.max(trimStart + 1, prev - 1))}
                            className="px-2 py-0.5 rounded bg-[#2c2c2c] text-[10px] hover:bg-[#383838] font-bold text-gray-200 cursor-pointer"
                          >
                            -1s
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setTrimEnd(prev => Math.min(videoDuration, prev + 1))}
                            className="px-2 py-0.5 rounded bg-[#2c2c2c] text-[10px] hover:bg-[#383838] font-bold text-gray-200 cursor-pointer"
                          >
                            +1s
                          </button>
                        </div>
                      </div>
                      <input 
                        type="range"
                        min={1}
                        max={Math.max(1, videoDuration)}
                        step={0.5}
                        value={trimEnd}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (val > trimStart) setTrimEnd(val);
                        }}
                        className="w-full accent-[#5003BD] cursor-pointer h-2 bg-[#121212] rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Media Gallery Selector */}
        {postType === 'image' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Screenshots ({imageFiles.length}/10)
              </span>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#222222] border border-[#333333] text-xs font-bold text-gray-200 hover:text-white hover:bg-[#2c2c2c] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-purple-400" />
                <span>Add Images</span>
              </button>
            </div>

            {imagePreviews.length === 0 ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#3a3a3a] hover:border-[#5003BD] rounded-3xl p-8 sm:p-12 text-center bg-[#181818] hover:bg-[#1f1f1f] transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
              >
                <Image className="w-10 h-10 text-purple-400" />
                <p className="font-bold text-sm text-white">
                  Tap to upload high-res screenshots
                </p>
                <p className="text-xs text-gray-400">
                  Select up to 10 images
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-2xl overflow-hidden bg-black border border-[#2a2a2a] group">
                    <img src={src || undefined} alt="Upload preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-red-400 hover:text-white transition-all shadow-md cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Details Inputs: Title, Description, Game Category, Tags */}
        <div className="space-y-4 rounded-3xl bg-[#181818] border border-[#282828] p-5 sm:p-6 shadow-xl">
          
          {/* Clip Title Input */}
          {postType === 'clip' && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Insane 1v4 Clutch Squad Wipe!"
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl bg-[#222222] border border-[#333333] text-white placeholder-gray-500 focus:outline-none focus:border-[#5003BD] text-sm font-medium transition-colors"
              />
            </div>
          )}

          {/* Description (Caption) Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Tell your squad what happened in this post..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-xl bg-[#222222] border border-[#333333] text-white placeholder-gray-500 focus:outline-none focus:border-[#5003BD] text-sm font-medium resize-none transition-colors"
            />
          </div>

          {/* Game Category Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
              Game Category
            </label>
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
              {AVAILABLE_GAMES.map(game => (
                <button
                  key={game}
                  type="button"
                  onClick={() => setSelectedGame(game)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedGame === game
                      ? 'bg-[#5003BD] border-[#7000FF] text-white shadow-md'
                      : 'bg-[#222222] border-[#333333] text-gray-400 hover:text-white hover:bg-[#2a2a2a]'
                  }`}
                >
                  {game}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
              Tags (Up to 5)
            </label>

            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#5003BD]/40 border border-[#7000FF]/50 text-xs font-bold text-purple-200">
                  #{t}
                  <button type="button" onClick={() => handleToggleTag(t)} className="text-gray-300 hover:text-white cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <form onSubmit={handleAddCustomTag} className="flex gap-2 mb-3">
              <input
                type="text"
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
                placeholder="Add tag..."
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#222222] border border-[#333333] text-white placeholder-gray-500 text-xs focus:outline-none focus:border-[#5003BD]"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#2c2c2c] border border-[#3d3d3d] text-xs font-bold text-gray-200 hover:bg-[#383838] hover:text-white transition-all cursor-pointer"
              >
                Add
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_TAGS.map(pt => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => handleToggleTag(pt)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                    tags.includes(pt)
                      ? 'bg-[#5003BD] text-white'
                      : 'bg-[#222222] text-gray-400 hover:text-white hover:bg-[#2c2c2c]'
                  }`}
                >
                  #{pt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Upload Progress Bar */}
        {isUploading && (
          <div className="p-6 rounded-3xl bg-[#1e1e1e] border border-[#333333] space-y-3 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-gray-200">{uploadStatus}</span>
              <span className="font-mono font-bold text-xs text-purple-400">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-[#121212] rounded-full h-2.5 overflow-hidden border border-[#282828]">
              <div 
                className="bg-[#5003BD] h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Bottom Publish Button */}
        <div className="pt-2 pb-6">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isUploading}
            className="w-full py-4 px-6 rounded-2xl font-black text-base uppercase tracking-wider bg-[#5003BD] hover:bg-[#6004df] text-white shadow-xl shadow-purple-900/40 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Publishing Post...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Publish Post</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
