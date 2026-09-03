import React, { useState, useEffect } from 'react';
import { X, Users, MapPin, Link as LinkIcon, Calendar } from 'lucide-react';
import { UserProfile, getFollowStats, getFollowers, getFollowing } from '../lib/userService';
import { UserListModal } from './UserListModal';

interface PublicProfileModalProps {
  user: UserProfile;
  onClose: () => void;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ user, onClose }) => {
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [showListModal, setShowListModal] = useState<'followers' | 'following' | null>(null);
  const [listUsers, setListUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null); // for nesting

  useEffect(() => {
    const fetchStats = async () => {
      const s = await getFollowStats(user.uid);
      setStats({ followers: s.followersCount, following: s.followingCount });
    };
    fetchStats();
  }, [user.uid]);

  const handleOpenList = async (type: 'followers' | 'following') => {
    setShowListModal(type);
    if (type === 'followers') {
      const users = await getFollowers(user.uid);
      setListUsers(users);
    } else {
      const users = await getFollowing(user.uid);
      setListUsers(users);
    }
  };

  const handleClose = () => {
    if (selectedUser) {
      setSelectedUser(null);
    } else {
      onClose();
    }
  };

  const activeUser = selectedUser || user;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] w-full sm:w-[500px] h-[90vh] sm:h-[700px] rounded-t-3xl sm:rounded-3xl border border-[#2a2a2e] flex flex-col animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 overflow-hidden">
        {/* Banner */}
        <div className="relative h-32 bg-[#2a2a2e] shrink-0">
          {activeUser.bannerURL && (
            <img src={activeUser.bannerURL} alt="Banner" className="w-full h-full object-cover" />
          )}
          <button 
            onClick={handleClose} 
            className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar pb-10">
          <div className="px-5 -mt-12 mb-4 relative z-10">
            <div className="flex justify-between items-end">
              <div className="w-24 h-24 rounded-full border-4 border-[#1a1a1a] bg-[#2a2a2e] overflow-hidden">
                {activeUser.photoURL ? (
                  <img src={activeUser.photoURL} alt={activeUser.gamertag} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl">
                    {activeUser.gamertag?.[0] || activeUser.email[0].toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3">
              <h1 className="text-2xl font-bold text-white">{activeUser.gamertag || 'Player'}</h1>
              <p className="text-[#777777] text-sm">{activeUser.email}</p>
            </div>

            {activeUser.bio && (
              <p className="text-white mt-4 text-sm leading-relaxed">{activeUser.bio}</p>
            )}

            <div className="flex items-center gap-6 mt-5">
              <button 
                onClick={() => !selectedUser && handleOpenList('following')}
                className="flex gap-1.5 items-center cursor-pointer hover:opacity-80"
              >
                <span className="font-bold text-white">{!selectedUser ? stats.following : '-'}</span>
                <span className="text-[#777777] text-sm">Following</span>
              </button>
              <button 
                onClick={() => !selectedUser && handleOpenList('followers')}
                className="flex gap-1.5 items-center cursor-pointer hover:opacity-80"
              >
                <span className="font-bold text-white">{!selectedUser ? stats.followers : '-'}</span>
                <span className="text-[#777777] text-sm">Followers</span>
              </button>
            </div>
            
            {/* Posts Grid Mockup */}
            <div className="mt-8 border-t border-[#2a2a2e] pt-6">
              <h3 className="text-lg font-bold text-white mb-4">Recent Clips</h3>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="aspect-square bg-[#232323] rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showListModal && !selectedUser && (
        <UserListModal 
          title={showListModal === 'followers' ? 'Followers' : 'Following'}
          users={listUsers}
          onClose={() => setShowListModal(null)}
          onUserClick={(u) => setSelectedUser(u)}
        />
      )}
    </div>
  );
};
