import React, { useState, useEffect } from 'react';
import { Search, User, Plus, Check, ArrowLeft } from 'lucide-react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { searchUsers, followUser, unfollowUser, getIsFollowing, UserProfile } from '../lib/userService';
import { PublicProfileModal } from './PublicProfileModal';
import { getCountryFlag } from '../data/countries';
import { FeedCard } from './FeedCard';
import { Post } from '../types/mockData';

export const SearchScreen: React.FC<{ 
  onBack?: () => void;
  onOpenClipModal?: (post: Post) => void;
  onLikePost?: (postId: string) => void;
  onFollowCreator?: (creatorId: string) => void;
}> = ({ onBack, onOpenClipModal, onLikePost, onFollowCreator }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');
  
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (!searchQuery) {
        setUserResults([]);
        setPostResults([]);
        return;
      }
      
      setLoading(true);
      
      if (activeTab === 'users') {
        const users = await searchUsers(searchQuery);
        setUserResults(users.filter(u => u.uid !== auth.currentUser?.uid));
        
        if (auth.currentUser) {
          const statuses: Record<string, boolean> = {};
          for (const u of users) {
            statuses[u.uid] = await getIsFollowing(auth.currentUser.uid, u.uid);
          }
          setFollowingMap(statuses);
        }
      } else if (activeTab === 'posts') {
        // Fetch recent posts and filter client-side for simple search
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('createdAtTimestamp', 'desc'), limit(100));
        
        try {
          const snap = await getDocs(q);
          const loaded: any[] = [];
          const lowerQuery = searchQuery.toLowerCase();
          
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.creator && !['system', 'usr_1', 'usr_2', 'usr_3', 'usr_4'].includes(data.creator.id)) {
              const titleMatch = data.title?.toLowerCase().includes(lowerQuery);
              const captionMatch = data.caption?.toLowerCase().includes(lowerQuery);
              const gameMatch = data.game?.toLowerCase().includes(lowerQuery);
              const tagsMatch = data.tags?.some((t: string) => t.toLowerCase().includes(lowerQuery));
              
              if (titleMatch || captionMatch || gameMatch || tagsMatch) {
                loaded.push({ id: docSnap.id, ...data });
              }
            }
          });
          setPostResults(loaded);
        } catch (err) {
          console.error("Error searching posts", err);
        }
      }
      
      setLoading(false);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab]);

  const handleFollowToggle = async (userId: string, isFollowing: boolean) => {
    if (!auth.currentUser) return;
    setFollowingMap(prev => ({ ...prev, [userId]: !isFollowing }));
    try {
      if (isFollowing) {
        await unfollowUser(auth.currentUser.uid, userId);
      } else {
        await followUser(auth.currentUser.uid, userId);
      }
    } catch (e) {
      setFollowingMap(prev => ({ ...prev, [userId]: isFollowing }));
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-[#121212] pt-0 px-0 pb-16 animate-in fade-in overflow-hidden">
      <div className="sticky top-0 z-10 bg-[#121212] pb-2 pt-0 px-4 mt-4">
        <div className="flex items-center gap-3 mb-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-xl font-bold text-white">Search</h1>
        </div>
        
        <div className="relative flex items-center mb-3">
          <div className="absolute left-3.5 text-[#777777] pointer-events-none">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'users' ? 'Search users...' : 'Search posts...'}
            className="w-full bg-[#232323] text-white placeholder-[#777777] rounded-xl pl-11 pr-4 py-3 border-[0.5px] border-[#5003BD]/50 focus:outline-none focus:border-[#7A22EC] transition-all"
          />
        </div>

        <div className="flex gap-2 mb-2">
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'users' ? 'bg-[#5003BD] text-white' : 'bg-[#232323] text-[#888888]'}`}
          >
            Users
          </button>
          <button 
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'posts' ? 'bg-[#5003BD] text-white' : 'bg-[#232323] text-[#888888]'}`}
          >
            Posts
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4">
        {loading && (
          <div className="text-center py-10 text-[#777777]">Searching...</div>
        )}
        
        {!loading && searchQuery && activeTab === 'users' && userResults.length === 0 && (
          <div className="text-center py-10 text-[#777777]">No users found.</div>
        )}

        {!loading && activeTab === 'users' && userResults.map(user => (
          <div key={user.uid} className="flex items-center justify-between p-3 mb-2 bg-[#1a1a1a] rounded-xl border border-[#2a2a2e] hover:border-[#5003BD]/50 transition-colors">
            <div 
              className="flex items-center gap-3 cursor-pointer flex-1"
              onClick={() => setSelectedUser(user)}
            >
              <div className="w-12 h-12 rounded-full bg-[#2a2a2e] overflow-hidden">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.gamertag} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {user.gamertag?.[0] || user.email[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="font-bold text-white truncate flex items-center gap-1.5">
                  {user.name || user.gamertag || 'Player'}
                  {user.country && <span className="text-sm">{getCountryFlag(user.country)}</span>}
                </div>
                <div className="text-xs text-[#777777] truncate">@{user.gamertag || 'player'}</div>
              </div>
            </div>
            
            <button
              onClick={() => handleFollowToggle(user.uid, followingMap[user.uid])}
              className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition-colors ${
                followingMap[user.uid] 
                  ? 'bg-[#2a2a2e] text-white border border-[#555555]' 
                  : 'bg-[#5003BD] text-white hover:bg-[#7A22EC]'
              }`}
            >
              {followingMap[user.uid] ? (
                <>
                  <Check className="w-3 h-3" /> Following
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" /> Follow
                </>
              )}
            </button>
          </div>
        ))}

        {!loading && searchQuery && activeTab === 'posts' && postResults.length === 0 && (
          <div className="text-center py-10 text-[#777777]">No posts found.</div>
        )}

        {!loading && activeTab === 'posts' && (
          <div className="flex flex-col gap-6">
            {postResults.map((post) => (
              <FeedCard 
                key={post.id}
                post={post}
                onLike={(id) => onLikePost?.(id)}
                onFollow={(id) => onFollowCreator?.(id)}
                onOpenComments={(p) => onOpenClipModal?.(p)}
                onOpenClipModal={(p) => onOpenClipModal?.(p)}
                onTipCoins={() => {}}
                onSave={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <PublicProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
};
