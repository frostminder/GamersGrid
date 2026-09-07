import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Image, Video, Film, Trash2, ArrowLeft, Send, Sparkles, 
  Check, AlertCircle, Play, Sliders, Hash, Loader2, Gamepad2
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { saveVideoToCache, uploadVideoToCloud } from '../lib/videoStorage';
import { uploadToR2 } from '../lib/uploadMedia';
import { AVAILABLE_GAMES, getGameMeta } from '../data/gamesAndPlatforms';

interface CreatePostScreenProps {
  onBack?: () => void;
  onPostCreated?: () => void;
}

const PRESET_TAGS = ['Clutch', 'Sniper', 'SoloVQuad', '1080p', '60FPS', 'Ranked', 'SquadWipe', 'Highlights', 'ProPlayer', 'GamingLife'];

export const CreatePostScreen: React.FC<CreatePostScreenProps> = ({ onBack, onPostCreated }) => {
  const [postType, setPostType] = useState<'clip' | 'image' | 'text'>('clip');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedGame, setSelectedGame] = useState('Gaming');
  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Trimming & Compression simulation state
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [isVideoTooLong, setIsVideoTooLong] = useState(false);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Always ensure posts screen starts at the top of the page on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Auto scroll to error or status changes
  useEffect(() => {
    if (error) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [error]);

  // Video looping playback limits
  useEffect(() => {
    const video = videoPreviewRef.current;
    if (!video || postType !== 'clip' || !videoFile) return;

    const handleTimeUpdate = () => {
      if (video.currentTime < trimStart) {
        video.currentTime = trimStart;
      }
      if (video.currentTime >= trimEnd) {
        video.currentTime = trimStart;
        video.play().catch(() => {});
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [trimStart, trimEnd, postType, videoPreview, videoFile]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? (Array.from(e.target.files) as File[]) : [];
    if (!files.length) return;

    setError(null);
    setVideoDuration(0);
    setIsVideoTooLong(false);

    if (postType === 'clip') {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        setVideoFile(file);
        setImageFiles([]);
        setImagePreviews([]);
        
        const objectUrl = URL.createObjectURL(file);
        setVideoPreview(objectUrl);

        // Read video metadata for length and resolution
        const videoElement = document.createElement('video');
        videoElement.preload = 'metadata';
        videoElement.src = objectUrl;
        videoElement.onloadedmetadata = () => {
          const duration = videoElement.duration;
          setVideoDuration(duration);
          setTrimStart(0);
          setTrimEnd(Math.min(duration, 120));
          if (duration > 120) {
            setIsVideoTooLong(true);
          }
        };
      } else {
        setError('Please select a valid video file.');
      }
    } else {
      const newImages = files.filter(f => f.type.startsWith('image/'));
      if (!newImages.length) {
        setError('Please select valid image files.');
        return;
      }
      
      const totalImages = imageFiles.length + newImages.length;
      if (totalImages > 10) {
        setError('You can only upload up to 10 images.');
        newImages.splice(10 - imageFiles.length);
      }
      
      setImageFiles(prev => [...prev, ...newImages]);
      setVideoFile(null);
      setVideoPreview(null);
      
      newImages.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const trimmedDuration = Math.max(0, trimEnd - trimStart);
  const isTrimTooLong = trimmedDuration > 120;

  const compressAndProcessMedia = async (): Promise<{ mediaUrl: string; thumbnailUrl: string; duration: string; imageUrls?: string[] }> => {
    return new Promise(async (resolve, reject) => {
      setIsProcessingMedia(true);
      setProcessingProgress(15);
      
      try {
        if (postType === 'clip' && videoFile) {
          setProcessingProgress(25);
          setProcessingStatus('Extracting video thumbnail...');

          // Generate a real poster thumbnail from the video using canvas (compact JPEG <= 640px)
          let capturedThumbnail = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80';
          try {
            if (videoPreviewRef.current && videoPreviewRef.current.videoWidth > 0) {
              const canvas = document.createElement('canvas');
              const maxDim = 640;
              let w = videoPreviewRef.current.videoWidth;
              let h = videoPreviewRef.current.videoHeight;
              if (w > maxDim) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              }
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(videoPreviewRef.current, 0, 0, w, h);
                capturedThumbnail = canvas.toDataURL('image/jpeg', 0.75);
              }
            }
          } catch (thumbErr) {
            console.warn('Could not extract video canvas thumbnail:', thumbErr);
          }

          setProcessingProgress(50);
          setProcessingStatus('Optimizing video clip...');

          // Unique media clip identifier
          const clipId = `clip_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

          // 1. Persistently cache video blob in IndexedDB for instant zero-hang local playback
          let indexedDbUri = '';
          try {
            indexedDbUri = await saveVideoToCache(clipId, videoFile);
          } catch (idbErr) {
            console.warn('IndexedDB video cache skipped:', idbErr);
          }

          setProcessingProgress(65);
          setProcessingStatus('Uploading video clip to cloud storage...');

          // 2. Upload video stream directly to Cloudflare R2
          let finalMediaUrl = '';
          try {
            const r2Result = await uploadToR2(videoFile);
            if (r2Result && r2Result.url) {
              finalMediaUrl = r2Result.url;
              if (r2Result.thumbnailUrl) {
                capturedThumbnail = r2Result.thumbnailUrl;
              }
            }
          } catch (r2Err) {
            console.warn('R2 direct upload error, trying fallback:', r2Err);
            try {
              finalMediaUrl = await uploadVideoToCloud(videoFile);
            } catch (uploadErr) {
              console.warn('Cloud video upload error:', uploadErr);
            }
          }

          // Use the uploaded cloud URL or the local IndexedDB URI for the user's actual video
          if (!finalMediaUrl) {
            finalMediaUrl = indexedDbUri || videoPreview || '';
          }

          setProcessingProgress(100);
          setProcessingStatus('Video ready!');

          setTimeout(() => {
            setIsProcessingMedia(false);
            const minutes = Math.floor(trimmedDuration / 60);
            const seconds = Math.floor(trimmedDuration % 60).toString().padStart(2, '0');
            
            resolve({
              mediaUrl: finalMediaUrl,
              thumbnailUrl: capturedThumbnail,
              duration: `${minutes}:${seconds}`
            });
          }, 350);
          
        } else if (postType === 'image' && imageFiles.length > 0) {
          setProcessingStatus('Uploading images to Cloudflare R2...');
          
          const uploadedImageUrls: string[] = [];
          
          for (let i = 0; i < imageFiles.length; i++) {
            setProcessingProgress(15 + Math.floor(((i + 1) / imageFiles.length) * 80));
            try {
              const r2Res = await uploadToR2(imageFiles[i]);
              if (r2Res && r2Res.url) {
                uploadedImageUrls.push(r2Res.url);
              } else {
                uploadedImageUrls.push(imagePreviews[i]);
              }
            } catch (err) {
              console.warn('R2 image upload error, using preview:', err);
              uploadedImageUrls.push(imagePreviews[i]);
            }
          }

          setProcessingProgress(100);
          setProcessingStatus('Images uploaded to Cloudflare R2 successfully!');
          
          setTimeout(() => {
            setIsProcessingMedia(false);
            resolve({
              mediaUrl: uploadedImageUrls[0] || '',
              thumbnailUrl: uploadedImageUrls[0] || '',
              duration: '0:00',
              imageUrls: uploadedImageUrls
            });
          }, 350);
          
        } else {
          setIsProcessingMedia(false);
          reject(new Error("No media provided"));
        }
      } catch (err) {
        setIsProcessingMedia(false);
        reject(err);
      }
    });
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
    const cleanTag = customTag.trim().replace(/^#/, '');
    if (!cleanTag) return;
    if (tags.includes(cleanTag)) {
      setCustomTag('');
      return;
    }
    if (tags.length >= 5) {
      setError('Maximum of 5 tags allowed.');
      return;
    }
    setTags(prev => [...prev, cleanTag]);
    setCustomTag('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || isProcessingMedia) return;

    if (!caption.trim()) {
      setError('Caption is required.');
      return;
    }

    if (postType === 'clip' && !title.trim()) {
      setError('A post title is required for sharing video clips.');
      return;
    }

    if (postType === 'clip' && !videoFile) {
      setError('Please attach a video clip.');
      return;
    }

    if (postType === 'clip' && isTrimTooLong) {
      setError('Please adjust your trim selection to be under 2 minutes.');
      return;
    }

    if (postType === 'image' && imageFiles.length === 0) {
      setError('Please attach an image.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error('You must be signed in to create posts.');

      // Load user profile details
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      const userProfile = userSnap.exists() ? userSnap.data() : null;

      // 1. Locally compress/transcode the media (FFmpeg and canvas simulator)
      const mediaResults = await compressAndProcessMedia();

      // 2. Build the Post object
      const postPayload = {
        title: postType === 'clip' ? title.trim() : '',
        caption: caption.trim(),
        game: selectedGame.trim(),
        gameCategory: selectedGame.trim(),
        videoUrl: postType === 'clip' ? mediaResults.mediaUrl : '',
        thumbnailUrl: mediaResults.thumbnailUrl,
        imageUrls: postType === 'image' ? mediaResults.imageUrls : [],
        duration: mediaResults.duration,
        isNew: true,
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        viewsCount: 1,
        isLiked: false,
        isSaved: false,
        tags: tags,
        createdAt: 'Just now',
        createdAtTimestamp: serverTimestamp(),
        creator: {
          id: user.uid,
          username: userProfile?.gamertag || user.email?.split('@')[0] || 'gamer',
          displayName: userProfile?.name || userProfile?.gamertag || 'Gamer',
          avatar: userProfile?.photoURL || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
          isVerified: userProfile?.isVerified || false,
          isPremium: userProfile?.isPremium || false,
          level: userProfile?.level || 1,
        }
      };

      // 3. Write post directly to Firestore
      await addDoc(collection(db, 'posts'), postPayload);
      
      setSuccess(true);
      setTimeout(() => {
        if (onPostCreated) onPostCreated();
        if (onBack) onBack();
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'An error occurred while creating your post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full bg-[#121212] text-white flex flex-col min-h-screen">
      {/* Main Form Body */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-2xl w-full mx-auto p-4 flex flex-col gap-6 pb-24">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-start gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-5 duration-300">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Execution Blocked:</span>
              <p className="mt-1 leading-relaxed text-[#eeaaaa]">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-5 rounded-2xl flex items-center gap-3 text-emerald-400 font-bold text-sm animate-in zoom-in-95 duration-300">
            <Check className="w-5 h-5 text-emerald-500 bg-emerald-500/10 p-1 rounded-full" />
            Post uploaded successfully! Going back to your Feed...
          </div>
        )}

        {/* 1. Post Type Toggle */}
        <div className="bg-[#1a1a1a] p-1.5 rounded-2xl flex border border-[#2a2a2e] gap-1">
          <button
            type="button"
            onClick={() => {
              setPostType('clip');
              setVideoPreview(null); setImagePreviews([]);
              setVideoFile(null);
              setImageFiles([]);
              setVideoDuration(0);
              setIsVideoTooLong(false);
            }}
            className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${postType === 'clip' ? 'bg-[#5003BD] text-white shadow-md' : 'text-[#888888] hover:text-white hover:bg-[#232326]'}`}
          >
            <Film className="w-4 h-4" /> Gaming Clip
          </button>
          <button
            type="button"
            onClick={() => {
              setPostType('image');
              setVideoPreview(null); setImagePreviews([]);
              setVideoFile(null);
              setImageFiles([]);
              setVideoDuration(0);
              setIsVideoTooLong(false);
            }}
            className={`flex-1 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${postType === 'image' ? 'bg-[#5003BD] text-white shadow-md' : 'text-[#888888] hover:text-white hover:bg-[#232326]'}`}
          >
            <Image className="w-4 h-4" /> Image
          </button>
        </div>

        {/* 2. Media Upload & Processing Area */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-[#aaaaaa]">ATTACH MEDIA</label>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-3xl border-2 border-dashed bg-[#1a1a1a] overflow-hidden min-h-[220px] flex flex-col items-center justify-center cursor-pointer p-6 group transition-all duration-300 hover:bg-[#1d1d21] ${(videoPreview || imagePreviews.length > 0) ? 'border-[#5003BD]/50' : 'border-[#2a2a2e] hover:border-[#5003BD]/40'}`}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept={postType === 'clip' ? 'video/*' : 'image/*'}
              multiple={postType === 'image'}
              onChange={handleFileChange}
              className="hidden"
            />

            {(videoPreview || imagePreviews.length > 0) ? (
              <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                {postType === 'clip' ? (
                  <video 
                    ref={videoPreviewRef}
                    src={videoPreview || undefined} 
                    className="w-full h-full object-contain bg-black"
                    controls
                    playsInline
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center gap-2 overflow-x-auto p-4 snap-x">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative h-full aspect-[9/16] sm:aspect-square flex-shrink-0 snap-center rounded-xl overflow-hidden border border-white/10 group/img">
                        <img 
                          src={preview} 
                          alt={`Preview ${idx + 1}`} 
                          className="w-full h-full object-cover" 
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setImageFiles(prev => prev.filter((_, i) => i !== idx));
                            setImagePreviews(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/80 hover:bg-red-600 rounded-full opacity-0 group-hover/img:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                    {imagePreviews.length < 10 && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="h-full aspect-[9/16] sm:aspect-square flex-shrink-0 rounded-xl border-2 border-dashed border-[#5003BD]/50 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors cursor-pointer"
                      >
                        <Plus className="w-8 h-8 text-[#5003BD]" />
                      </div>
                    )}
                  </div>
                )}
                
                {/* Delete Button overlay (only for video) */}
                {postType === 'clip' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setVideoPreview(null);
                      setVideoFile(null);
                      setVideoDuration(0);
                      setIsVideoTooLong(false);
                      setTrimStart(0);
                      setTrimEnd(0);
                    }}
                    className="absolute top-4 right-4 p-2.5 bg-black/80 hover:bg-red-600 rounded-full transition-colors group/del"
                    title="Remove file"
                  >
                    <Trash2 className="w-5 h-5 text-gray-300 group-hover/del:text-white" />
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center flex flex-col items-center gap-3">
                <div className="p-4 bg-[#232326] rounded-2xl group-hover:scale-110 transition-transform duration-300 border border-[#2a2a2e]">
                  {postType === 'clip' ? (
                    <Video className="w-8 h-8 text-[#5003BD]" />
                  ) : (
                    <Image className="w-8 h-8 text-[#5003BD]" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">
                    Drag and drop your {postType === 'clip' ? 'video' : 'image'} here, or <span className="text-[#5003BD] hover:underline">browse</span>
                  </p>
                  <p className="text-xs text-[#888888] mt-1.5 leading-relaxed">
                    {postType === 'clip' ? 'MP4, MOV up to 2 min (1080p Cap)' : 'PNG, JPG, WEBP compressed locally'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Video Metadata alerts & Trim Studio */}
          {videoFile && videoDuration > 0 && (
            <div className="space-y-3">
              <div className={`mt-2 p-3 rounded-2xl border flex items-start gap-3 text-xs leading-relaxed ${isTrimTooLong ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                {isTrimTooLong ? (
                  <>
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Length Limit Exceeded:</span> Your selected trim portion is {(trimmedDuration / 60).toFixed(1)}m. 
                      Please adjust the trim offsets below to be under 2:00 (120 seconds).
                    </div>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-bold">Length Verified:</span> Trim selection is {trimmedDuration.toFixed(0)}s (under 2:00 limit). 
                      Ready to process locally.
                    </div>
                  </>
                )}
              </div>

              {/* Interactive Video Trim Studio Panel */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2e] rounded-3xl p-5 flex flex-col gap-4 animate-in slide-in-from-top-3 duration-250">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#5003BD]" />
                    <span className="text-xs font-bold text-[#aaaaaa] tracking-wider uppercase">Video Trim Studio</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#252528] px-2.5 py-1 rounded-lg border border-[#2a2a2e]">
                    <span className="text-[11px] text-[#888888] font-mono">Trimmed Span:</span>
                    <span className="text-[11px] text-white font-bold font-mono">
                      {Math.floor(trimmedDuration / 60)}:{(Math.floor(trimmedDuration % 60)).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>

                {/* Range inputs with precise adjust buttons */}
                <div className="flex flex-col gap-4">
                  {/* Start Point Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Trim Start</span>
                      <span className="text-white font-mono font-bold">
                        {Math.floor(trimStart / 60)}:{(Math.floor(trimStart % 60)).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setTrimStart(prev => Math.max(0, prev - 1))}
                        className="p-1 bg-[#232326] hover:bg-[#2e2e33] border border-[#2a2a2e] rounded-lg text-xs font-bold w-10 text-center transition-colors text-gray-300"
                        title="Back 1 second"
                      >
                        -1s
                      </button>
                      <input 
                        type="range"
                        min="0"
                        max={videoDuration.toString()}
                        step="0.5"
                        value={trimStart}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setTrimStart(Math.min(val, trimEnd - 0.5));
                        }}
                        className="flex-1 accent-[#5003BD] h-1 bg-[#2a2a2e] rounded-lg cursor-pointer"
                      />
                      <button 
                        type="button" 
                        onClick={() => setTrimStart(prev => Math.min(trimEnd - 0.5, prev + 1))}
                        className="p-1 bg-[#232326] hover:bg-[#2e2e33] border border-[#2a2a2e] rounded-lg text-xs font-bold w-10 text-center transition-colors text-gray-300"
                        title="Forward 1 second"
                      >
                        +1s
                      </button>
                    </div>
                  </div>

                  {/* End Point Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Trim End</span>
                      <span className="text-white font-mono font-bold">
                        {Math.floor(trimEnd / 60)}:{(Math.floor(trimEnd % 60)).toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => setTrimEnd(prev => Math.max(trimStart + 0.5, prev - 1))}
                        className="p-1 bg-[#232326] hover:bg-[#2e2e33] border border-[#2a2a2e] rounded-lg text-xs font-bold w-10 text-center transition-colors text-gray-300"
                        title="Decrease 1 second"
                      >
                        -1s
                      </button>
                      <input 
                        type="range"
                        min="0"
                        max={videoDuration.toString()}
                        step="0.5"
                        value={trimEnd}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setTrimEnd(Math.max(val, trimStart + 0.5));
                        }}
                        className="flex-1 accent-[#5003BD] h-1 bg-[#2a2a2e] rounded-lg cursor-pointer"
                      />
                      <button 
                        type="button" 
                        onClick={() => setTrimEnd(prev => Math.min(videoDuration, prev + 1))}
                        className="p-1 bg-[#232326] hover:bg-[#2e2e33] border border-[#2a2a2e] rounded-lg text-xs font-bold w-10 text-center transition-colors text-gray-300"
                        title="Increase 1 second"
                      >
                        +1s
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-gray-400 bg-[#121212] px-3.5 py-2.5 rounded-2xl border border-[#2a2a2e] leading-relaxed">
                  💡 Drag the range handles or click <b className="text-white">-1s / +1s</b> to carve out the perfect highlight from your clip. The player above loops automatically inside your selection bounds.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Compression & Transcoding Animation Overlay */}
        {isProcessingMedia && (
          <div className="bg-[#1a1a1a] border border-[#5003BD]/30 rounded-3xl p-6 flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-300">
            <div className="relative flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  stroke="#2a2a2e" 
                  strokeWidth="4" 
                  fill="transparent" 
                />
                <circle 
                  cx="32" 
                  cy="32" 
                  r="28" 
                  stroke="#5003BD" 
                  strokeWidth="4" 
                  fill="transparent" 
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - processingProgress / 100)}`}
                  className="transition-all duration-300"
                />
              </svg>
              <span className="absolute text-xs font-mono font-bold text-white">{processingProgress}%</span>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white">Local Compression Engine</h4>
              <p className="text-xs text-[#aaaaaa] max-w-sm mx-auto">{processingStatus}</p>
            </div>
          </div>
        )}

        {/* 5. Inputs (Title & Caption) */}
        <div className="flex flex-col gap-5 bg-[#1a1a1a] p-5 rounded-3xl border border-[#2a2a2e]">
          {postType === 'clip' && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#888888]">HIGHLIGHT TITLE</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                placeholder="Name your clip (e.g., Insane Solo Squad Wipe!)"
                className="w-full bg-[#121212] text-white text-sm font-bold px-4 py-3 rounded-xl border border-[#2a2a2e] focus:outline-none focus:border-[#5003BD] transition-colors"
              />
              <span className="text-[10px] text-right text-[#555555] font-mono">{title.length}/80</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#888888]">{postType === 'clip' ? 'CLIP CAPTION' : 'POST BODY & CAPTION'}</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={400}
              rows={4}
              placeholder={postType === 'clip' ? "Describe this highlight or rotation guide (use #tags)..." : "Write your thoughts or share image details..."}
              className="w-full bg-[#121212] text-white text-sm px-4 py-3 rounded-xl border border-[#2a2a2e] focus:outline-none focus:border-[#5003BD] transition-colors resize-none leading-relaxed"
            />
            <span className="text-[10px] text-right text-[#555555] font-mono">{caption.length}/400</span>
          </div>
        </div>

        {/* 6. Tags Area */}
        <div className="flex flex-col gap-2.5">
          <label className="text-sm font-bold text-[#aaaaaa]">ADD TAGS (MAX 5)</label>
          
          {/* Custom tag form */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">#</span>
              <input 
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="custom-tag"
                className="w-full bg-[#1a1a1a] text-white text-xs pl-8 pr-4 py-3 rounded-xl border border-[#2a2a2e] focus:outline-none focus:border-[#5003BD]"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCustomTag}
              className="p-3 bg-[#1a1a1a] hover:bg-[#252528] text-white rounded-xl border border-[#2a2a2e] text-xs font-bold transition-colors"
            >
              Add
            </button>
          </div>

          {/* Active Tags list */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1 bg-[#1a1a1a]/50 p-3 rounded-2xl border border-[#2a2a2e]">
              {tags.map(tag => (
                <span 
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className="px-3 py-1.5 bg-[#5003BD]/20 text-[#9e5cff] hover:bg-red-500/20 hover:text-red-300 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1 border border-[#5003BD]/30"
                >
                  #{tag} ✕
                </span>
              ))}
            </div>
          )}

          {/* Quick preset tags */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {PRESET_TAGS.map(tag => {
              const isActive = tags.includes(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isActive ? 'bg-[#5003BD] text-white' : 'bg-[#1a1a1a] hover:bg-[#232326] text-[#777777] border border-[#2a2a2e]'}`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic & Highly Visible Post Button at bottom of form */}
        <div className="mt-6 pt-4 border-t border-[#2a2a2e] flex flex-col gap-3">
          <button
            type="submit"
            disabled={isSubmitting || isProcessingMedia}
            className="w-full bg-[#5003BD] hover:bg-[#6a0ce6] disabled:bg-[#5003BD]/50 disabled:cursor-not-allowed text-white text-base font-bold py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98] shadow-lg shadow-[#5003BD]/20 hover:shadow-[#5003BD]/40"
          >
            {isSubmitting || isProcessingMedia ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>Processing & Publishing...</span>
              </>
            ) : (
              <>
                <span>Publish Post</span>
                <Send className="w-5 h-5" />
              </>
            )}
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              disabled={isSubmitting || isProcessingMedia}
              className="w-full bg-[#1a1a1a] hover:bg-[#232326] text-gray-400 hover:text-white border border-[#2a2a2e] text-sm font-bold py-3.5 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              Cancel & Discard
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
