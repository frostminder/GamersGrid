import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GamersGridLogo } from '../components/GamersGridLogo';
import { Check, ChevronRight, Gamepad2, Monitor, Smartphone, Tv } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';

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
  const [gamertag, setGamertag] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [logoError, setLogoError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const checkGamertagUnique = async (tag: string) => {
    const q = query(collection(db, 'users'), where('gamertagLower', '==', tag.toLowerCase()));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  };

  const handleNext = async () => {
    setErrorMsg(null);

    if (step === 1) {
      setLoading(true);
      try {
        const isUnique = await checkGamertagUnique(gamertag);
        if (!isUnique) {
          setErrorMsg('This gamertag is already taken.');
          setLoading(false);
          return;
        }
        setStep(2);
      } catch (err) {
        console.error('Error checking gamertag:', err);
        setErrorMsg('Failed to verify gamertag. Please try again.');
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) throw new Error('No authenticated user found.');

        await setDoc(doc(db, 'users', user.uid), {
          gamertag: gamertag,
          gamertagLower: gamertag.toLowerCase(),
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

  const isStepValid = () => {
    if (step === 1) return gamertag.trim().length >= 3;
    if (step === 2) return selectedPlatforms.length > 0;
    if (step === 3) return selectedGames.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen w-full bg-[#121212] text-white flex flex-col p-4 sm:p-8">
      {/* Header */}
      <header className="w-full flex items-center justify-between mb-8 sm:mb-16">
        <div className="flex items-center gap-3">
          {!logoError ? (
            <img 
              src="/logo.png" 
              alt="Gamers Grid" 
              className="h-8 w-auto object-contain"
              onError={() => setLogoError(true)} 
            />
          ) : (
            <GamersGridLogo size={32} color="#7A22EC" glow={true} />
          )}
          <span className="font-mono font-bold tracking-widest hidden sm:block">GAMERS GRID</span>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-[#7A22EC]' : i < step ? 'w-4 bg-[#7A22EC]/50' : 'w-4 bg-[#2a2a2e]'
              }`}
            />
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full relative">
        {errorMsg && (
          <div className="absolute top-0 left-0 right-0 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm font-mono text-center animate-in fade-in z-10">
            {errorMsg}
          </div>
        )}
        <div className="flex-1 pt-12">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">Claim your identity.</h1>
                <p className="text-[#888888]">What should we call you on the grid?</p>
              </div>
              <div className="pt-4">
                <input
                  type="text"
                  value={gamertag}
                  onChange={(e) => setGamertag(e.target.value)}
                  placeholder="Enter your Gamertag"
                  className="w-full bg-transparent border-b-2 border-[#2a2a2e] focus:border-[#7A22EC] py-4 text-3xl font-bold outline-none transition-colors placeholder-[#333333]"
                  autoFocus
                />
                <p className="text-[#555555] text-xs font-mono mt-3">MINIMUM 3 CHARACTERS</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">Select your arsenal.</h1>
                <p className="text-[#888888]">Which platforms do you play on?</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                {PLATFORMS.map(platform => {
                  const isSelected = selectedPlatforms.includes(platform.id);
                  const Icon = platform.icon;
                  return (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`p-6 rounded-2xl border-2 flex flex-col items-center justify-center gap-4 transition-all duration-200 ${
                        isSelected 
                          ? 'border-[#7A22EC] bg-[#7A22EC]/10 text-white' 
                          : 'border-[#2a2a2e] bg-[#1a1a1a] text-[#888888] hover:border-[#555555]'
                      }`}
                    >
                      <Icon className="w-8 h-8" />
                      <span className="font-bold font-mono">{platform.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold mb-2">Your main games.</h1>
                <p className="text-[#888888]">Select the games you want to see in your feed and tournaments.</p>
              </div>
              <div className="flex flex-wrap gap-3 pt-4">
                {GAMES.map(game => {
                  const isSelected = selectedGames.includes(game);
                  return (
                    <button
                      key={game}
                      onClick={() => toggleGame(game)}
                      className={`px-5 py-3 rounded-full border transition-all duration-200 flex items-center gap-2 ${
                        isSelected 
                          ? 'border-[#7A22EC] bg-[#7A22EC] text-white font-bold shadow-[0_0_15px_rgba(122,34,236,0.4)]' 
                          : 'border-[#2a2a2e] bg-[#1a1a1a] text-[#aaaaaa] hover:bg-[#2a2a2e]'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4" />}
                      {game}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="pt-8 pb-4 flex justify-end">
          <button
            onClick={handleNext}
            disabled={!isStepValid() || loading}
            className="bg-white text-black hover:bg-gray-200 disabled:bg-[#333333] disabled:text-[#555555] font-bold py-4 px-8 rounded-full flex items-center gap-2 transition-colors duration-200"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {step === 3 ? 'COMPLETE SETUP' : 'CONTINUE'}
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};
