import React, { useEffect, useState, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { LogOut, Settings, Camera, Crown, Plus, Image as ImageIcon, Eye, Play, Trophy, Medal, Award, Flame } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { getFollowStats, getFollowers, getFollowing, UserProfile } from '../lib/userService';
import { UserListModal } from './UserListModal';
import { PublicProfileModal } from './PublicProfileModal';
import { getCountryFlag } from '../data/countries';
import { ProfileGamesSection } from './profile/ProfileGamesSection';

interface ProfileTabProps {
  onNavigate?: (tab: string) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('Games');

  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [showListModal, setShowListModal] = useState<'followers' | 'following' | null>(null);
  const [listUsers, setListUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }
        const s = await getFollowStats(auth.currentUser.uid);
        setStats({ followers: s.followersCount, following: s.followingCount });
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleOpenList = async (type: 'followers' | 'following') => {
    if (!auth.currentUser) return;
    setShowListModal(type);
    if (type === 'followers') {
      const users = await getFollowers(auth.currentUser.uid);
      setListUsers(users);
    } else {
      const users = await getFollowing(auth.currentUser.uid);
      setListUsers(users);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/auth';
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'photoURL' | 'bannerURL') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = field === 'bannerURL' ? 800 : 400;
        const MAX_HEIGHT = field === 'bannerURL' ? 400 : 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', field === 'bannerURL' ? 0.5 : 0.8);
        
        // Save to Firestore
        if (auth.currentUser) {
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid), { [field]: dataUrl }, { merge: true });
            setProfile((prev: any) => ({ ...prev, [field]: dataUrl }));
          } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. It might be too large.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center min-h-screen text-center">
        <div className="w-8 h-8 border-4 border-[#5003BD] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[400px] text-center gap-4">
        <p className="text-[#888888]">Profile not found.</p>
        <button 
          onClick={handleSignOut}
          className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors font-bold"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#1c1c1f] flex flex-col animate-in fade-in duration-300 pb-20">
      
      {/* Banner Section */}
      <div className="relative w-full h-48 sm:h-64 bg-[#121212] flex-shrink-0 z-0">
        {profile.bannerURL ? (
          <img src={profile.bannerURL} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#2a2a2e] to-[#1a1a1a] flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-[#555555] opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1f] to-transparent opacity-80" />
        
        {/* Settings */}
        <div className="absolute top-4 right-4 flex items-center gap-3 z-20">
          <button 
            onClick={() => onNavigate && onNavigate('settings')}
            className="p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-colors text-white border border-white/10 shadow-lg"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Edit Banner Button */}
        <button 
          onClick={() => bannerInputRef.current?.click()}
          className="absolute bottom-4 right-4 p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-colors text-white border border-white/10 shadow-lg z-20"
        >
          <Camera className="w-5 h-5" />
        </button>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={bannerInputRef} 
          onChange={(e) => handleImageUpload(e, 'bannerURL')}
        />
      </div>

      {/* Profile Details Container */}
      <div className="w-full max-w-4xl mx-auto px-4 -mt-16 sm:-mt-24 relative z-20 flex flex-col items-center">
        
        {/* Avatar */}
        <div className="relative group">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-[#1c1c1f] border-[6px] border-[#1c1c1f] shadow-2xl flex items-center justify-center overflow-hidden shrink-0">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#2a2a2e] flex items-center justify-center">
                <span className="font-bold text-5xl text-white">{profile.gamertag?.[0]?.toUpperCase() || 'G'}</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => avatarInputRef.current?.click()}
            className="absolute bottom-1 right-1 p-2.5 bg-[#5003BD] hover:bg-[#3d0291] rounded-full transition-colors text-white shadow-lg border-2 border-[#1c1c1f] z-20"
          >
            <Camera className="w-4 h-4" />
          </button>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={avatarInputRef} 
            onChange={(e) => handleImageUpload(e, 'photoURL')}
          />
        </div>

        {/* Name & Handle */}
        <div className="flex flex-col items-center mt-4">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-[#f59e0b]" />
            <h1 className="text-3xl font-black tracking-wide text-white">{profile.name || profile.gamertag}</h1>
          </div>
          <p className="text-[#888888] font-mono mt-1 text-[15px]">
            @{profile.gamertagLower || profile.gamertag}
          </p>
        </div>

        {/* Bio & Country */}
        {(profile.bio || profile.country) && (
          <div className="mt-4 text-center max-w-md px-4">
            <p className="text-[#eeeeee] text-sm leading-relaxed inline">
              {profile.bio}
            </p>
            {profile.bio && profile.country && (
              <span className="mx-2 text-[#444444]">|</span>
            )}
            {profile.country && (
              <span className="text-[#cccccc] font-medium text-xs tracking-wide inline-flex items-center gap-1.5 bg-[#25252a] px-2.5 py-0.5 rounded-full border border-[#333338]">
                <span>{getCountryFlag(profile.country)}</span>
                <span>{profile.country}</span>
              </span>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div className="flex w-full max-w-md justify-between mt-8 mb-2 px-2">
          <div 
            onClick={() => handleOpenList('followers')}
            className="flex flex-col items-center flex-1 cursor-pointer hover:opacity-80"
          >
            <span className="text-[#aaaaaa] text-[13px] font-mono mb-1">
              {stats.followers === 1 ? 'Follower' : 'Followers'}
            </span>
            <span className="text-xl font-black text-white">{stats.followers}</span>
          </div>
          <div className="w-px bg-[#2a2a2e] my-1"></div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[#aaaaaa] text-[13px] font-mono mb-1">Likes</span>
            <span className="text-xl font-black text-white">0</span>
          </div>
          <div className="w-px bg-[#2a2a2e] my-1"></div>
          <div 
            onClick={() => handleOpenList('following')}
            className="flex flex-col items-center flex-1 cursor-pointer hover:opacity-80"
          >
            <span className="text-[#aaaaaa] text-[13px] font-mono mb-1">Following</span>
            <span className="text-xl font-black text-white">{stats.following}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="w-full border-b border-[#2a2a2e] mt-6 flex">
          {['Games', 'Posts', 'Achievements'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 pb-4 pt-2 text-[15px] font-medium transition-colors border-b-2 ${
                activeTab === tab 
                  ? 'text-white border-[#5003BD] bg-gradient-to-t from-[#5003BD]/10 to-transparent' 
                  : 'text-[#888888] border-transparent hover:text-white'
              }`}
            >
              <div className={`mx-auto w-max px-4 py-1.5 rounded-lg ${activeTab === tab ? 'bg-[#5003BD]' : ''}`}>
                {tab}
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'Games' && (
          <ProfileGamesSection 
            platforms={profile.platforms || []} 
            games={profile.games || []} 
            isOwner={true}
            onUpdate={(newPlatforms, newGames) => {
              setProfile((prev: any) => ({ ...prev, platforms: newPlatforms, games: newGames }));
            }}
          />
        )}

        {activeTab === 'Posts' && (
          <div className="w-full mt-4 grid grid-cols-3 gap-1 animate-in fade-in duration-200">
            {/* Post 1 */}
            <div className="aspect-square bg-[#2a2a2e] relative group cursor-pointer overflow-hidden rounded-lg">
              <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold bg-black/50 px-1.5 py-0.5 rounded backdrop-blur">
                <Eye className="w-3 h-3" /> 14K
              </div>
            </div>
            {/* Post 2 */}
            <div className="aspect-square bg-[#2a2a2e] relative group cursor-pointer overflow-hidden rounded-lg">
              <img src="https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-2 right-2 p-1 bg-black/50 rounded-md backdrop-blur">
                <Play className="w-3 h-3 text-white" />
              </div>
            </div>
            {/* Post 3 */}
            <div className="aspect-square bg-[#2a2a2e] relative group cursor-pointer overflow-hidden rounded-lg">
              <img src="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
          </div>
        )}

        {activeTab === 'Achievements' && (
          <div className="w-full py-6 flex flex-col gap-3 animate-in fade-in duration-200">
            <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">First Blood</span>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">UNLOCKED</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">Completed onboarding & selected primary gaming roster.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Flame className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Squad Connector</span>
                  <span className="text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">UNLOCKED</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">Connected community presence and real-time chat.</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#18181b] border border-[#27272a] flex items-center gap-3.5 opacity-70">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500">
                <Medal className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-300">Tournament Champion</span>
                  <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">IN PROGRESS</span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">Win your first official community bracket.</p>
              </div>
            </div>
          </div>
        )}

      </div>
      
      {showListModal && !selectedUser && (
        <UserListModal 
          title={showListModal === 'followers' ? 'Followers' : 'Following'}
          users={listUsers}
          onClose={() => setShowListModal(null)}
          onUserClick={(u) => setSelectedUser(u)}
        />
      )}
      
      {selectedUser && (
        <PublicProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
};
