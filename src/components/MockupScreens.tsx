import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  MessageSquare, 
  LogOut, 
  ChevronRight, 
  ArrowLeft, 
  Check, 
  Layers, 
  Gamepad2, 
  Flame, 
  CheckCircle2,
  User,
  Lock,
  Shield,
  Bell,
  Volume2,
  Save,
  Eye,
  Sliders,
  Globe,
  Info,
  Trash2,
  Camera,
  Tv
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ALL_PLATFORMS, AVAILABLE_GAMES } from '../data/gamesAndPlatforms';

export const SearchMockup = () => (
  <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[500px] animate-in fade-in">
    <div className="w-16 h-16 bg-[#2a2a2e] rounded-2xl flex items-center justify-center mb-4 border border-[#5003BD]/30 shadow-lg shadow-[#5003BD]/20">
      <Search className="w-8 h-8 text-[#5003BD]" />
    </div>
    <h2 className="text-xl font-bold text-white mb-2">Search Players & Games</h2>
    <p className="text-[#888888] text-sm max-w-[250px] text-center">Find your next squad, explore trending clips, and follow top creators.</p>
  </div>
);

export const CreateMockup = () => (
  <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[500px] animate-in fade-in">
    <div className="w-16 h-16 bg-[#2a2a2e] rounded-2xl flex items-center justify-center mb-4 border border-[#5003BD]/30 shadow-lg shadow-[#5003BD]/20">
      <Plus className="w-8 h-8 text-[#5003BD]" />
    </div>
    <h2 className="text-xl font-bold text-white mb-2">Create New Post</h2>
    <p className="text-[#888888] text-sm max-w-[250px] text-center">Share your epic moments, clips, or start a looking-for-group post.</p>
  </div>
);

export const MessagesMockup = () => (
  <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[500px] animate-in fade-in">
    <div className="w-16 h-16 bg-[#2a2a2e] rounded-2xl flex items-center justify-center mb-4 border border-[#5003BD]/30 shadow-lg shadow-[#5003BD]/20">
      <MessageSquare className="w-8 h-8 text-[#5003BD]" />
    </div>
    <h2 className="text-xl font-bold text-white mb-2">Direct Messages</h2>
    <p className="text-[#888888] text-sm max-w-[250px] text-center">Connect with your friends, squads, and tournament organizers.</p>
  </div>
);

export const SettingsMockup = ({ 
  onSignOut, 
  onAddAccount, 
  onSwitchAccount,
  onBack 
}: { 
  onSignOut: () => void, 
  onAddAccount: () => void, 
  onSwitchAccount: (email: string) => void,
  onBack?: () => void 
}) => {
  const savedAccounts = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('gamersgrid_accounts') || '[]');
    } catch {
      return [];
    }
  }, []);

  const currentEmail = auth.currentUser?.email;

  // Active Sub-Page for WhatsApp-style drill down ('main' or specific subpage)
  const [activeSubPage, setActiveSubPage] = useState<'main' | 'profile' | 'account' | 'notifications' | 'preferences'>('main');

  // --- 1. PROFILE STATE ---
  const [gamertag, setGamertag] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [games, setGames] = useState<string[]>([]);
  
  // --- 2. ACCOUNT & SECURITY STATE ---
  const [accountTier, setAccountTier] = useState('Standard Player');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [searchVisibility, setSearchVisibility] = useState(true);
  const [passwordOld, setPasswordOld] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // --- 3. NOTIFICATIONS STATE ---
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [dmAlerts, setDmAlerts] = useState(true);
  const [tournamentUpdates, setTournamentUpdates] = useState(true);
  const [streamAlerts, setStreamAlerts] = useState(true);

  // --- 4. APP PREFERENCES STATE ---
  const [soundEffects, setSoundEffects] = useState(true);
  const [contentFilter, setContentFilter] = useState(false);
  const [language, setLanguage] = useState('en');
  const [fpsCounter, setFpsCounter] = useState(false);
  const [cacheSize, setCacheSize] = useState('14.8 MB');
  const [clearingCache, setClearingCache] = useState(false);

  // --- GLOBAL STATUS ---
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- WWW SEARCH SUGGESTIONS STATE ---
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);

  // Cool game avatar presets
  const avatarPresets = [
    { name: 'Neon Cypher', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150' },
    { name: 'Retro Mech', url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=150' },
    { name: 'Purple Fire', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=150' },
    { name: 'Cyber Samurai', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=150' },
  ];

  // 1. Fetch config from Firestore on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setGamertag(data.gamertag || '');
          setPhotoURL(data.photoURL || '');
          setPlatforms(data.platforms || []);
          setGames(data.games || []);
          
          if (data.accountTier) setAccountTier(data.accountTier);
          if (data.twoFactorEnabled !== undefined) setTwoFactorEnabled(data.twoFactorEnabled);
          if (data.privateProfile !== undefined) setPrivateProfile(data.privateProfile);
          if (data.searchVisibility !== undefined) setSearchVisibility(data.searchVisibility);
          
          if (data.pushNotifications !== undefined) setPushNotifications(data.pushNotifications);
          if (data.emailAlerts !== undefined) setEmailAlerts(data.emailAlerts);
          if (data.dmAlerts !== undefined) setDmAlerts(data.dmAlerts);
          if (data.tournamentUpdates !== undefined) setTournamentUpdates(data.tournamentUpdates);
          if (data.streamAlerts !== undefined) setStreamAlerts(data.streamAlerts);

          if (data.soundEffects !== undefined) setSoundEffects(data.soundEffects);
          if (data.contentFilter !== undefined) setContentFilter(data.contentFilter);
          if (data.language) setLanguage(data.language);
          if (data.fpsCounter !== undefined) setFpsCounter(data.fpsCounter);
        }
      } catch (err) {
        console.error('Error fetching settings details:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, []);

  // 2. Suggestions from Wikipedia and iTunes software APIs
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const queryVal = searchQuery.trim();
        const wikiPromise = fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(queryVal)}&limit=10&namespace=0&format=json&origin=*`)
          .then(r => r.json())
          .catch(() => null);
        
        const itunesPromise = fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(queryVal)}&entity=software&limit=10`)
          .then(r => r.json())
          .catch(() => null);

        const [wikiData, itunesData] = await Promise.all([wikiPromise, itunesPromise]);
        const resultsSet = new Set<string>();

        // Pre-defined matches first
        AVAILABLE_GAMES.forEach(g => {
          if (g.toLowerCase().includes(queryVal.toLowerCase())) {
            resultsSet.add(g);
          }
        });

        // Wikipedia matches
        if (wikiData && wikiData[1]) {
          for (const item of wikiData[1]) {
            if (/list of|history of|series of|franchise|novel|film|soundtrack/i.test(item)) {
              continue;
            }
            const clean = item.replace(/\s*\((video game|game|franchise|series)\)/gi, '').trim();
            if (clean && clean.length > 2) {
              resultsSet.add(clean);
            }
          }
        }

        // iTunes Mobile App matches
        if (itunesData && itunesData.results) {
          for (const item of itunesData.results) {
            if (item.primaryGenreName === 'Games') {
              const clean = item.trackName.split(/[:\-–—]/)[0].trim();
              if (clean && clean.length > 2) {
                resultsSet.add(clean);
              }
            }
          }
        }

        setSuggestions(Array.from(resultsSet).filter(Boolean).slice(0, 10));
      } catch (err) {
        console.error('Error fetching game suggestions in settings:', err);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Toggles for Platforms and Games
  const togglePlatform = (id: string) => {
    setPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
    setSaveSuccess(false);
  };

  const toggleGame = (game: string) => {
    setGames(prev =>
      prev.includes(game) ? prev.filter(g => g !== game) : [...prev, game]
    );
    setSaveSuccess(false);
  };

  // Save Settings to Firestore
  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    if (platforms.length === 0) {
      alert('Please select at least one active platform under Gaming Profile.');
      return;
    }
    if (games.length === 0) {
      alert('Please select at least one main game under Gaming Profile.');
      return;
    }

    setSaving(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { 
        gamertag: gamertag.trim(),
        photoURL: photoURL.trim(),
        platforms, 
        games,
        accountTier,
        twoFactorEnabled,
        privateProfile,
        searchVisibility,
        pushNotifications,
        emailAlerts,
        dmAlerts,
        tournamentUpdates,
        streamAlerts,
        soundEffects,
        contentFilter,
        language,
        fpsCounter
      }, { merge: true });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings profile:', err);
      alert('Failed to save configuration details.');
    } finally {
      setSaving(false);
    }
  };

  // Mock Password update submission
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordOld || !passwordNew || !passwordConfirm) {
      alert('Please enter current password, new password, and confirmation.');
      return;
    }
    if (passwordNew !== passwordConfirm) {
      alert('New password and confirmation passwords do not match.');
      return;
    }

    setPasswordUpdating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      setPasswordSuccess(true);
      setPasswordOld('');
      setPasswordNew('');
      setPasswordConfirm('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setPasswordUpdating(false);
    }
  };

  // Clear cache helper
  const handleClearCache = () => {
    setClearingCache(true);
    setTimeout(() => {
      setCacheSize('0.0 MB');
      setClearingCache(false);
    }, 1200);
  };

  return (
    <div className="w-full flex flex-col bg-[#0f0f10] text-zinc-300 min-h-[500px] animate-in fade-in duration-300 pb-20">
      
      {/* 1. WHATSAPP STYLE HEADER */}
      <div className="w-full bg-[#18181b] border-b border-zinc-800 py-3 px-4 flex items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {activeSubPage !== 'main' ? (
            <button
              onClick={() => {
                setActiveSubPage('main');
                setSearchQuery('');
              }}
              className="p-1 rounded-full text-purple-400 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            onBack && (
              <button
                onClick={onBack}
                className="p-1 rounded-full text-zinc-400 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )
          )}
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">
              {activeSubPage === 'main' && "Settings"}
              {activeSubPage === 'profile' && "Profile Setup"}
              {activeSubPage === 'account' && "Account & Security"}
              {activeSubPage === 'notifications' && "Notifications"}
              {activeSubPage === 'preferences' && "App Preferences"}
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono">
              {activeSubPage === 'main' && "Gamer's Grid Preferences"}
              {activeSubPage !== 'main' && "WhatsApp Minimal Layout"}
            </p>
          </div>
        </div>

        {/* Floating Quick Save */}
        {activeSubPage !== 'main' && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-[#5003BD] hover:bg-[#6207e3] disabled:bg-zinc-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            {saving ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            <span>Save</span>
          </button>
        )}
      </div>

      {loadingProfile ? (
        <div className="w-full py-20 flex flex-col items-center justify-center gap-2">
          <span className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-zinc-500 font-mono">Synchronizing default setup...</span>
        </div>
      ) : (
        <div className="w-full divide-y divide-zinc-800/60">

          {/* MAIN PAGE VIEW (WhatsApp settings list) */}
          {activeSubPage === 'main' && (
            <div className="flex flex-col">
              
              {/* Profile Card Header (Clicking takes user directly to profile setups) */}
              <div 
                onClick={() => setActiveSubPage('profile')}
                className="w-full p-4 flex items-center gap-3.5 hover:bg-zinc-900/40 transition-colors cursor-pointer border-b border-zinc-800/80"
              >
                <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                  {photoURL ? (
                    <img src={photoURL} alt="Profile avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xl font-bold text-white uppercase">{gamertag?.[0] || currentEmail?.[0] || 'G'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-white truncate">{gamertag || "Gamer Grid Player"}</h2>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">{currentEmail || "Standard Account"}</p>
                  <span className="inline-flex text-[9px] font-bold text-purple-400 font-mono tracking-wider bg-purple-950/30 px-1.5 py-0.5 rounded border border-purple-900/40 mt-1">
                    Edit Gaming Setup
                  </span>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600 shrink-0" />
              </div>

              {/* WHATSAPP MAIN OPTIONS LIST */}
              <div className="w-full flex flex-col py-2">
                
                {/* Option 1: Profile */}
                <div 
                  onClick={() => setActiveSubPage('profile')}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-zinc-900/40 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">Gaming Profile</h3>
                    <p className="text-xs text-zinc-500">Gamertag, avatars presets, roster, hardware setup</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>

                {/* Option 2: Account & Security */}
                <div 
                  onClick={() => setActiveSubPage('account')}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-zinc-900/40 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">Account & Security</h3>
                    <p className="text-xs text-zinc-500">Password change, email status, two-factor auth, profile privacy</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>

                {/* Option 3: Notifications */}
                <div 
                  onClick={() => setActiveSubPage('notifications')}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-zinc-900/40 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">Notifications</h3>
                    <p className="text-xs text-zinc-500">Weekly email summaries, direct messages, and tournament alerts</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>

                {/* Option 4: Preferences */}
                <div 
                  onClick={() => setActiveSubPage('preferences')}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-zinc-900/40 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">App Preferences</h3>
                    <p className="text-xs text-zinc-500">Language translation settings, navigation audio, FPS overlay, clear cache</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>

              </div>

              {/* Divider */}
              <div className="h-2 bg-[#0a0a0b] border-y border-zinc-900" />

              {/* ACCOUNTS SWITCH LIST (Unmodified as requested) */}
              <div className="w-full flex flex-col p-4 gap-2.5">
                <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-500 uppercase px-1">ACCOUNTS DISPATCH</span>
                {savedAccounts.length > 0 ? savedAccounts.map((account: any, idx: number) => {
                  const isCurrent = account.email === currentEmail;
                  return (
                    <div 
                      key={idx} 
                      onClick={() => !isCurrent && onSwitchAccount(account.email)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-colors cursor-pointer ${
                        isCurrent ? 'bg-zinc-900/30 border-purple-500/40' : 'bg-[#121214] border-zinc-800 hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center shrink-0">
                          {account.photoURL ? (
                            <img src={account.photoURL} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-bold text-white text-xs uppercase">{account.gamertag?.[0] || account.email?.[0] || 'A'}</span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs sm:text-sm font-bold text-white">
                            {account.gamertag || 'Player'}
                            {isCurrent && <span className="ml-2 text-[8px] text-purple-400 bg-purple-950/60 border border-purple-900 px-1.5 py-0.5 rounded-full font-mono font-bold">CURRENT</span>}
                          </div>
                          <div className="text-[10px] text-zinc-500">{account.email}</div>
                        </div>
                      </div>
                      {isCurrent ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></div>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-600" />
                      )}
                    </div>
                  );
                }) : (
                  <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-xl border border-purple-500/30">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#5003BD] flex items-center justify-center text-white text-xs font-bold">
                        {auth.currentUser?.email?.[0].toUpperCase() || 'A'}
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-bold text-white">Current Player</div>
                        <div className="text-[10px] text-zinc-500">{auth.currentUser?.email || 'user@example.com'}</div>
                      </div>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2"></div>
                  </div>
                )}

                <button 
                  onClick={onAddAccount}
                  className="flex items-center justify-center gap-2 p-3 mt-1.5 bg-[#18181b] hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-purple-400" />
                  ADD ANOTHER ACCOUNT
                </button>
              </div>

              {/* Divider */}
              <div className="h-2 bg-[#0a0a0b] border-y border-zinc-900" />

              {/* ACTIONS LOG OUT (Unmodified as requested) */}
              <div className="w-full flex flex-col p-4 gap-2">
                <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-500 uppercase px-1">SESSION CONTROL</span>
                <button 
                  onClick={onSignOut}
                  className="flex items-center justify-between p-3 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl transition-all border border-red-500/15 font-bold text-xs cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Sign Out from Device</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-400/50" />
                </button>
              </div>

            </div>
          )}

          {/* SUB-PAGE 1: GAMING PROFILE DETAIL */}
          {activeSubPage === 'profile' && (
            <div className="p-4 flex flex-col gap-5 animate-in slide-in-from-right-3 duration-200">
              
              {/* Profile Card Form */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Gamertag Nickname</label>
                  <input 
                    type="text" 
                    value={gamertag} 
                    onChange={(e) => { setGamertag(e.target.value); setSaveSuccess(false); }}
                    placeholder="GhostRider" 
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#5003BD]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Avatar Image URL</label>
                  <input 
                    type="text" 
                    value={photoURL} 
                    onChange={(e) => { setPhotoURL(e.target.value); setSaveSuccess(false); }}
                    placeholder="https://images.com/image.png" 
                    className="w-full bg-[#121214] border border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#5003BD] truncate"
                  />
                </div>

                {/* Preset Avatar Picker */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Default Profile Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    {avatarPresets.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setPhotoURL(preset.url);
                          setSaveSuccess(false);
                        }}
                        className={`flex items-center gap-2 p-1.5 rounded-lg border bg-[#121214] hover:bg-zinc-900 transition-all text-left cursor-pointer ${
                          photoURL === preset.url 
                            ? 'border-purple-500/50 bg-purple-950/20' 
                            : 'border-zinc-800'
                        }`}
                      >
                        <img src={preset.url} alt={preset.name} className="w-6 h-6 rounded object-cover shrink-0" referrerPolicy="no-referrer" />
                        <span className="text-[9px] font-bold text-white pr-1">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-zinc-800/80 my-2" />

                {/* Platform Selector rows */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Select Platforms</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_PLATFORMS.map((platform) => {
                      const isSelected = platforms.includes(platform.id);
                      const Icon = platform.icon;
                      return (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => togglePlatform(platform.id)}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer text-left ${
                            isSelected
                              ? 'border-[#5003BD] bg-zinc-900 text-white font-semibold'
                              : 'border-zinc-800 bg-[#121214] text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? platform.colorClass : 'text-zinc-600'}`} />
                          <span className="text-xs truncate">{platform.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <hr className="border-zinc-800/80 my-2" />

                {/* Selected Main Games list */}
                <div className="space-y-3">
                  <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Selected Main Games (No Images)</label>
                  
                  {/* Web suggestion search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search any game from web (e.g. GTA, Valorant)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-12 py-2 rounded-xl border border-zinc-800 bg-[#121214] text-xs text-white focus:outline-none focus:border-[#5003BD]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500 hover:text-white"
                      >
                        CLEAR
                      </button>
                    )}
                  </div>

                  {searching && (
                    <p className="text-[9px] text-zinc-500 animate-pulse flex items-center gap-1 pl-1">
                      <span className="w-1 h-1 bg-purple-500 rounded-full animate-ping" />
                      Loading live from Wikipedia and App Store...
                    </p>
                  )}

                  {/* Recommendations */}
                  <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-1 hide-scrollbar">
                    {searchQuery && !suggestions.includes(searchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          toggleGame(searchQuery);
                          setSearchQuery('');
                        }}
                        className="px-2.5 py-1.5 rounded-full border border-dashed border-[#5003BD]/50 bg-[#121214] text-purple-400 text-[10px] font-bold hover:bg-[#5003BD]/10 transition-colors cursor-pointer"
                      >
                        + Add Custom: "{searchQuery}"
                      </button>
                    )}

                    {(searchQuery ? suggestions : AVAILABLE_GAMES).map((game) => {
                      const isSelected = games.includes(game);
                      return (
                        <button
                          key={game}
                          type="button"
                          onClick={() => toggleGame(game)}
                          className={`px-2.5 py-1 rounded-full border text-[11px] transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#5003BD] bg-[#5003BD] text-white font-semibold'
                              : 'border-zinc-800 bg-[#121214] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          {game}
                        </button>
                      );
                    })}
                  </div>

                  {/* basket */}
                  {games.length > 0 && (
                    <div className="p-2 bg-[#121214] rounded-xl border border-zinc-800 flex flex-wrap gap-1.5">
                      {games.map((g) => (
                        <span
                          key={g}
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#5003BD]/15 text-purple-300 text-[10px] font-bold border border-[#5003BD]/20"
                        >
                          <span>{g}</span>
                          <button
                            type="button"
                            onClick={() => toggleGame(g)}
                            className="hover:bg-white/10 p-0.5 rounded text-[8px]"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Save Feedback and trigger */}
                <div className="pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                  {saveSuccess ? (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono animate-bounce">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Profile updated successfully!</span>
                    </span>
                  ) : (
                    <span className="text-[9px] text-zinc-600 font-mono">Changes persist across Gamer Grid</span>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-[#5003BD] hover:bg-[#6207e3] disabled:opacity-50 text-white font-bold text-xs rounded-xl cursor-pointer"
                  >
                    {saving ? 'Saving...' : 'Save Roster'}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* SUB-PAGE 2: ACCOUNT & SECURITY */}
          {activeSubPage === 'account' && (
            <div className="p-4 flex flex-col gap-5 animate-in slide-in-from-right-3 duration-200">
              
              <div className="space-y-4">
                {/* Email (Readonly) */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Registered Email</span>
                  <div className="bg-[#121214] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-500 font-medium select-none flex items-center justify-between">
                    <span>{auth.currentUser?.email || 'user@example.com'}</span>
                    <span className="text-[8px] font-mono font-bold uppercase text-emerald-400 bg-emerald-950/40 border border-emerald-900/20 px-1.5 py-0.5 rounded">Verified</span>
                  </div>
                </div>

                {/* Membership Status */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Membership Status</span>
                  <div className="bg-[#121214] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-400 flex items-center justify-between">
                    <span>{accountTier}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountTier(prev => prev === 'Standard Player' ? 'Pro Gamer Elite' : 'Standard Player');
                        setSaveSuccess(false);
                      }}
                      className="text-[9px] text-purple-400 font-bold hover:underline"
                    >
                      {accountTier === 'Standard Player' ? 'Upgrade' : 'Downgrade'}
                    </button>
                  </div>
                </div>

                <hr className="border-zinc-800/80 my-2" />

                {/* Switch Toggles for native settings look */}
                <div className="space-y-3 pt-1">
                  <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider">Privacy Settings</span>
                  
                  {/* Toggle: 2FA */}
                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <div className="text-xs font-semibold text-white">Two-Factor Authentication</div>
                      <div className="text-[10px] text-zinc-500">Enable secondary token codes on sign in</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setTwoFactorEnabled(!twoFactorEnabled); setSaveSuccess(false); }}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                        twoFactorEnabled ? 'bg-[#5003BD]' : 'bg-zinc-800'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                        twoFactorEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Toggle: Private account */}
                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <div className="text-xs font-semibold text-white">Private Profile Mode</div>
                      <div className="text-[10px] text-zinc-500">Only players you follow can view stats</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPrivateProfile(!privateProfile); setSaveSuccess(false); }}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                        privateProfile ? 'bg-[#5003BD]' : 'bg-zinc-800'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                        privateProfile ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Toggle: Search discoverability */}
                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <div className="text-xs font-semibold text-white">Search Discoverability</div>
                      <div className="text-[10px] text-zinc-500">Allow other players to find your profile</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSearchVisibility(!searchVisibility); setSaveSuccess(false); }}
                      className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                        searchVisibility ? 'bg-[#5003BD]' : 'bg-zinc-800'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                        searchVisibility ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

                <hr className="border-zinc-800/80 my-2" />

                {/* Password Update form */}
                <form onSubmit={handleUpdatePassword} className="space-y-3">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block">Update Security Credentials</span>
                  
                  <div className="space-y-2">
                    <input 
                      type="password" 
                      value={passwordOld}
                      onChange={(e) => setPasswordOld(e.target.value)}
                      placeholder="Current Password"
                      className="w-full bg-[#121214] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5003BD]"
                    />
                    <input 
                      type="password" 
                      value={passwordNew}
                      onChange={(e) => setPasswordNew(e.target.value)}
                      placeholder="New Password"
                      className="w-full bg-[#121214] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5003BD]"
                    />
                    <input 
                      type="password" 
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="Confirm New Password"
                      className="w-full bg-[#121214] border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#5003BD]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1.5">
                    {passwordSuccess ? (
                      <span className="text-[10px] text-emerald-400 font-mono animate-pulse">✓ Password updated!</span>
                    ) : (
                      <span className="text-[9px] text-zinc-600 font-mono">Requires 8+ characters</span>
                    )}

                    <button
                      type="submit"
                      disabled={passwordUpdating}
                      className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-bold rounded-lg border border-zinc-700 cursor-pointer"
                    >
                      {passwordUpdating ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>

              </div>

            </div>
          )}

          {/* SUB-PAGE 3: NOTIFICATIONS */}
          {activeSubPage === 'notifications' && (
            <div className="p-4 flex flex-col gap-4 animate-in slide-in-from-right-3 duration-200">
              
              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider">Alert Notifications</span>
                
                {/* Push Toggle */}
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-850/60 pb-3">
                  <div>
                    <div className="text-xs font-semibold text-white">System Push Notifications</div>
                    <div className="text-[10px] text-zinc-500">In-app follow requests and chat messages</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPushNotifications(!pushNotifications); setSaveSuccess(false); }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      pushNotifications ? 'bg-[#5003BD]' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                      pushNotifications ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Email Alert Toggle */}
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-850/60 pb-3">
                  <div>
                    <div className="text-xs font-semibold text-white">Weekly Email Digest</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Tournament details and trending squad news</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setEmailAlerts(!emailAlerts); setSaveSuccess(false); }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      emailAlerts ? 'bg-[#5003BD]' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                      emailAlerts ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* DM Toggle */}
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-850/60 pb-3">
                  <div>
                    <div className="text-xs font-semibold text-white">Direct Message Alerts</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Immediate banners on chat text receipt</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setDmAlerts(!dmAlerts); setSaveSuccess(false); }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      dmAlerts ? 'bg-[#5003BD]' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                      dmAlerts ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Tournament Toggle */}
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-850/60 pb-3">
                  <div>
                    <div className="text-xs font-semibold text-white">Tournament Bracket Matches</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Match start updates and registration deadlines</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setTournamentUpdates(!tournamentUpdates); setSaveSuccess(false); }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      tournamentUpdates ? 'bg-[#5003BD]' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                      tournamentUpdates ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Stream Alerts Toggle */}
                <div className="flex items-center justify-between py-1.5 pb-2">
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 text-zinc-500" />
                      Live Stream alerts
                    </div>
                    <div className="text-[10px] text-zinc-500 font-normal">Alert updates when players you follow go live</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setStreamAlerts(!streamAlerts); setSaveSuccess(false); }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      streamAlerts ? 'bg-[#5003BD]' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                      streamAlerts ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* SUB-PAGE 4: APP PREFERENCES */}
          {activeSubPage === 'preferences' && (
            <div className="p-4 flex flex-col gap-4 animate-in slide-in-from-right-3 duration-200">
              
              <div className="space-y-4">
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-2">App Setup & Storage</span>
                
                {/* Toggle sound effects */}
                <div className="flex items-center justify-between py-2 border-b border-zinc-850/60 pb-3">
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-zinc-500" />
                      In-app Audio Clicks
                    </div>
                    <div className="text-[10px] text-zinc-500">Play navigation clicks and sound triggers</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSoundEffects(!soundEffects); setSaveSuccess(false); }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      soundEffects ? 'bg-[#5003BD]' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                      soundEffects ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Language list selector */}
                <div className="flex items-center justify-between py-2 border-b border-zinc-850/60 pb-3">
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-zinc-500" />
                      App Language
                    </div>
                    <div className="text-[10px] text-zinc-500 font-normal">Choose content translation language</div>
                  </div>
                  <select
                    value={language}
                    onChange={(e) => { setLanguage(e.target.value); setSaveSuccess(false); }}
                    className="bg-[#121214] border border-zinc-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#5003BD]"
                  >
                    <option value="en">English (US)</option>
                    <option value="es">Español (ES)</option>
                    <option value="fr">Français (FR)</option>
                    <option value="ja">日本語 (JP)</option>
                    <option value="pt">Português (BR)</option>
                  </select>
                </div>

                {/* Toggle performance overlay */}
                <div className="flex items-center justify-between py-2 border-b border-zinc-850/60 pb-3">
                  <div>
                    <div className="text-xs font-semibold text-white">Performance FPS overlay</div>
                    <div className="text-[10px] text-zinc-500">Show rendering frame speeds inside games screen</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setFpsCounter(!fpsCounter); setSaveSuccess(false); }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      fpsCounter ? 'bg-[#5003BD]' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                      fpsCounter ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* Toggle content safe search */}
                <div className="flex items-center justify-between py-2 border-b border-zinc-850/60 pb-3">
                  <div>
                    <div className="text-xs font-semibold text-white">Profanity Safe Filter</div>
                    <div className="text-[10px] text-zinc-500 font-normal">Filter crude wording from chat streams</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setContentFilter(!contentFilter); setSaveSuccess(false); }}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none ${
                      contentFilter ? 'bg-[#5003BD]' : 'bg-zinc-800'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${
                      contentFilter ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                </div>

                {/* storage clear cache card */}
                <div className="pt-2">
                  <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-wider block mb-2">Storage Optimization</span>
                  <div className="p-3 bg-[#121214] border border-zinc-800 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">Temporary Cache Files</div>
                      <div className="text-[10px] text-zinc-500">Local cache size: <span className="font-mono text-zinc-400 font-bold">{cacheSize}</span></div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearCache}
                      disabled={clearingCache || cacheSize === '0.0 MB'}
                      className="px-2.5 py-1 text-[10px] font-mono font-bold text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500 border border-red-500/20 rounded cursor-pointer disabled:opacity-20 disabled:hover:bg-red-500/10 disabled:hover:text-red-400 transition-all flex items-center gap-1"
                    >
                      {clearingCache ? 'Clearing...' : 'Wipe Cache'}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
