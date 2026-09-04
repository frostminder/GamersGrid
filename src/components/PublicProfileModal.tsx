import React, { useState, useEffect } from 'react';
import { X, Users, MapPin, Link as LinkIcon, Calendar, ArrowLeft } from 'lucide-react';
import { UserProfile, getFollowStats, getFollowers, getFollowing } from '../lib/userService';
import { UserListModal } from './UserListModal';
import { getCountryFlag } from '../data/countries';
import { subscribeToPresence, PresenceStatus } from '../lib/presenceService';

interface PublicProfileModalProps {
  user: UserProfile;
  onClose: () => void;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ user, onClose }) => {
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [showListModal, setShowListModal] = useState<'followers' | 'following' | null>(null);
  const [listUsers, setListUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null); // for nesting
  const [presence, setPresence] = useState<PresenceStatus>('offline');

  const activeUser = selectedUser || user;

  // Handle hardware / browser back button to close modal without exiting app
  useEffect(() => {
    window.history.pushState({ modal: 'public-profile' }, '');
    const handlePopState = () => {
      onClose();
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onClose]);

  // Real-time presence subscription for user's profile
  useEffect(() => {
    if (!activeUser.uid) return;
    const unsub = subscribeToPresence(activeUser.uid, (status) => {
      setPresence(status);
    });
    return () => unsub();
  }, [activeUser.uid]);

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
      if (window.history.state?.modal === 'public-profile') {
        window.history.back();
      } else {
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#121212]">
      <div className="bg-[#121212] w-full h-full flex flex-col animate-in slide-in-from-bottom-8 overflow-hidden">
        <div className="flex-1 overflow-y-auto hide-scrollbar pb-10">
          {/* Banner Section */}
          <div className="relative h-36 sm:h-44 bg-[#2a2a2e] w-full shrink-0 z-0">
            {activeUser.bannerURL ? (
              <img src={activeUser.bannerURL} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-[#2a2a2e] to-[#1a1a1a]" />
            )}
            {/* Top Back / Close buttons */}
            <button 
              onClick={handleClose} 
              className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors z-30 cursor-pointer shadow-lg"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={handleClose} 
              className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors z-30 cursor-pointer shadow-lg"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Profile Details Container */}
          <div className="px-5 -mt-12 mb-4 relative z-20">
            <div className="flex justify-between items-end">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-[#121212] bg-[#2a2a2e] overflow-hidden shadow-2xl relative z-20">
                  {activeUser.photoURL ? (
                    <img src={activeUser.photoURL} alt={activeUser.gamertag} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-3xl">
                      {activeUser.gamertag?.[0] || activeUser.email[0].toUpperCase()}
                    </div>
                  )}
                </div>
                {/* Active Presence Dot on Profile Avatar */}
                <span 
                  className={`absolute bottom-1 right-1 z-30 w-5 h-5 rounded-full border-2 border-[#121212] ${
                    presence === 'online' 
                      ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' 
                      : presence === 'background' 
                      ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]' 
                      : 'bg-zinc-500'
                  }`}
                  title={presence === 'online' ? 'Online' : presence === 'background' ? 'Standby' : 'Offline'}
                />
              </div>
            </div>

            <div className="mt-3">
              <h1 className="text-2xl font-bold text-white">{activeUser.name || activeUser.gamertag || 'Player'}</h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <p className="text-[#777777] text-sm">@{activeUser.gamertag || activeUser.email}</p>
                {/* Active Presence Status badge on profile */}
                <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-md border font-medium ${
                  presence === 'online' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : presence === 'background' 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    presence === 'online' ? 'bg-emerald-400' : presence === 'background' ? 'bg-amber-400' : 'bg-zinc-400'
                  }`} />
                  {presence === 'online' ? 'Online' : presence === 'background' ? 'Standby' : 'Offline'}
                </span>
                {activeUser.country && (
                  <span className="inline-flex items-center gap-1 text-xs text-[#cccccc] bg-[#232323] px-2 py-0.5 rounded-md border border-[#2a2a2e]">
                    <span>{getCountryFlag(activeUser.country)}</span>
                    <span>{activeUser.country}</span>
                  </span>
                )}
              </div>
            </div>

            {activeUser.bio && (
              <p className="text-white mt-4 text-sm leading-relaxed">{activeUser.bio}</p>
            )}

            <div className="flex items-center gap-6 mt-5">
              <button 
                onClick={() => !selectedUser && handleOpenList('followers')}
                className="flex gap-1.5 items-center cursor-pointer hover:opacity-80"
              >
                <span className="font-bold text-white">{!selectedUser ? stats.followers : '-'}</span>
                <span className="text-[#777777] text-sm">
                  {stats.followers === 1 ? 'Follower' : 'Followers'}
                </span>
              </button>
              <div className="flex gap-1.5 items-center">
                <span className="font-bold text-white">0</span>
                <span className="text-[#777777] text-sm">Likes</span>
              </div>
              <button 
                onClick={() => !selectedUser && handleOpenList('following')}
                className="flex gap-1.5 items-center cursor-pointer hover:opacity-80"
              >
                <span className="font-bold text-white">{!selectedUser ? stats.following : '-'}</span>
                <span className="text-[#777777] text-sm">Following</span>
              </button>
            </div>

            {/* Posts Grid Mockup */}
            <div className="mt-8 border-t border-[#2a2a2e] pt-6">
              <div className="flex gap-4 mb-4">
                <button className="text-white font-bold pb-2 border-b-2 border-[#5003BD]">Posts</button>
                <button className="text-[#777777] font-bold pb-2 border-b-2 border-transparent">Games</button>
              </div>
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
