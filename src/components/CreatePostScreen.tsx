import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Video, Image, Send, Trash2, AlertCircle, 
  Loader2, Plus, Hash, X, BarChart2, UploadCloud, Clock
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { uploadToR2 } from '../lib/uploadMedia';
import { AVAILABLE_GAMES } from '../data/gamesAndPlatforms';
import { VideoTrimmer } from './VideoTrimmer';
import { VideoSegment, processVideoWithFfmpeg, compressImage, formatFileSize } from '../lib/videoProcessor';

interface CreatePostScreenProps {
  onBack?: () => void;
  onPostCreated?: () => void;
}

const PRESET_TAGS = ['Clutch', 'Sniper', 'SoloVQuad', 'Ranked', 'SquadWipe', 'Highlights', 'ProPlayer', 'GamingLife', 'Victory', 'ApexLegends'];

export const CreatePostScreen: React.FC<CreatePostScreenProps> = ({ onBack, onPostCreated }) => {
  const [postType, setPostType] = useState<'clip' | 'image' | 'text' | 'poll'>('clip');
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
  const [segments, setSegments] = useState<VideoSegment[]>([]);

  // Poll State
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollExpiryDays, setPollExpiryDays] = useState(1);

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
        setSegments([{ start: 0, end: dur, keep: true }]);
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
    setSegments([]);
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

  const totalKeptDuration = segments.filter(s => s.keep).reduce((acc, s) => acc + (s.end - s.start), 0);
  const isTrimOverLimit = totalKeptDuration > 120.5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;

    if (!caption.trim() && postType !== 'poll') {
      setError('Please enter a description for your post.');
      return;
    }

    if (postType === 'poll') {
      if (!pollQuestion.trim()) {
        setError('Please enter a question for your poll.');
        return;
      }
      const validOptions = pollOptions.filter(o => o.trim());
      if (validOptions.length < 2) {
        setError('Polls must have at least 2 options.');
        return;
      }
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
    setUploadProgress(10);
    setUploadStatus('Preparing files...');

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
      let moderationStatus = 'approved';
      
      // Moderation call
      setUploadStatus('Checking content guidelines...');
      const textToModerate = postType === 'poll' ? `${pollQuestion} ${pollOptions.join(' ')}` : `${title} ${caption}`;
      try {
        const modRes = await fetch('/api/moderate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToModerate })
        });
        if (modRes.ok) {
          const modData = await modRes.json();
          moderationStatus = modData.status;
          if (modData.status === 'rejected') {
            throw new Error('Your post violates our content guidelines (NSFW/Hate Speech). Please revise.');
          }
        }
      } catch (modErr: any) {
        if (modErr.message.includes('violates')) {
          throw modErr;
        }
        // otherwise fail open
        console.warn('Moderation check skipped or failed:', modErr);
      }
      
      if (postType === 'clip' && videoFile) {
        setUploadProgress(20);
        setUploadStatus('Processing video clip...');

        let videoToUpload = videoFile;
        const keepsAll = segments.length === 1 && segments[0].keep && segments[0].start === 0 && segments[0].end === videoDuration;
        
        if (!keepsAll) {
          videoToUpload = await processVideoWithFfmpeg(videoFile, segments, (prog) => {
            setUploadProgress(20 + prog * 0.4);
          });
        }
        
        setUploadStatus('Uploading video clip...');
        setUploadProgress(60);

        const r2Res = await uploadToR2(videoToUpload);
        if (!r2Res || !r2Res.url) {
          throw new Error('Failed to process video clip. Please try a different clip.');
        }

        finalVideoUrl = r2Res.url;
        if (r2Res.thumbnailUrl) {
          finalThumbnailUrl = r2Res.thumbnailUrl;
        }

        const mins = Math.floor(totalKeptDuration / 60);
        const secs = Math.floor(totalKeptDuration % 60).toString().padStart(2, '0');
        formattedDuration = `${mins}:${secs}`;
      } else if (postType === 'image' && imageFiles.length > 0) {
        setUploadStatus('Processing and uploading images...');

        for (let i = 0; i < imageFiles.length; i++) {
          setUploadProgress(20 + Math.floor(((i + 1) / imageFiles.length) * 60));
          const compressed = await compressImage(imageFiles[i]);
          const r2Res = await uploadToR2(compressed);
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

      const postPayload: any = {
        type: postType,
        title: postType === 'clip' ? title.trim() : '',
        caption: postType === 'poll' ? pollQuestion.trim() : caption.trim(),
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
        tags: tags,
        moderationStatus
      };

      if (postType === 'poll') {
        const validOptions = pollOptions.filter(o => o.trim());
        postPayload.pollQuestion = pollQuestion.trim();
        postPayload.pollOptions = validOptions.map(opt => ({ text: opt.trim(), votes: 0 }));
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + pollExpiryDays);
        postPayload.pollExpiry = expiryDate.getTime();
      }

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-[#1e1e1e] border border-[#2a2a2a]">
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
            <span>Gallery</span>
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

          <button
            type="button"
            onClick={() => {
              setPostType('poll');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              postType === 'poll' 
                ? 'bg-[#5003BD] text-white shadow-md' 
                : 'text-gray-400 hover:text-white hover:bg-[#282828]'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Poll</span>
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
                
                {/* Video Player & Trimmer UI */}
                {videoPreview && videoFile && (
                  <VideoTrimmer 
                    videoFile={videoFile}
                    videoPreview={videoPreview}
                    videoDuration={videoDuration}
                    segments={segments}
                    setSegments={setSegments}
                  />
                )}

                <button
                  type="button"
                  onClick={clearVideo}
                  className="w-full mt-4 py-2 rounded-xl border border-red-500/40 text-red-400 hover:text-white hover:bg-red-600 transition-all cursor-pointer shadow-lg"
                >
                  <Trash2 className="w-4 h-4 inline-block mr-2" />
                  Remove Video
                </button>
              </div>
            )}
          </div>
        )}

        {/* Media Gallery Selector */}
        {postType === 'image' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Images ({imageFiles.length}/10)
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
                  Tap to upload images
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

        {/* Poll Builder Section */}
        {postType === 'poll' && (
          <div className="space-y-4 rounded-3xl bg-[#181818] border border-[#282828] p-5 sm:p-6 shadow-xl">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                Poll Question *
              </label>
              <input
                type="text"
                value={pollQuestion}
                onChange={e => setPollQuestion(e.target.value)}
                placeholder="Ask the community a question..."
                maxLength={200}
                className="w-full px-4 py-3 rounded-xl bg-[#222222] border border-[#333333] text-white placeholder-gray-500 focus:outline-none focus:border-[#5003BD] text-sm font-medium transition-colors"
              />
            </div>
            
            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300">
                Poll Options ({pollOptions.length}/6)
              </label>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[i] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                    placeholder={`Option ${i + 1}`}
                    maxLength={100}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-[#222222] border border-[#333333] text-white placeholder-gray-500 focus:outline-none focus:border-[#5003BD] text-sm font-medium transition-colors"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() => setPollOptions(prev => prev.filter((_, idx) => idx !== i))}
                      className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              
              {pollOptions.length < 6 && (
                <button
                  type="button"
                  onClick={() => setPollOptions(prev => [...prev, ''])}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#222222] border border-[#333333] text-purple-400 font-bold text-sm hover:bg-[#2c2c2c] transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
                Poll Duration
              </label>
              <select
                value={pollExpiryDays}
                onChange={(e) => setPollExpiryDays(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-[#222222] border border-[#333333] text-white focus:outline-none focus:border-[#5003BD] text-sm font-medium appearance-none cursor-pointer"
              >
                <option value={1}>1 Day</option>
                <option value={3}>3 Days</option>
                <option value={7}>7 Days</option>
                <option value={30}>30 Days</option>
              </select>
            </div>
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
          {postType !== 'poll' && (
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
          )}

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
