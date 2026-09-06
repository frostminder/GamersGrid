import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Heart, MessageSquare, Share2, Bookmark, Volume2, VolumeX, 
  Send, ShieldCheck, Play, Check
} from 'lucide-react';
import { Post, Comment } from '../types/mockData';
import { auth } from '../lib/firebase';

interface ClipPlayerModalProps {
  post: Post | null;
  currentUserId?: string;
  currentUsername?: string;
  isFollowing?: boolean;
  onClose: () => void;
  onLike: (postId: string) => void;
  onFollow: (userId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onTipCoins?: (post: Post) => void;
  onSave: (postId: string) => void;
}

export const ClipPlayerModal: React.FC<ClipPlayerModalProps> = ({
  post,
  currentUserId,
  currentUsername,
  isFollowing: isFollowingProp,
  onClose,
  onLike,
  onFollow,
  onAddComment,
  onSave,
}) => {
  if (!post) return null;

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [commentsList, setCommentsList] = useState<Comment[]>(post.comments || []);
  const [copiedLink, setCopiedLink] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCommentsList(post.comments || []);
  }, [post.comments]);

  const isOwnPost = Boolean(
    currentUserId && (
      post.creator.id === currentUserId ||
      (currentUsername && post.creator.username?.toLowerCase() === currentUsername.toLowerCase())
    )
  );

  const isFollowing = Boolean(isFollowingProp !== undefined ? isFollowingProp : post.creator.isFollowing);

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  };

  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.isLiked) {
      onLike(post.id);
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 700);
  };

  const handleShare = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'Gamers Grid Clip',
          text: post.caption || 'Check out this post on Gamers Grid!',
          url: window.location.href,
        });
        return;
      } catch (err) {
        // Fallback to clipboard if cancelled
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const currentUser = auth.currentUser;
    const newComment: Comment = {
      id: `c_${Date.now()}`,
      user: {
        id: currentUser?.uid || 'guest',
        username: currentUsername || currentUser?.email?.split('@')[0] || 'gamer',
        displayName: currentUser?.displayName || currentUsername || 'Gamer',
        avatar: currentUser?.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
        level: 1,
        xp: 0
      },
      text: commentText.trim(),
      createdAt: 'Just now',
      likes: 0,
    };

    setCommentsList((prev) => [newComment, ...prev]);
    onAddComment(post.id, commentText.trim());
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-0 sm:p-4">
      {/* Toast Notification for Copied Link */}
      {copiedLink && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[70] bg-[#5003BD] border border-[#7A22EC] text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 animate-in fade-in zoom-in-95">
          <Check className="w-3.5 h-3.5 text-cyan-400" />
          <span>Link copied to clipboard!</span>
        </div>
      )}

      {/* Container */}
      <div className="relative w-full max-w-4xl h-full sm:h-[90vh] bg-[#121212] sm:border border-[#5003BD]/50 sm:rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/70 text-white hover:bg-[#5003BD] transition-all cursor-pointer border border-white/10 shadow-lg"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Media Display */}
        <div 
          className="relative flex-1 bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none"
          onClick={handleTogglePlay}
          onDoubleClick={handleDoubleTap}
        >
          {post.videoUrl ? (
            <video
              ref={videoRef}
              src={post.videoUrl}
              poster={post.thumbnailUrl}
              autoPlay
              loop
              playsInline
              muted={isMuted}
              className="w-full h-full object-contain max-h-full"
            />
          ) : post.imageUrls && post.imageUrls.length > 0 ? (
            <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide relative group/slider">
              {post.imageUrls.map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={imgUrl}
                  alt={post.title || post.caption}
                  className="w-full h-full object-contain max-h-full flex-shrink-0 snap-center"
                />
              ))}
              {post.imageUrls.length > 1 && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
                  {post.imageUrls.map((_, idx) => (
                    <div key={idx} className="w-2 h-2 rounded-full bg-white/60 backdrop-blur-md" />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <img
              src={post.thumbnailUrl}
              alt={post.title || post.caption}
              className="w-full h-full object-contain max-h-full"
            />
          )}

          {/* Double-tap heart animation */}
          {showHeartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-ping duration-500" />
            </div>
          )}

          {/* Pause overlay */}
          {!isPlaying && post.videoUrl && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-[#5003BD]/80 backdrop-blur-md flex items-center justify-center text-white shadow-xl">
                <Play className="w-8 h-8 ml-1 fill-white" />
              </div>
            </div>
          )}

          {/* Mute Button */}
          {post.videoUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                  setIsMuted(!isMuted);
                }
              }}
              className="absolute bottom-4 left-4 p-2 rounded-full bg-black/60 text-white hover:bg-[#5003BD] transition-colors border border-white/10 z-20 cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}

          {/* 2-minute cap visual badge */}
          {post.videoUrl && (
            <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
              <span className="bg-[#5003BD] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                Highlight Clip
              </span>
              {post.duration && (
                <span className="bg-black/70 text-white font-mono text-[11px] px-2 py-0.5 rounded-full border border-white/10">
                  {post.duration}
                </span>
              )}
            </div>
          )}

          {/* Floating Action Bar on Mobile View */}
          <div className="md:hidden absolute right-3 bottom-14 flex flex-col items-center gap-3 z-30">
            {/* Like */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(post.id);
              }}
              className="flex flex-col items-center text-white cursor-pointer"
            >
              <div className={`p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 ${post.isLiked ? 'text-red-500' : 'text-white'}`}>
                <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              </div>
              <span className="text-[10px] font-bold mt-0.5">{post.likesCount}</span>
            </button>

            {/* Comment */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                commentInputRef.current?.focus();
              }}
              className="flex flex-col items-center text-white cursor-pointer"
            >
              <div className="p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold mt-0.5">{commentsList.length}</span>
            </button>

            {/* Share */}
            <button
              onClick={(e) => handleShare(e)}
              className="flex flex-col items-center text-white cursor-pointer"
              title="Share clip"
            >
              <div className="p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:text-purple-300">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold mt-0.5">Share</span>
            </button>

            {/* Save */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave(post.id);
              }}
              className="flex flex-col items-center text-white cursor-pointer"
              title="Save clip"
            >
              <div className={`p-2.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 ${post.isSaved ? 'text-[#7A22EC]' : 'text-white'}`}>
                <Bookmark className={`w-5 h-5 ${post.isSaved ? 'fill-[#7A22EC]' : ''}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Right Side: Creator Info, Caption, Interactive Action Bar & Comments */}
        <div className="w-full md:w-80 lg:w-96 bg-[#232323] flex flex-col border-t md:border-t-0 md:border-l border-[#2A2A2E] h-80 md:h-full">
          {/* Header with Creator Info & Follow */}
          <div className="p-4 border-b border-[#2A2A2E] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={post.creator.avatar}
                alt={post.creator.username}
                className="w-10 h-10 rounded-full object-cover border border-[#5003BD]"
              />
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-white">
                    {post.creator.displayName || post.creator.username}{isOwnPost ? '(You)' : ''}
                  </span>
                  {post.creator.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-[#888888]">
                  <span>@{post.creator.username}{isOwnPost ? '(You)' : ''}</span>
                  <span>•</span>
                  <span>{post.game}</span>
                </div>
              </div>
            </div>

            {/* Follow Button: Only shown if not current user's own post */}
            {!isOwnPost && (
              <button
                onClick={() => onFollow(post.creator.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isFollowing
                    ? 'bg-[#121212] text-[#888888] border border-[#2A2A2E] hover:text-red-400'
                    : 'bg-[#5003BD] text-white hover:bg-[#7A22EC] shadow-sm shadow-[#5003BD]/30'
                }`}
              >
                {isFollowing ? 'Following' : '+ Follow'}
              </button>
            )}
          </div>

          {/* Caption and Tags */}
          <div className="p-4 border-b border-[#2A2A2E] bg-[#1a1a1a] text-xs space-y-1.5">
            {post.title && <p className="font-bold text-white leading-snug">{post.title}</p>}
            <p className="text-[#CCCCCC] text-xs leading-relaxed">{post.caption}</p>
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {post.tags.map((t, idx) => (
                  <span key={idx} className="text-[#7A22EC] bg-[#121212] px-2 py-0.5 rounded text-[10px] font-semibold border border-[#2A2A2E]">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Action Bar (Like, Comment count, Share, Save) */}
          <div className="px-4 py-2.5 border-b border-[#2A2A2E] flex items-center justify-between text-xs text-[#aaaaaa] bg-[#1d1d20]">
            <div className="flex items-center gap-4">
              {/* Like Button */}
              <button
                onClick={() => onLike(post.id)}
                className={`flex items-center gap-1.5 transition-colors cursor-pointer group/like ${
                  post.isLiked ? 'text-red-500 font-bold' : 'hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 transition-transform group-hover/like:scale-125 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                <span>{post.likesCount}</span>
              </button>

              {/* Comments Count / Focus */}
              <button
                onClick={() => commentInputRef.current?.focus()}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{commentsList.length}</span>
              </button>

              {/* Share Button */}
              <button
                onClick={(e) => handleShare(e)}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                title="Share clip"
              >
                <Share2 className="w-4 h-4" />
                <span>{copiedLink ? 'Copied!' : 'Share'}</span>
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={() => onSave(post.id)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                post.isSaved ? 'text-[#7A22EC]' : 'hover:text-white'
              }`}
              title="Save post"
            >
              <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-[#7A22EC]' : ''}`} />
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between text-xs text-[#888888] mb-1">
              <span>{commentsList.length} Comments</span>
              <span>All Comments</span>
            </div>

            {commentsList.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#777777]">
                No comments yet. Be the first gamer to reply! 🎮
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
                  <div key={c.id} className="flex items-start gap-2.5 text-xs">
                    <img
                      src={c.user.avatar}
                      alt={c.user.username}
                      className="w-7 h-7 rounded-full object-cover border border-[#2A2A2E] mt-0.5"
                    />
                    <div className="flex-1 bg-[#121212] p-2.5 rounded-xl border border-[#2A2A2E]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-white text-[11px]">
                          {c.user.displayName || c.user.username}{isCommentAuthorYou ? '(You)' : ''}
                        </span>
                        <span className="text-[10px] text-[#777777]">{c.createdAt}</span>
                      </div>
                      <p className="text-[#CCCCCC] text-xs leading-relaxed">{c.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Comment Input */}
          <form onSubmit={handleSubmitComment} className="p-3 bg-[#121212] border-t border-[#2A2A2E] flex items-center gap-2">
            <input
              ref={commentInputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-[#232323] text-white text-xs px-3.5 py-2 rounded-full border border-[#2A2A2E] focus:border-[#5003BD] focus:outline-none"
            />
            <button
              type="submit"
              className="p-2 rounded-full bg-[#5003BD] text-white hover:bg-[#7A22EC] transition-colors cursor-pointer disabled:opacity-50"
              disabled={!commentText.trim()}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
