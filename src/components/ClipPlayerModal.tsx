import React, { useState, useRef } from 'react';
import { 
  X, Heart, MessageSquare, Share2, Bookmark, Volume2, VolumeX, 
  Send, Sparkles, ShieldCheck, Coins, Play, Pause, Flame 
} from 'lucide-react';
import { Post, Comment, CURRENT_USER } from '../types/mockData';

interface ClipPlayerModalProps {
  post: Post | null;
  onClose: () => void;
  onLike: (postId: string) => void;
  onFollow: (userId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onTipCoins: (post: Post) => void;
  onSave: (postId: string) => void;
}

export const ClipPlayerModal: React.FC<ClipPlayerModalProps> = ({
  post,
  onClose,
  onLike,
  onFollow,
  onAddComment,
  onTipCoins,
  onSave,
}) => {
  if (!post) return null;

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [commentsList, setCommentsList] = useState<Comment[]>(post.comments || []);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
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

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: `c_${Date.now()}`,
      user: CURRENT_USER,
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
      {/* Container */}
      <div className="relative w-full max-w-4xl h-full sm:h-[90vh] bg-[#121212] sm:border border-[#5003BD]/50 sm:rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/60 text-white hover:bg-[#5003BD] transition-all cursor-pointer border border-white/10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Side: Video Player (9:16 vertical on mobile, or 16:10 centered) */}
        <div 
          className="relative flex-1 bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none"
          onClick={handleTogglePlay}
          onDoubleClick={handleDoubleTap}
        >
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

          {/* Double-tap heart animation */}
          {showHeartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
              <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-ping duration-500" />
            </div>
          )}

          {/* Pause overlay */}
          {!isPlaying && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
              <div className="w-16 h-16 rounded-full bg-[#5003BD]/80 backdrop-blur-md flex items-center justify-center text-white shadow-xl">
                <Play className="w-8 h-8 ml-1 fill-white" />
              </div>
            </div>
          )}

          {/* Mute Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current) {
                videoRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            className="absolute bottom-4 left-4 p-2 rounded-full bg-black/60 text-white hover:bg-[#5003BD] transition-colors border border-white/10 z-20 cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* 2-minute cap visual badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
            <span className="bg-[#5003BD] text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
              2-Min Highlight Cap
            </span>
            <span className="bg-black/70 text-white font-mono-uid text-[11px] px-2 py-0.5 rounded-full border border-white/10">
              {post.duration}
            </span>
          </div>

          {/* Floating Action Bar on Mobile View */}
          <div className="md:hidden absolute right-3 bottom-14 flex flex-col items-center gap-3 z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLike(post.id);
              }}
              className="flex flex-col items-center text-white"
            >
              <div className={`p-2.5 rounded-full bg-black/60 backdrop-blur-md ${post.isLiked ? 'text-red-500' : 'text-white'}`}>
                <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-red-500' : ''}`} />
              </div>
              <span className="text-[10px] font-bold mt-0.5">{post.likesCount}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTipCoins(post);
              }}
              className="flex flex-col items-center text-amber-300"
            >
              <div className="p-2.5 rounded-full bg-black/60 backdrop-blur-md text-amber-400">
                <Coins className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold mt-0.5">Tip</span>
            </button>
          </div>
        </div>

        {/* Right Side: Creator Info, Caption & Real-Time Comments */}
        <div className="w-full md:w-80 lg:w-96 bg-[#232323] flex flex-col border-t md:border-t-0 md:border-l border-[#2A2A2E] h-72 md:h-full">
          {/* Header */}
          <div className="p-4 border-b border-[#2A2A2E] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={post.creator.avatar}
                alt={post.creator.username}
                className="w-10 h-10 rounded-full object-cover border border-[#5003BD]"
              />
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-white">@{post.creator.username}</span>
                  {post.creator.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />}
                </div>
                <span className="text-[11px] text-[#888888]">{post.game}</span>
              </div>
            </div>

            <button
              onClick={() => onFollow(post.creator.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                post.creator.isFollowing
                  ? 'bg-[#121212] text-[#888888] border border-[#2A2A2E]'
                  : 'bg-[#5003BD] text-white hover:bg-[#7A22EC]'
              }`}
            >
              {post.creator.isFollowing ? 'Following' : '+ Follow'}
            </button>
          </div>

          {/* Caption */}
          <div className="p-4 border-b border-[#2A2A2E] bg-[#1a1a1a] text-xs space-y-1.5">
            <p className="font-bold text-white leading-snug">{post.title}</p>
            <p className="text-[#CCCCCC] text-[11px]">{post.caption}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {post.tags.map((t, idx) => (
                <span key={idx} className="text-[#7A22EC] text-[10px] font-semibold">#{t}</span>
              ))}
            </div>
          </div>

          {/* Comments List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between text-xs text-[#888888] mb-1">
              <span>{commentsList.length} Comments</span>
              <span>Sorted by Top</span>
            </div>

            {commentsList.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#777777]">
                No comments yet. Be the first gamer to drop a reply! 🎮
              </div>
            ) : (
              commentsList.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5 text-xs">
                  <img
                    src={c.user.avatar}
                    alt={c.user.username}
                    className="w-7 h-7 rounded-full object-cover border border-[#2A2A2E] mt-0.5"
                  />
                  <div className="flex-1 bg-[#121212] p-2.5 rounded-xl border border-[#2A2A2E]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white text-[11px]">@{c.user.username}</span>
                      <span className="text-[10px] text-[#777777]">{c.createdAt}</span>
                    </div>
                    <p className="text-[#CCCCCC] text-xs">{c.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <form onSubmit={handleSubmitComment} className="p-3 bg-[#121212] border-t border-[#2A2A2E] flex items-center gap-2">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-[#232323] text-white text-xs px-3.5 py-2 rounded-full border border-[#2A2A2E] focus:border-[#5003BD] focus:outline-none"
            />
            <button
              type="submit"
              className="p-2 rounded-full bg-[#5003BD] text-white hover:bg-[#7A22EC] transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
