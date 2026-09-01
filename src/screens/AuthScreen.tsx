import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GamersGridLogo } from '../components/GamersGridLogo';
import { auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../lib/firebase';
import { Mail, Lock, ArrowRight, Chrome } from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/onboarding');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      // For Google Auth, we could check if they are a new user to route to onboarding vs home.
      // For now, we will route to onboarding for the demo flow.
      navigate('/onboarding');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#121212] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#5003BD] opacity-[0.03] rounded-full blur-[140px]" />
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(to right, #5003BD 1px, transparent 1px), linear-gradient(to bottom, #5003BD 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      <div className="w-full max-w-md z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          {!logoError ? (
            <img 
              src="/logo.png" 
              alt="Gamers Grid" 
              className="h-16 w-auto object-contain mb-4 drop-shadow-[0_0_15px_rgba(122,34,236,0.5)]"
              onError={() => setLogoError(true)} 
            />
          ) : (
            <div className="mb-4">
              <GamersGridLogo size={64} color="#7A22EC" glow={true} />
            </div>
          )}
          <h1 className="text-2xl font-mono font-bold tracking-widest text-[#eeeeee]">GAMERS GRID</h1>
          <p className="text-[#888888] font-mono text-sm mt-2">ENTER THE LOBBY</p>
        </div>

        <div className="w-full bg-[#1a1a1a] border border-[#2a2a2e] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm">
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm font-mono text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#aaaaaa] ml-1">EMAIL ADDRESS</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-[#555555]" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2a2a2e] rounded-xl py-3 pl-10 pr-4 text-white placeholder-[#555555] focus:outline-none focus:border-[#7A22EC] transition-colors"
                  placeholder="player@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-[#aaaaaa] ml-1">PASSWORD</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-[#555555]" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#121212] border border-[#2a2a2e] rounded-xl py-3 pl-10 pr-4 text-white placeholder-[#555555] focus:outline-none focus:border-[#7A22EC] transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#7A22EC] hover:bg-[#6818dd] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLogin ? 'SIGN IN' : 'CREATE ACCOUNT'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-[#2a2a2e]"></div>
            <span className="text-xs font-mono text-[#555555]">OR</span>
            <div className="flex-1 h-px bg-[#2a2a2e]"></div>
          </div>

          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="mt-6 w-full bg-white text-black hover:bg-gray-100 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Chrome className="w-5 h-5" />
            CONTINUE WITH GOOGLE
          </button>
        </div>

        {/* Toggle Mode */}
        <p className="mt-8 text-sm text-[#777777] font-mono">
          {isLogin ? "DON'T HAVE AN ACCOUNT?" : "ALREADY REGISTERED?"}{' '}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#7A22EC] hover:text-[#9b51f0] font-bold underline decoration-[#7A22EC]/30 underline-offset-4 transition-colors"
          >
            {isLogin ? 'SIGN UP' : 'SIGN IN'}
          </button>
        </p>
      </div>
    </div>
  );
};
