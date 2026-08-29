import React, { useState, useRef } from 'react';
import { 
  Heart, MessageSquare, Share2, Bookmark, Play, Pause, Volume2, 
  VolumeX, Check, ShieldCheck, Sparkles, Coins, Maximize2, MoreVertical
} from 'lucide-react';
import { Post, User } from '../types/mockData';

interface FeedCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onFollow: (userId: string) => void;
  onOpenComments: (post: Post) => void;
  onOpenClipModal: (post: Post) => void;
  onTipCoins: (post: Post) => void;
  onSave: (postId: string) => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({
  post,
  onLike,
  onFollow,
  onOpenComments,
  onOpenClipModal,
  onTipCoins,
  onSave,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showHeartAnim, setShowHeartAnim] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().catch(() => {
          // auto-play policy catch
        });
        setIsPlaying(true);
      }
    }
  };

  const handleDoubleTapLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!post.isLiked) {
      onLike(post.id);
    }
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 800);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <article 
      className="w-full bg-[#232323] rounded-2xl overflow-hidden border border-[#2A2A2E] hover:border-[#5003BD]/50 transition-all duration-300 shadow-lg relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Header with Gradient Accent (#5003BD blending into #232323) */}
      <div className="gradient-card-header p-3.5 flex items-center justify-between border-b border-[#2A2A2E]/50">
        {/* Creator Info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`p-0.5 rounded-full ${post.creator.isPremium ? 'bg-gradient-to-tr from-[#5003BD] via-purple-400 to-cyan-400' : 'bg-[#2A2A2E]'}`}>
              <img
                src={post.creator.avatar}
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
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white hover:text-purple-300 transition-colors cursor-pointer">
                {post.creator.displayName}
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
              <span>@{post.creator.username}</span>
              <span>•</span>
              <span className="text-[11px] text-[#777777]">{post.createdAt}</span>
            </div>
          </div>
        </div>

        {/* Follow button & Game tag */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#121212] text-[#CCCCCC] border border-[#2A2A2E]">
            {post.game}
          </span>
          <button
            onClick={() => onFollow(post.creator.id)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              post.creator.isFollowing
                ? 'bg-[#121212] text-[#999999] border border-[#2A2A2E] hover:text-red-400 hover:border-red-500/40'
                : 'bg-[#5003BD] text-white hover:bg-[#7A22EC] shadow-sm shadow-[#5003BD]/30'
            }`}
          >
            {post.creator.isFollowing ? 'Following' : '+ Follow'}
          </button>
        </div>
      </div>

      {/* 2. Media / Video Container (16:10 aspect ratio) */}
      <div 
        className="relative w-full aspect-[16/10] bg-black cursor-pointer overflow-hidden group/video select-none"
        onClick={handleTogglePlay}
        onDoubleClick={handleDoubleTapLike}
      >
        {/* Actual Video player with thumbnail fallback */}
        <video
          ref={videoRef}
          src={post.videoUrl}
          poster={post.thumbnailUrl}
          loop
          playsInline
          muted={isMuted}
          className="w-full h-full object-cover"
        />

        {/* Double-tap heart animation overlay */}
        {showHeartAnim && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <Heart className="w-20 h-20 text-red-500 fill-red-500 animate-ping duration-500 drop-shadow-2xl" />
          </div>
        )}

        {/* Play/Pause overlay indicator when paused */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center transition-all">
            <div className="w-14 h-14 rounded-full bg-[#5003BD]/80 backdrop-blur-md border border-[#7A22EC] flex items-center justify-center text-white shadow-xl shadow-[#5003BD]/40 transform group-hover/video:scale-110 transition-transform">
              <Play className="w-6 h-6 ml-1 fill-white" />
            </div>
          </div>
        )}

        {/* Badges: Top Left Duration / NEW badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20">
          {post.isNew && (
            <span className="bg-red-500 text-white font-black text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider shadow-md animate-pulse">
              NEW
            </span>
          )}
          <span className="bg-black/70 backdrop-blur-md text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border border-white/10">
            {post.duration}
          </span>
          <span className="sm:hidden bg-[#5003BD]/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md">
            {post.gameCategory}
          </span>
        </div>

        {/* Bottom Video Controls Overlay (Mute, Fullscreen, Expand) */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
          <button
            onClick={toggleMute}
            className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-[#5003BD] transition-colors border border-white/10"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenClipModal(post);
            }}
            className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-[#5003BD] transition-colors border border-white/10"
            title="Expand Full Clip View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* 2-minute limit indicator meter */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#2A2A2E]/80">
          <div className="h-full bg-gradient-to-r from-[#5003BD] to-cyan-400 w-3/4 rounded-r" />
        </div>
      </div>

      {/* 3. Title & Caption Body */}
      <div className="p-4 space-y-2.5">
        <h2 
          onClick={() => onOpenClipModal(post)}
          className="text-base font-bold text-white leading-snug hover:text-purple-300 transition-colors cursor-pointer"
        >
          {post.title}
        </h2>
        
        <p className="text-xs text-[#CCCCCC] leading-relaxed">
          {post.caption}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {post.tags.map((tag, idx) => (
            <span
              key={idx}
              className="text-[11px] font-semibold text-[#7A22EC] bg-[#121212] px-2 py-0.5 rounded-md hover:bg-[#5003BD]/20 cursor-pointer border border-[#2A2A2E]"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* 4. Action Row: Like, Comment, Share, Tip Coins, Bookmark */}
      <div className="px-4 pb-3.5 pt-1 flex items-center justify-between border-t border-[#2A2A2E]/50 text-xs text-[#999999]">
        <div className="flex items-center gap-4">
          {/* Like Button */}
          <button
            onClick={() => onLike(post.id)}
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

          {/* Comment Button */}
          <button
            onClick={() => onOpenComments(post)}
            id={`comment-btn-${post.id}`}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group/comment"
          >
            <MessageSquare className="w-4 h-4 group-hover/comment:scale-110 transition-transform" />
            <span>{post.commentsCount.toLocaleString()}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
              }
            }}
            className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            title="Copy share link"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">{post.sharesCount}</span>
          </button>
        </div>

        {/* Right action items: Tip Coins + Save */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTipCoins(post)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 text-[11px] font-bold transition-all cursor-pointer"
            title="Tip Grid Coins to creator"
          >
            <Coins className="w-3 h-3 text-amber-400" />
            <span>Tip 50</span>
          </button>

          <button
            onClick={() => onSave(post.id)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              post.isSaved ? 'text-[#7A22EC]' : 'hover:text-white'
            }`}
            title="Save clip"
          >
            <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-[#7A22EC]' : ''}`} />
          </button>
        </div>
      </div>
    </article>
  );
};
