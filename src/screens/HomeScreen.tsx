import React from 'react';
import { ShieldCheck, Wifi, Users, LayoutDashboard, Settings } from 'lucide-react';
import { GamersGridLogo } from '../components/GamersGridLogo';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const HomeScreen: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);

  return (
    <div className="min-h-screen w-full bg-[#121212] text-white flex flex-col items-center">
      {/* Top Navigation */}
      <header className="w-full bg-[#1a1a1a] border-b border-[#2a2a2e] px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <GamersGridLogo size={28} color="#7A22EC" glow={true} />
          <span className="font-mono font-bold tracking-widest text-[#eeeeee]">GAMERS GRID</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#888888] bg-[#121212] px-2.5 py-1 rounded-full border border-[#2a2a2e]">
            <Wifi className="w-3.5 h-3.5 text-[#7A22EC]" />
            <span className="hidden sm:inline">ONLINE</span>
          </div>
          <button className="p-2 rounded-full hover:bg-[#2a2a2e] transition-colors">
            <Settings className="w-5 h-5 text-[#888888]" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl px-4 py-8 flex flex-col gap-6">
        
        {/* PWA Install Banner */}
        {(!isInstalled && isInstallable) && (
          <div className="w-full bg-gradient-to-r from-[#5003BD]/20 to-[#7A22EC]/20 border border-[#7A22EC]/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white mb-1">Install Gamers Grid</h3>
              <p className="text-sm text-[#aaaaaa]">Get the full experience by installing our app on your home screen.</p>
            </div>
            <button
              onClick={install}
              className="whitespace-nowrap px-4 py-2 bg-[#7A22EC] hover:bg-[#6818dd] text-white font-medium rounded-lg transition-colors"
            >
              Install App
            </button>
          </div>
        )}

        {/* iOS Install Prompt */}
        {(!isInstalled && isIOS) && (
          <div className="w-full bg-gradient-to-r from-[#5003BD]/20 to-[#7A22EC]/20 border border-[#7A22EC]/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white mb-1">Install on iOS</h3>
              <p className="text-sm text-[#aaaaaa]">Add Gamers Grid to your home screen for quick access.</p>
            </div>
            <button
              onClick={() => setShowIOSGuide(true)}
              className="whitespace-nowrap px-4 py-2 bg-[#7A22EC] hover:bg-[#6818dd] text-white font-medium rounded-lg transition-colors"
            >
              How to Install
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2e] rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px] hover:border-[#5003BD] transition-colors cursor-pointer group">
            <LayoutDashboard className="w-12 h-12 text-[#555555] mb-4 group-hover:text-[#7A22EC] transition-colors" />
            <h2 className="text-lg font-bold">Dashboard</h2>
            <p className="text-sm text-[#777777] mt-2 text-center">View your stats and current standing.</p>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2e] rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px] hover:border-[#5003BD] transition-colors cursor-pointer group">
            <Users className="w-12 h-12 text-[#555555] mb-4 group-hover:text-[#7A22EC] transition-colors" />
            <h2 className="text-lg font-bold">Tournaments</h2>
            <p className="text-sm text-[#777777] mt-2 text-center">Join open lobbies and track brackets.</p>
          </div>
        </div>
      </main>

      {/* iOS Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-[#1c1c1f] border border-[#2a2a2e] p-6 shadow-2xl animate-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-white mb-3">Install on iPhone / iPad</h3>
            <p className="text-sm text-[#aaaaaa] mb-5 leading-relaxed">
              1. Tap the <strong className="text-white">Share</strong> button in your Safari toolbar at the bottom.<br/><br/>
              2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-lg bg-[#2a2a2e] hover:bg-[#383842] py-3 text-sm font-bold text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
