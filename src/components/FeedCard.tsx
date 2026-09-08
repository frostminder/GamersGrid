import React, { useState, useRef, useEffect } from 'react';
import { 
  Heart, MessageSquare, Share2, Bookmark, Play, Pause,
  ShieldCheck, Send, CornerDownRight, AlertCircle, Sparkles,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { Post, Comment } from '../types/mockData';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { resolvePlayableVideoUrl } from '../lib/videoStorage';

interface FeedCardProps {
  post: Post;
  currentUserId?: string;
  currentUsername?: string;
  isFollowing?: boolean;
  onLike: (postId: string) => void;
  onFollow: (userId: string) => void;
  onOpenComments?: (post: Post) => void;
  onOpenClipModal: (post: Post) => void;
  onAddComment?: (postId: string, text: string) => void;
  onTipCoins?: (post: Post) => void;
  onSave: (postId: string) => void;
}

const formatPostTimestamp = (val: any): string => {
  if (!val) return 'Just now';
  if (typeof val === 'string') return val;
  if (typeof val === 'number') {
    const secsAgo = Math.floor((Date.now() - val) / 1000);
    if (secsAgo < 60) return 'Just now';
    if (secsAgo < 3600) return `${Math.floor(secsAgo / 60)}m ago`;
    if (secsAgo < 86400) return `${Math.floor(secsAgo / 3600)}h ago`;
    return `${Math.floor(secsAgo / 86400)}d ago`;
  }
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        const d = val.toDate();
        const secsAgo = Math.floor((Date.now() - d.getTime()) / 1000);
        if (secsAgo < 60) return 'Just now';
        if (secsAgo < 3600) return `${Math.floor(secsAgo / 60)}m ago`;
        if (secsAgo < 86400) return `${Math.floor(secsAgo / 3600)}h ago`;
        return `${Math.floor(secsAgo / 86400)}d ago`;
      } catch (e) {
        return 'Just now';
      }
    }
    if (typeof val.seconds === 'number') {
      const secsAgo = Math.floor((Date.now() - val.seconds * 1000) / 1000);
      if (secsAgo < 60) return 'Just now';
      if (secsAgo < 3600) return `${Math.floor(secsAgo / 60)}m ago`;
      if (secsAgo < 86400) return `${Math.floor(secsAgo / 3600)}h ago`;
      return `${Math.floor(secsAgo / 86400)}d ago`;
    }
  }
  return 'Just now';
};

export const FeedCard: React.FC<FeedCardProps> = ({
  post,
  currentUserId,
  currentUsername,
  isFollowing: isFollowingProp,
  onLike,
  onFollow,
  onOpenClipModal,
  onAddComment,
  onSave,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Dynamic Video Player State
  const [playableVideoSrc, setPlayableVideoSrc] = useState<string>(() => {
    if (!post.videoUrl) return '';
    return post.videoUrl;
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Multi-image Carousel State
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const imageSliderRef = useRef<HTMLDivElement>(null);

  // Inline Commenting State
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentsList, setCommentsList] = useState<Comment[]>(post.comments || []);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  // Resolve playable video URL (e.g. if cached locally in IndexedDB or direct stream)
  useEffect(() => {
    let isMounted = true;
    if (post.videoUrl) {
      resolvePlayableVideoUrl(post.videoUrl).then((resolved) => {
        if (isMounted && resolved) {
          setPlayableVideoSrc(resolved);
          setVideoError(false);
        }
      });
    } else {
      setPlayableVideoSrc('');
    }
    return () => {
      isMounted = false;
    };
  }, [post.videoUrl]);

  const handleImageScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.clientWidth > 0) {
      const idx = Math.round(container.scrollLeft / container.clientWidth);
      if (idx !== activeImageIndex && idx >= 0 && (!post.imageUrls || idx < post.imageUrls.length)) {
        setActiveImageIndex(idx);
      }
    }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageSliderRef.current && activeImageIndex > 0) {
      const nextIdx = activeImageIndex - 1;
      imageSliderRef.current.scrollTo({
        left: nextIdx * imageSliderRef.current.clientWidth,
        behavior: 'smooth'
      });
      setActiveImageIndex(nextIdx);
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageSliderRef.current && post.imageUrls && activeImageIndex < post.imageUrls.length - 1) {
      const nextIdx = activeImageIndex + 1;
      imageSliderRef.current.scrollTo({
        left: nextIdx * imageSliderRef.current.clientWidth,
        behavior: 'smooth'
      });
      setActiveImageIndex(nextIdx);
    }
  };

  const handleSelectImageDot = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (imageSliderRef.current) {
      imageSliderRef.current.scrollTo({
        left: idx * imageSliderRef.current.clientWidth,
        behavior: 'smooth'
      });
      setActiveImageIndex(idx);
    }
  };

  // Determine if this post was authored by the current logged-in user
  const isOwnPost = Boolean(
    currentUserId && (
      post.creator.id === currentUserId ||
      (currentUsername && post.creator.username?.trim().toLowerCase() === currentUsername.trim().toLowerCase()) ||
      (currentUsername && post.creator.displayName?.trim().toLowerCase() === currentUsername.trim().toLowerCase())
    )
  );

  const isFollowing = Boolean(isFollowingProp !== undefined ? isFollowingProp : post.creator.isFollowing);

  // Listen to subcollection comments if available, and merge with post.comments
  useEffect(() => {
    if (!post.id) return;
    
    // Fallback initialize from post prop
    if (post.comments && post.comments.length > 0) {
      setCommentsList(post.comments);
    }

    const commentsRef = collection(db, 'posts', post.id, 'comments');
    const q = query(commentsRef, orderBy('createdAtTimestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const loaded: Comment[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            user: data.user || {
              id: data.authorId || 'gamer',
              username: data.username || 'gamer',
              displayName: data.displayName || 'Gamer',
              avatar: data.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
              level: 1,
              xp: 0
            },
            text: data.text || '',
            createdAt: data.createdAt || 'Recently',
            likes: data.likes || 0
          });
        });
        setCommentsList(loaded);
      }
    }, (err) => {
      // If rules deny or collection not found, rely on prop comments
      if (err.code !== 'permission-denied') {
        console.warn('Comments subcollection listener:', err);
      }
    });

    return () => unsubscribe();
  }, [post.id, post.comments]);

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  // Helper to parse strings like "1:25" or "0:45"
  const parseDurationString = (str?: string) => {
    if (!str) return 0;
    const parts = str.split(':');
    if (parts.length === 2) {
      return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
    }
    return 0;
  };

  // Play / Pause toggle when clicking the video
  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      setVideoError(false);
      videoRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Video play error:', err);
        setIsPlaying(false);
        setVideoError(true);
      });
    }
  };

  // Scrubbing on progress bar
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const totalDuration = duration || parseDurationString(post.duration);
    if (!totalDuration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = clickX * totalDuration;

    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    setVideoProgress(clickX * 100);
  };

  // Double tap to like
  const handleDoubleTapLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.isLiked) {
      onLike(post.id);
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 800);
  };

  // Native share or copy link
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'Gamers Grid Clip',
          text: post.caption || 'Check out this highlight on Gamers Grid!',
          url: window.location.href,
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Submit comment directly from the feed card
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || isSubmittingComment) return;

    const textToSubmit = commentInput.trim();
    setCommentInput('');
    setIsSubmittingComment(true);

    const currentUser = auth.currentUser;
    const userGamerName = currentUsername || currentUser?.email?.split('@')[0] || 'gamer';

    const optimisticComment: Comment = {
      id: `comment_${Date.now()}`,
      user: {
        id: currentUser?.uid || 'guest',
        username: userGamerName,
        displayName: userGamerName,
        avatar: currentUser?.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
        level: 1,
        xp: 0
      },
      text: textToSubmit,
      createdAt: 'Just now',
      likes: 0
    };

    // Optimistic UI update
    setCommentsList(prev => [optimisticComment, ...prev]);

    // Call parent handler
    if (onAddComment) {
      onAddComment(post.id, textToSubmit);
    }

    // Also persist directly to Firestore subcollection if available
    try {
      if (post.id && currentUser) {
        await addDoc(collection(db, 'posts', post.id, 'comments'), {
          authorId: currentUser.uid,
          username: userGamerName,
          displayName: userGamerName,
          avatar: currentUser.photoURL || '',
          text: textToSubmit,
          createdAt: 'Just now',
          createdAtTimestamp: serverTimestamp(),
          likes: 0
        });

        await updateDoc(doc(db, 'posts', post.id), {
          commentsCount: increment(1)
        });
      }
    } catch (err) {
      console.warn('Persisting inline comment error:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const creatorDisplayName = post.creator.displayName || post.creator.username;
  const effectiveCommentsCount = Math.max(post.commentsCount || 0, commentsList.length);

  return (
    <article 
      className="w-full bg-[#1b1b1e] rounded-2xl overflow-hidden border border-[#2A2A2E] hover:border-[#5003BD]/60 transition-all duration-300 shadow-xl relative group"
    >
      {/* 1. Header with Creator Info */}
      <div className="p-3.5 flex items-center justify-between border-b border-[#2A2A2E]/60 bg-[#1e1e24]/70 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`p-0.5 rounded-full ${post.creator.isPremium ? 'bg-gradient-to-tr from-[#5003BD] via-purple-400 to-cyan-400' : 'bg-[#2A2A2E]'}`}>
              <img
                src={post.creator.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                alt={post.creator.username}
                className="w-10 h-10 rounded-full object-cover bg-[#121212]"
              />
            </div>
            {/* Level Badge */}
            <span className="absolute -bottom-1 -right-1 bg-[#121212] border border-[#5003BD] text-[9px] font-black text-white px-1.5 py-0.2 rounded-full">
              {post.creator.level}
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Creator Name formatted with (You) if self */}
              <span 
                onClick={() => onOpenClipModal(post)}
                className="text-sm font-bold text-white hover:text-purple-300 transition-colors cursor-pointer"
              >
                {creatorDisplayName}{isOwnPost ? '(You)' : ''}
              </span>
              {post.creator.isVerified && (
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
              )}
              {post.creator.isPremium && (
                <span className="bg-[#5003BD]/60 text-purple-200 text-[9px] font-bold px-1.5 py-0.2 rounded border border-[#7A22EC]/40">
                  PRO
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#999999]">
              <span>@{post.creator.username}{isOwnPost ? '(You)' : ''}</span>
              <span>•</span>
              <span className="text-[11px] text-[#777777]">{formatPostTimestamp(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Right side: Game tag & Follow Button (hidden if post made by yourself) */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#121212] text-[#CCCCCC] border border-[#2A2A2E]">
            {post.game}
          </span>
          {!isOwnPost && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFollow(post.creator.id);
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                isFollowing
                  ? 'bg-[#121212] text-[#999999] border border-[#2A2A2E] hover:text-red-400 hover:border-red-500/40'
                  : 'bg-[#5003BD] text-white hover:bg-[#7A22EC] shadow-sm shadow-[#5003BD]/30'
              }`}
            >
              {isFollowing ? 'Following' : '+ Follow'}
            </button>
          )}
        </div>
      </div>

      {/* 2. Media / Video / Poll Container */}
      {post.type === 'clip' ? (
        <div 
          className="relative w-full aspect-[16/10] bg-[#0c0c0e] overflow-hidden group/video select-none cursor-pointer"
          onClick={handleTogglePlay}
          onDoubleClick={handleDoubleTapLike}
        >
          {/* Actual Video Player */}
          <div className="w-full h-full relative flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              src={playableVideoSrc || post.videoUrl || undefined}
              poster={post.thumbnailUrl || undefined}
              playsInline
              muted
              loop
              preload="metadata"
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                if (!isNaN(dur) && isFinite(dur) && dur > 0) {
                  setDuration(dur);
                }
              }}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                const dur = v.duration || duration || parseDurationString(post.duration);
                if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
                  setCurrentTime(v.currentTime);
                  setVideoProgress((v.currentTime / dur) * 100);
                }
              }}
              onPlay={() => {
                setIsPlaying(true);
                setIsBuffering(false);
              }}
              onPause={() => setIsPlaying(false)}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onEnded={() => {
                setIsPlaying(false);
                setVideoProgress(0);
                setCurrentTime(0);
              }}
              onError={() => {
                setVideoError(true);
                setIsPlaying(false);
              }}
              className="w-full h-full object-contain"
            />

            {/* Video Error Overlay */}
            {videoError && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center p-6 text-center z-20">
                <AlertCircle className="w-8 h-8 text-purple-400 mb-2" />
                <p className="text-sm text-white font-bold">Unable to stream video clip</p>
                <p className="text-xs text-[#888888] mt-1 max-w-xs">
                  The video file is unavailable or unsupported by the browser format.
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenClipModal(post);
                  }}
                  className="mt-3 px-3.5 py-1.5 bg-[#5003BD] text-white text-xs font-bold rounded-lg hover:bg-[#7A22EC] transition-colors"
                >
                  Open Full Post Details
                </button>
              </div>
            )}

            {/* Buffering Indicator */}
            {isBuffering && isPlaying && !videoError && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-black/20">
                <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Centered Play Button when paused */}
            {!isPlaying && !videoError && (
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center transition-all z-10 pointer-events-none">
                <div className="w-14 h-14 rounded-full bg-[#5003BD]/90 backdrop-blur-md border border-purple-400/60 flex items-center justify-center text-white shadow-[0_0_25px_rgba(80,3,189,0.7)] transform group-hover/video:scale-110 transition-transform">
                  <Play className="w-6 h-6 ml-1 fill-white text-white" />
                </div>
              </div>
            )}

            {/* Real Dynamic Progress Bar (Scrubber) */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-1.5 hover:h-3 bg-white/20 z-30 cursor-pointer transition-all group/scrubber"
              onClick={handleSeek}
              title="Click to seek"
            >
              <div 
                className="h-full bg-gradient-to-r from-[#5003BD] via-purple-500 to-cyan-400 rounded-r relative transition-[width] duration-100 ease-linear"
                style={{ width: `${Math.min(100, Math.max(0, videoProgress))}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover/scrubber:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
          
          {/* Top Badges: Live Time / Duration & Game Category */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20 pointer-events-none">
            <span className="bg-black/80 backdrop-blur-md text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border border-white/10 shadow-sm">
              {formatTime(currentTime)} / {formatTime(duration || parseDurationString(post.duration) || 15)}
            </span>
            {post.gameCategory && (
              <span className="bg-[#5003BD]/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
                {post.gameCategory}
              </span>
            )}
          </div>
        </div>
      ) : post.type === 'image' || (!post.type && post.imageUrls) ? (
        <div 
          className="relative w-full aspect-[16/10] bg-[#0c0c0e] overflow-hidden group/video select-none cursor-pointer"
          onClick={() => onOpenClipModal(post)}
          onDoubleClick={handleDoubleTapLike}
        >
          {post.imageUrls && post.imageUrls.length > 0 ? (
            /* Multi-image carousel with anchored dots, active indicator, and smooth navigation */
            <div className="w-full h-full relative group/slider">
              <div 
                ref={imageSliderRef}
                onScroll={handleImageScroll}
                className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
              >
                {post.imageUrls.map((imgUrl, idx) => (
                  <img
                    key={idx}
                    src={imgUrl}
                    alt={post.title || post.caption || `Photo ${idx + 1}`}
                    className="w-full h-full object-cover flex-shrink-0 snap-center"
                  />
                ))}
              </div>

              {/* Left and Right navigation buttons */}
              {post.imageUrls.length > 1 && (
                <>
                  {activeImageIndex > 0 && (
                    <button
                      type="button"
                      onClick={handlePrevImage}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/65 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover/slider:opacity-100 transition-opacity z-20 shadow-md"
                      title="Previous image"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  )}
                  {activeImageIndex < post.imageUrls.length - 1 && (
                    <button
                      type="button"
                      onClick={handleNextImage}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/65 hover:bg-black/90 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover/slider:opacity-100 transition-opacity z-20 shadow-md"
                      title="Next image"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}

              {/* Fixed Pagination Dots */}
              {post.imageUrls.length > 1 && (
                <div 
                  className="absolute bottom-3 left-0 right-0 flex justify-center items-center gap-1.5 z-20 pointer-events-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {post.imageUrls.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => handleSelectImageDot(idx, e)}
                      className={`transition-all duration-200 rounded-full ${
                        idx === activeImageIndex 
                          ? 'w-5 h-1.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' 
                          : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                      }`}
                      aria-label={`Go to image ${idx + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Image index counter badge */}
              {post.imageUrls.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border border-white/10 z-20 pointer-events-none">
                  {activeImageIndex + 1}/{post.imageUrls.length}
                </div>
              )}
            </div>
          ) : (
            <img
              src={post.thumbnailUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80'}
              alt={post.title || post.caption}
              className="w-full h-full object-cover"
            />
          )}
          {showHeartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <Heart className="w-20 h-20 text-red-500 fill-red-500 animate-ping duration-500 drop-shadow-2xl" />
            </div>
          )}
        </div>
      ) : post.type === 'poll' ? (
        <div className="w-full bg-[#151515] p-5 border-y border-[#2a2a2a]">
          <h3 className="text-lg font-bold text-white mb-4">{post.pollQuestion || post.caption}</h3>
          <div className="space-y-3">
            {post.pollOptions?.map((opt, i) => {
              // Simulated voting state (we don't have a subcollection for it yet in this UI snapshot, so we'll mock it or just show bars if expired)
              const isExpired = post.pollExpiry && Date.now() > post.pollExpiry;
              const totalVotes = post.pollOptions?.reduce((acc: number, o: any) => acc + (o.votes || 0), 0) || 0;
              const pct = totalVotes > 0 ? ((opt.votes || 0) / totalVotes) * 100 : 0;
              
              return (
                <button
                  key={i}
                  disabled={!!isExpired}
                  className={`w-full relative overflow-hidden rounded-xl border ${
                    isExpired ? 'border-[#333] cursor-default' : 'border-[#444] hover:border-[#5003BD] cursor-pointer'
                  } bg-[#1f1f1f] transition-colors`}
                  onClick={() => {/* handle vote */}}
                >
                  {(isExpired || totalVotes > 0) && (
                    <div 
                      className="absolute top-0 left-0 bottom-0 bg-[#5003BD]/40 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  )}
                  <div className="relative z-10 px-4 py-3 flex justify-between items-center text-sm font-medium text-gray-200">
                    <span>{opt.text}</span>
                    {(isExpired || totalVotes > 0) && (
                      <span className="text-xs text-gray-400">{pct.toFixed(0)}%</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-gray-500">
            {post.pollOptions?.reduce((acc: number, o: any) => acc + (o.votes || 0), 0)} votes
            {post.pollExpiry && Date.now() > post.pollExpiry ? ' • Final Results' : ''}
          </div>
        </div>
      ) : null}

      {/* 3. Title & Caption Body (Tapping opens Fullscreen Modal) */}
      <div 
        className="p-4 space-y-2 cursor-pointer"
        onClick={() => onOpenClipModal(post)}
      >
        {post.title && (
          <h2 className="text-base font-bold text-white leading-snug hover:text-purple-300 transition-colors flex items-center justify-between gap-2">
            <span>{post.title}</span>
            <span className="text-[11px] font-normal text-purple-400/80 hover:text-purple-300 flex items-center gap-1 flex-shrink-0">
              Full screen ↗
            </span>
          </h2>
        )}
        
        {post.caption && (
          <p className="text-xs text-[#CCCCCC] leading-relaxed">
            {post.caption}
          </p>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
            {post.tags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[11px] font-semibold text-[#7A22EC] bg-[#121212] px-2 py-0.5 rounded-md hover:bg-[#5003BD]/20 cursor-pointer border border-[#2A2A2E]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 4. Action Row: Like, Comment (toggles drawer), Share, Save */}
      <div className="px-4 pb-3 pt-1 flex items-center justify-between border-t border-[#2A2A2E]/60 text-xs text-[#999999]">
        <div className="flex items-center gap-4">
          {/* Like Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike(post.id);
            }}
            id={`like-btn-${post.id}`}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer group/like ${
              post.isLiked ? 'text-red-500 font-bold' : 'hover:text-red-400'
            }`}
          >
            <Heart 
              className={`w-4 h-4 transition-transform group-hover/like:scale-125 ${
                post.isLiked ? 'fill-red-500 text-red-500' : ''
              }`} 
            />
            <span>{post.likesCount.toLocaleString()}</span>
          </button>

          {/* Comment Toggle Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowComments(!showComments);
              setTimeout(() => commentInputRef.current?.focus(), 100);
            }}
            id={`comment-btn-${post.id}`}
            className={`flex items-center gap-1.5 transition-colors cursor-pointer group/comment ${
              showComments ? 'text-purple-400 font-bold' : 'hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 group-hover/comment:scale-110 transition-transform" />
            <span>{effectiveCommentsCount.toLocaleString()}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            title="Share clip"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* Right action: Bookmark / Save */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSave(post.id);
            }}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              post.isSaved ? 'text-[#7A22EC]' : 'hover:text-white'
            }`}
            title="Save clip"
          >
            <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-[#7A22EC]' : ''}`} />
          </button>
        </div>
      </div>

      {/* 5. Inline Interactive Commenting Drawer */}
      {showComments && (
        <div className="border-t border-[#2A2A2E] bg-[#161619] p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-xs text-[#888888] pb-1 border-b border-[#2A2A2E]/40">
            <span className="font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              Community Discussion ({effectiveCommentsCount})
            </span>
            <button
              onClick={() => onOpenClipModal(post)}
              className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
            >
              Open Full Screen ↗
            </button>
          </div>

          {/* Existing Comments List */}
          <div className="max-h-52 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin scrollbar-thumb-purple-900/40">
            {commentsList.length === 0 ? (
              <div className="text-center py-4 text-xs text-[#777777]">
                No comments yet. Be the first to share your thoughts! 🎮
              </div>
            ) : (
              commentsList.map((c) => {
                const isCommentAuthorYou = Boolean(
                  currentUserId && (
                    c.user.id === currentUserId ||
                    (currentUsername && c.user.username?.toLowerCase() === currentUsername.toLowerCase())
                  )
                );
                return (
                  <div key={c.id} className="flex items-start gap-2.5 bg-[#1f1f23]/60 p-2 rounded-xl border border-[#2A2A2E]/40 text-xs">
                    <img
                      src={c.user.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80'}
                      alt={c.user.username}
                      className="w-7 h-7 rounded-full object-cover bg-black flex-shrink-0 mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white truncate">
                          {c.user.displayName || c.user.username}{isCommentAuthorYou ? '(You)' : ''}
                        </span>
                        <span className="text-[10px] text-[#666666] flex-shrink-0">{formatPostTimestamp(c.createdAt)}</span>
                      </div>
                      <p className="text-[#CCCCCC] text-xs mt-0.5 break-words">{c.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Comment Input Form */}
          <form onSubmit={handleSendComment} className="flex items-center gap-2 pt-1">
            <input
              ref={commentInputRef}
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder={`Add a comment as ${currentUsername || 'gamer'}...`}
              className="flex-1 bg-[#121214] border border-[#2A2A2E] focus:border-[#5003BD] rounded-xl px-3 py-2 text-xs text-white placeholder-[#666666] outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={!commentInput.trim() || isSubmittingComment}
              className="bg-[#5003BD] hover:bg-[#680cdc] disabled:opacity-40 disabled:hover:bg-[#5003BD] text-white p-2 rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-md shadow-[#5003BD]/30"
              title="Post comment"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </article>
  );
};
