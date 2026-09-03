import React, { useState, useEffect } from 'react';
import { Search, User, Plus, Check } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { searchUsers, followUser, unfollowUser, getIsFollowing, UserProfile } from '../lib/userService';
import { PublicProfileModal } from './PublicProfileModal';

export const SearchScreen = () => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query && activeTab === 'users') {
        setLoading(true);
        const users = await searchUsers(query);
        setResults(users.filter(u => u.uid !== auth.currentUser?.uid));
        
        // Check follow status for results
        if (auth.currentUser) {
          const statuses: Record<string, boolean> = {};
          for (const u of users) {
            statuses[u.uid] = await getIsFollowing(auth.currentUser.uid, u.uid);
          }
          setFollowingMap(statuses);
        }
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query, activeTab]);

  const handleFollowToggle = async (userId: string, isFollowing: boolean) => {
    if (!auth.currentUser) return;
    
    // Optimistic UI update
    setFollowingMap(prev => ({ ...prev, [userId]: !isFollowing }));
    
    try {
      if (isFollowing) {
        await unfollowUser(auth.currentUser.uid, userId);
      } else {
        await followUser(auth.currentUser.uid, userId);
      }
    } catch (e) {
      // Revert if error
      setFollowingMap(prev => ({ ...prev, [userId]: isFollowing }));
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-[#121212] pt-4 px-4 pb-20 animate-in fade-in">
      <div className="sticky top-0 z-10 bg-[#121212] pb-4">
        <h1 className="text-2xl font-bold text-white mb-4">Search</h1>
        
        <div className="relative flex items-center mb-4">
          <div className="absolute left-3.5 text-[#777777] pointer-events-none">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
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

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="text-center py-10 text-[#777777]">Searching...</div>
        )}
        
        {!loading && query && activeTab === 'users' && results.length === 0 && (
          <div className="text-center py-10 text-[#777777]">No users found.</div>
        )}

        {!loading && activeTab === 'users' && results.map(user => (
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
              <div>
                <div className="font-bold text-white">{user.gamertag || 'Player'}</div>
                <div className="text-xs text-[#777777]">{user.email}</div>
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

        {!loading && activeTab === 'posts' && (
          <div className="text-center py-10 text-[#777777]">
            Post search coming soon...
          </div>
        )}
      </div>

      {selectedUser && (
        <PublicProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
};
