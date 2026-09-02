import React, { useEffect, useState, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { LogOut, Settings, Camera, Crown, Plus, Image as ImageIcon, Eye, Play } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

interface ProfileTabProps {
  onNavigate?: (tab: string) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('Posts');

  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    window.location.href = '/auth';
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'photoURL' | 'bannerURL') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = field === 'bannerURL' ? 1200 : 400;
        const MAX_HEIGHT = field === 'bannerURL' ? 600 : 400;
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
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Save to Firestore
        if (auth.currentUser) {
          setDoc(doc(db, 'users', auth.currentUser.uid), { [field]: dataUrl }, { merge: true });
          setProfile((prev: any) => ({ ...prev, [field]: dataUrl }));
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
      <div className="relative w-full h-48 sm:h-64 bg-[#121212] flex-shrink-0">
        {profile.bannerURL ? (
          <img src={profile.bannerURL} alt="Banner" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#2a2a2e] to-[#1a1a1a] flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-[#555555] opacity-50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1f] to-transparent opacity-80" />
        
        {/* Settings */}
        <div className="absolute top-4 right-4 flex items-center gap-3">
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
          className="absolute bottom-4 right-4 p-2.5 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-colors text-white border border-white/10 shadow-lg"
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
      <div className="w-full max-w-4xl mx-auto px-4 -mt-16 sm:-mt-24 relative z-10 flex flex-col items-center">
        
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
        <div className="flex items-center gap-3 mt-4">
          <Crown className="w-6 h-6 text-[#f59e0b]" />
          <h1 className="text-3xl font-black tracking-wide text-white">{profile.gamertag}</h1>
        </div>
        <p className="text-[#888888] font-mono mt-1 text-[15px]">
          @{profile.gamertagLower}
        </p>

        {/* Bio & Country */}
        {(profile.bio || profile.country) && (
          <div className="mt-4 text-center max-w-md px-4">
            {profile.bio && (
              <p className="text-[#eeeeee] text-sm mb-2 leading-relaxed">
                {profile.bio}
              </p>
            )}
            {profile.country && (
              <p className="text-[#777777] font-mono text-xs uppercase tracking-widest">
                📍 {profile.country}
              </p>
            )}
          </div>
        )}

        {/* Stats Row */}
        <div className="flex w-full max-w-md justify-between mt-8 mb-2 px-2">
          <div className="flex flex-col items-center flex-1">
            <span className="text-[#aaaaaa] text-[13px] font-mono mb-1">Followers</span>
            <span className="text-xl font-black text-white">42.2K</span>
          </div>
          <div className="w-px bg-[#2a2a2e] my-1"></div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[#aaaaaa] text-[13px] font-mono mb-1">Likes</span>
            <span className="text-xl font-black text-white">44K</span>
          </div>
          <div className="w-px bg-[#2a2a2e] my-1"></div>
          <div className="flex flex-col items-center flex-1">
            <span className="text-[#aaaaaa] text-[13px] font-mono mb-1">Following</span>
            <span className="text-xl font-black text-white">332</span>
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

        {/* Posts Grid Mock */}
        <div className="w-full mt-1 grid grid-cols-3 gap-1">
          {/* Post 1 */}
          <div className="aspect-square bg-[#2a2a2e] relative group cursor-pointer overflow-hidden">
            <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold bg-black/50 px-1.5 py-0.5 rounded backdrop-blur">
              <Eye className="w-3 h-3" /> 14K
            </div>
          </div>
          {/* Post 2 */}
          <div className="aspect-square bg-[#2a2a2e] relative group cursor-pointer overflow-hidden">
            <img src="https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute top-2 right-2 p-1 bg-black/50 rounded-md backdrop-blur">
              <Play className="w-3 h-3 text-white" />
            </div>
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold bg-black/50 px-1.5 py-0.5 rounded backdrop-blur">
              <Eye className="w-3 h-3" /> 24K
            </div>
          </div>
          {/* Post 3 */}
          <div className="aspect-square bg-[#2a2a2e] relative group cursor-pointer overflow-hidden">
            <img src="https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold bg-black/50 px-1.5 py-0.5 rounded backdrop-blur">
              <Eye className="w-3 h-3" /> 8K
            </div>
          </div>
          {/* Post 4 */}
          <div className="aspect-square bg-[#2a2a2e] relative group cursor-pointer overflow-hidden">
            <img src="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
          {/* Post 5 */}
          <div className="aspect-square bg-[#2a2a2e] relative group cursor-pointer overflow-hidden">
            <img src="https://images.unsplash.com/photo-1605901309584-818e25960b8f?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute top-2 right-2 p-1 bg-black/50 rounded-md backdrop-blur">
              <Play className="w-3 h-3 text-white" />
            </div>
          </div>
          {/* Post 6 */}
          <div className="aspect-square bg-[#2a2a2e] relative group cursor-pointer overflow-hidden">
            <img src="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&q=80&w=800" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
        </div>

      </div>
    </div>
  );
};
