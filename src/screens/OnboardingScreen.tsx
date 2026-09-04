import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GamersGridLogo } from '../components/GamersGridLogo';
import { 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown, 
  Gamepad2, 
  Monitor, 
  Smartphone, 
  Tv, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Camera, 
  Upload, 
  Sparkles, 
  Trash2 
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { updateProfile } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { COUNTRIES, getCountryFlag } from '../data/countries';

const PLATFORMS = [
  { id: 'pc', label: 'PC', icon: Monitor },
  { id: 'ps', label: 'PlayStation', icon: Gamepad2 },
  { id: 'xbox', label: 'Xbox', icon: Tv },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
];

const GAMES = [
  'Blood Strike',
  'Free Fire',
  'Call of Duty: Warzone',
  'EA FC 25',
  'Valorant',
  'Fortnite',
  'Apex Legends',
  'Super Smash Bros',
  'League of Legends',
  'CS2',
  'Rocket League'
];

export const AVATAR_PRESETS = [
  { id: 'mecha', name: 'Cyber Mecha', url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=MechaNeo&backgroundColor=1f1b2e' },
  { id: 'ninja', name: 'Shadow Ninja', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ShadowNinja&backgroundColor=121b28' },
  { id: 'viper', name: 'Neon Viper', url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=NeonViper&backgroundColor=2d124d' },
  { id: 'knight', name: 'Titan Knight', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=TitanKnight&backgroundColor=1b2a26' },
  { id: 'pixel', name: 'Retro Pixel', url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=PixelWarrior&backgroundColor=251c35' },
  { id: 'sorcerer', name: 'Void Mage', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=VoidMage&backgroundColor=2c163b' },
  { id: 'fox', name: 'Cyber Fox', url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=CyberFox&backgroundColor=331e1e' },
  { id: 'sniper', name: 'Apex Hunter', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ApexSniper&backgroundColor=152238' },
  { id: 'reaper', name: 'Phantom', url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=PhantomReaper&backgroundColor=222222' },
  { id: 'samurai', name: 'Ronin', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=RoninBlade&backgroundColor=291b25' },
  { id: 'pilot', name: 'Star Pilot', url: 'https://api.dicebear.com/7.x/bottts-neutral/svg?seed=StarPilot&backgroundColor=112836' },
  { id: 'champion', name: 'Champion', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ChampionGold&backgroundColor=2e2312' },
];

export const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [gamertag, setGamertag] = useState('');
  const [bio, setBio] = useState('');
  const [country, setCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Profile Picture State
  const [selectedAvatar, setSelectedAvatar] = useState<string>(
    auth.currentUser?.photoURL || AVATAR_PRESETS[0].url
  );
  const [isCustomAvatar, setIsCustomAvatar] = useState<boolean>(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [logoError, setLogoError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [tagStatus, setTagStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Online game search states
  const [gameSearchQuery, setGameSearchQuery] = useState('');
  const [gameSuggestions, setGameSuggestions] = useState<string[]>([]);
  const [searchingGames, setSearchingGames] = useState(false);

  // Live dynamic game search from Wikipedia & iTunes APIs
  useEffect(() => {
    if (!gameSearchQuery.trim()) {
      setGameSuggestions([]);
      setSearchingGames(false);
      return;
    }

    setSearchingGames(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const queryVal = gameSearchQuery.trim();
        // Query Wikipedia OpenSearch and iTunes search in parallel
        const wikiPromise = fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(queryVal)}&limit=10&namespace=0&format=json&origin=*`)
          .then(r => r.json())
          .catch(() => null);
        
        const itunesPromise = fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(queryVal)}&entity=software&limit=10`)
          .then(r => r.json())
          .catch(() => null);

        const [wikiData, itunesData] = await Promise.all([wikiPromise, itunesPromise]);
        const resultsSet = new Set<string>();

        // 1. Add matching pre-defined games
        GAMES.forEach(g => {
          if (g.toLowerCase().includes(queryVal.toLowerCase())) {
            resultsSet.add(g);
          }
        });

        // 2. Parse Wikipedia results
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

        // 3. Parse iTunes Software results
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

        // Filter and cap
        const finalResults = Array.from(resultsSet).filter(Boolean).slice(0, 10);
        setGameSuggestions(finalResults);
      } catch (err) {
        console.error('Error searching games online:', err);
      } finally {
        setSearchingGames(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [gameSearchQuery]);

  // Close country dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkGamertagUnique = async (tag: string) => {
    const q = query(collection(db, 'users'), where('gamertagLower', '==', tag.toLowerCase()));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  };

  useEffect(() => {
    if (step !== 1) return;
    
    if (gamertag.trim().length < 3) {
      setTagStatus('idle');
      return;
    }

    setTagStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const isUnique = await checkGamertagUnique(gamertag.trim());
        setTagStatus(isUnique ? 'available' : 'taken');
      } catch (err) {
        console.error('Error checking gamertag:', err);
        setTagStatus('idle');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [gamertag, step]);

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image size should be less than 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 280;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setSelectedAvatar(dataUrl);
        setIsCustomAvatar(true);
        setErrorMsg(null);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleGame = (game: string) => {
    setSelectedGames(prev => 
      prev.includes(game) ? prev.filter(g => g !== game) : [...prev, game]
    );
  };

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const isStep1Valid = Boolean(
    name.trim().length >= 2 &&
    gamertag.trim().length >= 3 &&
    tagStatus === 'available' &&
    bio.trim().length >= 5 &&
    country.trim().length > 0
  );

  const isStep2Valid = Boolean(selectedAvatar && selectedAvatar.trim().length > 0);
  const isStep3Valid = selectedPlatforms.length > 0;
  const isStep4Valid = selectedGames.length > 0;

  const isStepValid = () => {
    if (step === 1) return isStep1Valid;
    if (step === 2) return isStep2Valid;
    if (step === 3) return isStep3Valid;
    if (step === 4) return isStep4Valid;
    return true;
  };

  const handleNext = async () => {
    setErrorMsg(null);

    if (step === 1) {
      if (name.trim().length < 2) {
        setErrorMsg('Display name is compulsory (minimum 2 characters).');
        return;
      }
      if (gamertag.trim().length < 3) {
        setErrorMsg('Gamertag is compulsory (minimum 3 characters).');
        return;
      }
      if (tagStatus === 'taken') {
        setErrorMsg('This gamertag is already taken. Please choose another.');
        return;
      }
      if (tagStatus !== 'available') {
        setErrorMsg('Please wait for gamertag availability check.');
        return;
      }
      if (bio.trim().length < 5) {
        setErrorMsg('Bio is compulsory (minimum 5 characters).');
        return;
      }
      if (!country.trim()) {
        setErrorMsg('Please select your country (compulsory).');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedAvatar) {
        setErrorMsg('Please select or upload a profile picture.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (selectedPlatforms.length === 0) {
        setErrorMsg('Please select at least one gaming platform (compulsory).');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      if (selectedGames.length === 0) {
        setErrorMsg('Please select at least one main game (compulsory).');
        return;
      }
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('No authenticated user found.');

        const profileData: Record<string, any> = {
          name: name.trim(),
          gamertag: gamertag.trim(),
          gamertagLower: gamertag.trim().toLowerCase(),
          bio: bio.trim(),
          country: country.trim(),
          platforms: selectedPlatforms,
          games: selectedGames,
          createdAt: new Date().toISOString(),
          email: user.email || '',
        };

        if (selectedAvatar) {
          profileData.photoURL = selectedAvatar;
        }

        await setDoc(doc(db, 'users', user.uid), profileData);

        try {
          await updateProfile(user, {
            displayName: name.trim(),
            ...(selectedAvatar ? { photoURL: selectedAvatar } : {})
          });
        } catch {
          // non-blocking
        }

        navigate('/home', { replace: true });
      } catch (err: any) {
        console.error('Error saving profile:', err);
        setErrorMsg(err?.message ? `Failed to save profile: ${err.message}` : 'Failed to save profile. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#121212] text-white flex flex-col p-4 sm:p-6 overflow-hidden">
      {/* Tight, Clean Header */}
      <header className="w-full flex items-center justify-between mb-3 sm:mb-4 pb-2 border-b border-[#2a2a2e]/50 shrink-0">
        <div className="flex items-center gap-2.5">
          {!logoError ? (
            <img 
              src="/logo.png" 
              alt="Gamers Grid" 
              className="h-7 w-auto object-contain"
              onError={() => setLogoError(true)} 
            />
          ) : (
            <GamersGridLogo size={28} color="#5003BD" glow={true} />
          )}
          <span className="font-mono font-bold text-sm tracking-widest hidden sm:block">GAMERS GRID</span>
        </div>
        
        {/* Step Progress Indicators with Back-click ability */}
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map(i => (
            <button 
              key={i} 
              type="button"
              onClick={() => {
                if (i < step) {
                  setErrorMsg(null);
                  setStep(i);
                }
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step 
                  ? 'w-7 bg-[#5003BD]' 
                  : i < step 
                    ? 'w-4 bg-[#5003BD]/60 hover:bg-[#5003BD] cursor-pointer' 
                    : 'w-3 bg-[#2a2a2e]'
              }`}
              title={i < step ? `Go back to Step ${i}` : undefined}
            />
          ))}
          <span className="text-xs font-mono text-[#888888] ml-1">Step {step}/4</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full relative min-h-0">
        {errorMsg && (
          <div className="mb-2 p-2.5 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-xs font-mono text-center animate-in fade-in shrink-0">
            {errorMsg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 pr-1">
          {/* STEP 1: IDENTITY */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Claim your identity.</h1>
                <p className="text-[#888888] text-xs sm:text-sm">
                  Set up your player profile. <span className="text-amber-400 font-semibold">* All fields are compulsory</span>
                </p>
              </div>

              {/* Display Name */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#aaaaaa] uppercase tracking-wider">
                    Display Name <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[11px] text-[#777777] font-mono">Real or preferred name</span>
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Johnson"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2e] focus:border-[#5003BD] rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors"
                  autoFocus
                />
              </div>

              {/* Gamertag (Unique) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#aaaaaa] uppercase tracking-wider">
                    Gamertag <span className="text-red-400">* (Unique)</span>
                  </label>
                  <span className="text-[11px] font-mono text-[#777777]">
                    {tagStatus === 'available' && <span className="text-green-400">Available</span>}
                    {tagStatus === 'taken' && <span className="text-red-400">Already taken</span>}
                    {tagStatus === 'checking' && <span className="text-[#5003BD]">Checking...</span>}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-[#666666] font-bold text-base select-none">@</span>
                  <input
                    type="text"
                    value={gamertag}
                    onChange={(e) => setGamertag(e.target.value.replace(/\s+/g, ''))}
                    placeholder="Gamertag"
                    className={`w-full bg-[#1a1a1a] border rounded-xl pl-8 pr-10 py-3 text-white font-bold text-base outline-none transition-colors ${
                      tagStatus === 'taken' ? 'border-red-500 focus:border-red-500' : 'border-[#2a2a2e] focus:border-[#5003BD]'
                    }`}
                  />
                  <div className="absolute right-3">
                    {tagStatus === 'checking' && <Loader2 className="w-5 h-5 text-[#5003BD] animate-spin" />}
                    {tagStatus === 'available' && gamertag.trim().length >= 3 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {tagStatus === 'taken' && gamertag.trim().length >= 3 && <XCircle className="w-5 h-5 text-red-500" />}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#aaaaaa] uppercase tracking-wider">
                    Bio <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[11px] text-[#777777] font-mono">Min 5 chars</span>
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community about yourself, favorite games, or competitive experience..."
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2e] focus:border-[#5003BD] rounded-xl px-4 py-2.5 text-white text-sm outline-none resize-none h-20 transition-colors"
                />
              </div>

              {/* Country Picker with 195+ Countries & Visible Flags */}
              <div ref={countryDropdownRef} className="relative">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#aaaaaa] uppercase tracking-wider">
                    Country <span className="text-red-400">*</span>
                  </label>
                  <span className="text-[11px] text-[#777777] font-mono">With flag display</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCountryDropdownOpen(prev => !prev)}
                  className={`w-full bg-[#1a1a1a] border rounded-xl px-4 py-3 text-white outline-none flex items-center justify-between transition-colors text-left cursor-pointer ${
                    isCountryDropdownOpen ? 'border-[#5003BD]' : 'border-[#2a2a2e] hover:border-[#44444c]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl leading-none">{getCountryFlag(country)}</span>
                    <span className={`text-sm ${country ? 'text-white font-medium' : 'text-[#777777]'}`}>
                      {country || 'Select your country *'}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[#888888] transition-transform ${isCountryDropdownOpen ? 'rotate-180 text-white' : ''}`} />
                </button>

                {isCountryDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1d] border border-[#3a3a42] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2 border-b border-[#2a2a2e] flex items-center gap-2 bg-[#141416]">
                      <Search className="w-4 h-4 text-[#888888]" />
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Search 195+ countries..."
                        className="w-full bg-transparent text-xs text-white placeholder-[#777777] outline-none"
                        autoFocus
                      />
                      {countrySearch && (
                        <button 
                          type="button" 
                          onClick={() => setCountrySearch('')}
                          className="text-xs text-[#888888] hover:text-white px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    
                    <div className="max-h-56 overflow-y-auto divide-y divide-[#242428] overscroll-contain">
                      {filteredCountries.length === 0 ? (
                        <div className="p-4 text-center text-xs text-[#777777]">No country found</div>
                      ) : (
                        filteredCountries.map(c => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setCountry(c.name);
                              setIsCountryDropdownOpen(false);
                              setCountrySearch('');
                            }}
                            className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-[#25252c] transition-colors text-left cursor-pointer ${
                              country === c.name ? 'bg-[#5003BD]/20 text-white font-semibold' : 'text-[#cccccc]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-lg leading-none">{c.flag}</span>
                              <span className="text-xs sm:text-sm">{c.name}</span>
                            </div>
                            {country === c.name && <Check className="w-4 h-4 text-[#7A22EC]" />}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PROFILE PICTURE SELECTION */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Choose your avatar.</h1>
                <p className="text-[#888888] text-xs sm:text-sm">
                  Select a gamer persona or upload your own custom photo.
                </p>
              </div>

              {/* Active Avatar Focus Card */}
              <div className="p-4 rounded-2xl bg-[#18181b] border border-[#2a2a2e] flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-[#5003BD] bg-[#1f1b2e] p-1 shadow-[0_0_20px_rgba(80,3,189,0.35)] overflow-hidden flex items-center justify-center">
                    <img 
                      src={selectedAvatar} 
                      alt="Selected Profile" 
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-[#5003BD] p-1.5 rounded-full text-white border-2 border-[#18181b] shadow-md">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">{name || 'Gamer Profile'}</h3>
                    {country && <span className="text-sm">{getCountryFlag(country)}</span>}
                  </div>
                  <p className="text-[#888888] text-xs font-mono mb-3">
                    @{gamertag || 'gamertag'}
                  </p>

                  <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={avatarFileInputRef} 
                      onChange={handleCustomAvatarUpload}
                    />
                    <button
                      type="button"
                      onClick={() => avatarFileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#2a2a30] hover:bg-[#383842] text-xs font-semibold text-white border border-[#3f3f4a] transition-colors cursor-pointer shadow-sm"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#a855f7]" />
                      <span>{isCustomAvatar ? 'Change Custom Photo' : 'Upload Custom Photo'}</span>
                    </button>

                    {isCustomAvatar && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomAvatar(false);
                          setSelectedAvatar(AVATAR_PRESETS[0].url);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs text-red-400 border border-red-500/30 transition-colors cursor-pointer"
                        title="Remove uploaded photo and return to gamer presets"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Presets</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Gamer Avatars Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#aaaaaa] uppercase tracking-wider">
                    Gamer Personas
                  </span>
                  <span className="text-[11px] font-mono text-[#777777]">
                    Tap to select
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {AVATAR_PRESETS.map((avatar) => {
                    const isSelected = selectedAvatar === avatar.url;
                    return (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(avatar.url);
                          setIsCustomAvatar(false);
                          setErrorMsg(null);
                        }}
                        className={`relative rounded-2xl p-1.5 flex flex-col items-center gap-1 transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? 'bg-[#5003BD]/20 border-2 border-[#5003BD] shadow-[0_0_12px_rgba(80,3,189,0.4)] scale-102' 
                            : 'bg-[#1a1a1a] border border-[#2a2a2e] hover:border-[#44444e] hover:bg-[#222228]'
                        }`}
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-[#141416] flex items-center justify-center">
                          <img 
                            src={avatar.url} 
                            alt={avatar.name} 
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <span className="text-[10px] font-medium text-[#cccccc] truncate w-full text-center">
                          {avatar.name}
                        </span>

                        {isSelected && (
                          <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#5003BD] text-white flex items-center justify-center shadow">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PLATFORMS */}
          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Select your arsenal.</h1>
                <p className="text-[#888888] text-xs sm:text-sm">
                  Which platforms do you play on? <span className="text-red-400 font-semibold">* Select at least 1</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                {PLATFORMS.map(platform => {
                  const isSelected = selectedPlatforms.includes(platform.id);
                  const Icon = platform.icon;
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => togglePlatform(platform.id)}
                      className={`p-5 rounded-xl border-2 flex flex-col items-center justify-center gap-3 transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'border-[#5003BD] bg-[#5003BD]/15 text-white shadow-[0_0_15px_rgba(80,3,189,0.3)]' 
                          : 'border-[#2a2a2e] bg-[#1a1a1a] text-[#888888] hover:border-[#44444c]'
                      }`}
                    >
                      <Icon className="w-7 h-7" />
                      <span className="font-bold font-mono text-sm">{platform.label}</span>
                      {isSelected && <Check className="w-4 h-4 text-[#7A22EC]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: GAMES */}
          {step === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Your main games.</h1>
                <p className="text-[#888888] text-xs sm:text-sm">
                  Search and pick your favorite titles. <span className="text-red-400 font-semibold">* Select at least 1</span>
                </p>
              </div>

              {/* 1. Dynamic Web Search Bar */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
                  <input
                    type="text"
                    placeholder="Search any game from the web (e.g. Elden Ring, Blood Strike, GTA)..."
                    value={gameSearchQuery}
                    onChange={(e) => setGameSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-[#2a2a2e] bg-[#121214] text-white text-xs sm:text-sm focus:outline-none focus:border-[#5003BD] transition-all"
                  />
                  {gameSearchQuery ? (
                    <button
                      type="button"
                      onClick={() => setGameSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 hover:text-white"
                    >
                      CLEAR
                    </button>
                  ) : searchingGames ? (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-[#5003BD] border-t-transparent rounded-full animate-spin" />
                  ) : null}
                </div>

                {searchingGames && (
                  <p className="text-[11px] text-zinc-500 flex items-center gap-1.5 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping" />
                    Searching game titles across the web...
                  </p>
                )}
              </div>

              {/* 2. Selected games container */}
              {selectedGames.length > 0 && (
                <div className="bg-[#18181c]/60 border border-purple-500/15 rounded-xl p-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-purple-400 tracking-wider uppercase font-mono">
                    YOUR SELECTIONS ({selectedGames.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedGames.map(game => (
                      <span
                        key={game}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#5003BD]/20 text-purple-300 text-xs border border-[#5003BD]/40 font-semibold"
                      >
                        <span>{game}</span>
                        <button
                          type="button"
                          onClick={() => toggleGame(game)}
                          className="hover:text-white hover:bg-white/10 rounded-full p-0.5 shrink-0"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Suggestions List */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#888888] tracking-wider uppercase font-mono">
                  {gameSearchQuery ? 'SEARCH RESULTS' : 'POPULAR INITIAL GAMES'}
                </span>

                <div className="flex flex-wrap gap-2 max-h-[190px] overflow-y-auto pr-1 hide-scrollbar">
                  {/* Custom option if user query isn't directly in suggestions */}
                  {gameSearchQuery && !gameSuggestions.includes(gameSearchQuery) && (
                    <button
                      type="button"
                      onClick={() => {
                        toggleGame(gameSearchQuery);
                        setGameSearchQuery('');
                      }}
                      className="px-3.5 py-2 rounded-full border border-dashed border-[#5003BD]/50 bg-[#121214] text-purple-400 hover:text-white hover:bg-[#5003BD]/20 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>+ Add Custom: "{gameSearchQuery}"</span>
                    </button>
                  )}

                  {(gameSearchQuery ? gameSuggestions : GAMES).map(game => {
                    const isSelected = selectedGames.includes(game);
                    return (
                      <button
                        key={game}
                        type="button"
                        onClick={() => toggleGame(game)}
                        className={`px-3.5 py-2 rounded-full border text-xs transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                          isSelected 
                            ? 'border-[#5003BD] bg-[#5003BD] text-white font-bold shadow-[0_0_10px_rgba(80,3,189,0.3)]' 
                            : 'border-[#2a2a2e] bg-[#121214] text-[#aaaaaa] hover:bg-[#1e1e22] hover:border-[#44444c] hover:text-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                        {game}
                      </button>
                    );
                  })}

                  {gameSearchQuery && gameSuggestions.length === 0 && !searchingGames && (
                    <div className="w-full py-4 text-center text-xs text-zinc-500">
                      No matching games found online. You can add it as a custom game above!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation with Back Button */}
        <div className="pt-3 pb-2 flex items-center justify-between border-t border-[#2a2a2e]/50 mt-auto shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setStep(prev => prev - 1);
              }}
              className="flex items-center gap-1.5 px-5 py-3 rounded-full border border-[#2a2a2e] bg-[#1a1a1a] hover:bg-[#252528] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              BACK
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={!isStepValid() || loading}
            className="bg-white text-black hover:bg-gray-200 disabled:bg-[#2a2a2e] disabled:text-[#555555] font-bold py-3 px-7 rounded-full flex items-center gap-2 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed text-xs sm:text-sm shadow-md"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {step === 4 ? 'COMPLETE SETUP' : 'CONTINUE'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};
