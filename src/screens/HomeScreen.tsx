import React, { useState, useEffect } from 'react';
import { ShieldCheck, Wifi, Users, LayoutDashboard, Settings, Bell, Home, Trophy, PlaySquare, User } from 'lucide-react';
import { GamersGridLogo } from '../components/GamersGridLogo';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { auth } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export const HomeScreen: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#121212] text-white flex flex-col items-center pb-24">
      {/* Premium Top Navigation */}
      <header className="w-full bg-[#121212]/80 backdrop-blur-xl border-b border-[#2a2a2e] px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {!logoError ? (
            <img 
              src="/logo.png" 
              alt="GamersGrid" 
              className="h-8 w-auto object-contain drop-shadow-[0_0_8px_rgba(122,34,236,0.5)]" 
              onError={() => setLogoError(true)} 
            />
          ) : (
            <GamersGridLogo size={32} color="#7A22EC" glow={true} />
          )}
          <span className="font-mono font-bold tracking-widest text-white hidden sm:block">GAMERS GRID</span>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <button className="relative p-2 rounded-full hover:bg-[#2a2a2e] transition-colors group">
            <Bell className="w-5 h-5 text-[#aaaaaa] group-hover:text-white transition-colors" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#7A22EC] rounded-full border border-[#121212]"></span>
          </button>
          
          {/* User Avatar */}
          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#5003BD] to-[#7A22EC] p-[2px] cursor-pointer hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-sm text-white">{user?.email?.[0].toUpperCase() || 'G'}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl px-4 py-6 flex flex-col gap-6">
        
        {/* Quick Stats / Welcome */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome back.</h1>
            <p className="text-[#888888] text-sm">Ready to dominate the grid?</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#888888] bg-[#1a1a1a] px-3 py-1.5 rounded-full border border-[#2a2a2e] shadow-inner">
            <Wifi className="w-3.5 h-3.5 text-[#7A22EC] animate-pulse" />
            <span className="text-[#eeeeee]">ONLINE</span>
          </div>
        </div>

        {/* PWA Install Banner */}
        {(!isInstalled && isInstallable) && (
          <div className="w-full bg-gradient-to-r from-[#5003BD]/20 to-[#7A22EC]/20 border border-[#7A22EC]/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(122,34,236,0.1)]">
            <div>
              <h3 className="font-bold text-white mb-1">Install Gamers Grid</h3>
              <p className="text-sm text-[#aaaaaa]">Get the full experience by installing our app on your home screen.</p>
            </div>
            <button
              onClick={install}
              className="whitespace-nowrap px-5 py-2.5 bg-[#7A22EC] hover:bg-[#6818dd] text-white font-bold rounded-xl transition-colors shadow-lg shadow-[#7A22EC]/20"
            >
              Install App
            </button>
          </div>
        )}

        {/* iOS Install Prompt */}
        {(!isInstalled && isIOS) && (
          <div className="w-full bg-gradient-to-r from-[#5003BD]/20 to-[#7A22EC]/20 border border-[#7A22EC]/30 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(122,34,236,0.1)]">
            <div>
              <h3 className="font-bold text-white mb-1">Install on iOS</h3>
              <p className="text-sm text-[#aaaaaa]">Add Gamers Grid to your home screen for quick access.</p>
            </div>
            <button
              onClick={() => setShowIOSGuide(true)}
              className="whitespace-nowrap px-5 py-2.5 bg-[#7A22EC] hover:bg-[#6818dd] text-white font-bold rounded-xl transition-colors shadow-lg shadow-[#7A22EC]/20"
            >
              How to Install
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2e] rounded-2xl p-6 flex flex-col items-start justify-center min-h-[180px] hover:border-[#5003BD] hover:bg-[#1c1c20] transition-all cursor-pointer group shadow-lg">
            <div className="p-3 bg-[#121212] rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
              <LayoutDashboard className="w-8 h-8 text-[#7A22EC]" />
            </div>
            <h2 className="text-xl font-bold">Dashboard</h2>
            <p className="text-sm text-[#777777] mt-1">View your stats and current standing.</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2e] rounded-2xl p-6 flex flex-col items-start justify-center min-h-[180px] hover:border-[#5003BD] hover:bg-[#1c1c20] transition-all cursor-pointer group shadow-lg">
            <div className="p-3 bg-[#121212] rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300">
              <Users className="w-8 h-8 text-[#7A22EC]" />
            </div>
            <h2 className="text-xl font-bold">Tournaments</h2>
            <p className="text-sm text-[#777777] mt-1">Join open lobbies and track brackets.</p>
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 w-full max-w-md bg-[#1a1a1a]/90 backdrop-blur-xl border-t border-[#2a2a2e] pb-4 sm:pb-0 z-50 rounded-t-2xl sm:rounded-none sm:max-w-none">
        <div className="flex items-center justify-around px-2 py-3 sm:max-w-md sm:mx-auto">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'tournaments', icon: Trophy, label: 'Tournaments' },
            { id: 'feed', icon: PlaySquare, label: 'Feed' },
            { id: 'profile', icon: User, label: 'Profile' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 w-16 transition-colors ${
                  isActive ? 'text-[#7A22EC]' : 'text-[#777777] hover:text-[#aaaaaa]'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#7A22EC]/10' : ''}`}>
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'text-white' : ''}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* iOS Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#1c1c1f] border border-[#2a2a2e] p-8 shadow-2xl animate-in slide-in-from-bottom-4">
            <h3 className="text-xl font-bold text-white mb-4">Install on iPhone / iPad</h3>
            <p className="text-[15px] text-[#aaaaaa] mb-8 leading-relaxed">
              1. Tap the <strong className="text-white">Share</strong> button in your Safari toolbar at the bottom.<br/><br/>
              2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-[#2a2a2e] hover:bg-[#383842] py-4 text-sm font-bold text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
