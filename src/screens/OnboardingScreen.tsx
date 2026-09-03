import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GamersGridLogo } from '../components/GamersGridLogo';
import { Check, ChevronRight, ChevronLeft, ChevronDown, Gamepad2, Monitor, Smartphone, Tv, Loader2, CheckCircle2, XCircle, Search } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { COUNTRIES, getCountryFlag } from '../data/countries';

const PLATFORMS = [
  { id: 'pc', label: 'PC', icon: Monitor },
  { id: 'ps', label: 'PlayStation', icon: Gamepad2 },
  { id: 'xbox', label: 'Xbox', icon: Tv },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
];

const GAMES = [
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

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [logoError, setLogoError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [tagStatus, setTagStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

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

  const isStep2Valid = selectedPlatforms.length > 0;
  const isStep3Valid = selectedGames.length > 0;

  const isStepValid = () => {
    if (step === 1) return isStep1Valid;
    if (step === 2) return isStep2Valid;
    if (step === 3) return isStep3Valid;
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
      if (selectedPlatforms.length === 0) {
        setErrorMsg('Please select at least one gaming platform (compulsory).');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (selectedGames.length === 0) {
        setErrorMsg('Please select at least one main game (compulsory).');
        return;
      }
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('No authenticated user found.');

        await setDoc(doc(db, 'users', user.uid), {
          name: name.trim(),
          gamertag: gamertag.trim(),
          gamertagLower: gamertag.trim().toLowerCase(),
          bio: bio.trim(),
          country: country.trim(),
          platforms: selectedPlatforms,
          games: selectedGames,
          createdAt: new Date().toISOString(),
          photoURL: user.photoURL || null,
          email: user.email,
        });
        navigate('/home');
      } catch (err) {
        console.error('Error saving profile:', err);
        setErrorMsg('Failed to save profile. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="h-[100dvh] w-full bg-[#121212] text-white flex flex-col p-4 sm:p-6 overflow-hidden">
      {/* Tight, Clean Header */}
      <header className="w-full flex items-center justify-between mb-3 sm:mb-4 pb-2 border-b border-[#2a2a2e]/50">
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
          {[1, 2, 3].map(i => (
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
          <span className="text-xs font-mono text-[#888888] ml-1">Step {step}/3</span>
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

          {step === 2 && (
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

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Your main games.</h1>
                <p className="text-[#888888] text-xs sm:text-sm">
                  Pick your favorite titles for your feed and tournaments. <span className="text-red-400 font-semibold">* Select at least 1</span>
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-2">
                {GAMES.map(game => {
                  const isSelected = selectedGames.includes(game);
                  return (
                    <button
                      key={game}
                      type="button"
                      onClick={() => toggleGame(game)}
                      className={`px-4 py-2.5 rounded-full border text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                        isSelected 
                          ? 'border-[#5003BD] bg-[#5003BD] text-white font-bold shadow-[0_0_15px_rgba(80,3,189,0.4)]' 
                          : 'border-[#2a2a2e] bg-[#1a1a1a] text-[#aaaaaa] hover:bg-[#252528] hover:border-[#44444c]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      {game}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation with Back Button */}
        <div className="pt-3 pb-2 flex items-center justify-between border-t border-[#2a2a2e]/50 mt-auto">
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
                {step === 3 ? 'COMPLETE SETUP' : 'CONTINUE'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};
