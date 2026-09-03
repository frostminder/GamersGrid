import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { UserProfile, getIsFollowing, followUser, unfollowUser } from '../lib/userService';
import { auth } from '../lib/firebase';

interface UserListModalProps {
  title: string;
  users: UserProfile[];
  onClose: () => void;
  onUserClick: (user: UserProfile) => void;
}

export const UserListModal: React.FC<UserListModalProps> = ({ title, users, onClose, onUserClick }) => {
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchStatuses = async () => {
      if (!auth.currentUser) return;
      const statuses: Record<string, boolean> = {};
      for (const u of users) {
        if (u.uid !== auth.currentUser.uid) {
          statuses[u.uid] = await getIsFollowing(auth.currentUser.uid, u.uid);
        }
      }
      setFollowingMap(statuses);
    };
    fetchStatuses();
  }, [users]);

  const handleFollowToggle = async (e: React.MouseEvent, userId: string, isFollowing: boolean) => {
    e.stopPropagation();
    if (!auth.currentUser) return;
    
    setFollowingMap(prev => ({ ...prev, [userId]: !isFollowing }));
    try {
      if (isFollowing) {
        await unfollowUser(auth.currentUser.uid, userId);
      } else {
        await followUser(auth.currentUser.uid, userId);
      }
    } catch {
      setFollowingMap(prev => ({ ...prev, [userId]: isFollowing }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] w-full sm:w-[400px] h-[80vh] sm:h-[600px] rounded-t-3xl sm:rounded-3xl border border-[#2a2a2e] flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2e]">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-2 bg-[#2a2a2e] rounded-full text-[#999999] hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 hide-scrollbar">
          {users.length === 0 ? (
            <div className="text-center text-[#777777] mt-10">No users found.</div>
          ) : (
            users.map(user => (
              <div 
                key={user.uid} 
                onClick={() => {
                  onClose();
                  onUserClick(user);
                }}
                className="flex items-center justify-between p-3 mb-2 bg-[#121212] rounded-xl border border-[#2a2a2e] hover:border-[#5003BD]/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-[#2a2a2e] overflow-hidden">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.gamertag} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold">
                        {user.gamertag?.[0] || user.email[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">{user.gamertag || 'Player'}</div>
                  </div>
                </div>
                
                {auth.currentUser && user.uid !== auth.currentUser.uid && (
                  <button
                    onClick={(e) => handleFollowToggle(e, user.uid, followingMap[user.uid])}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      followingMap[user.uid] 
                        ? 'bg-[#2a2a2e] text-white border border-[#555555]' 
                        : 'bg-[#5003BD] text-white hover:bg-[#7A22EC]'
                    }`}
                  >
                    {followingMap[user.uid] ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
