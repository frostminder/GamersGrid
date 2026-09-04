import React from 'react';
import { Search, Plus, MessageSquare, Settings as SettingsIcon, Users, LogOut, ChevronRight, ArrowLeft } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

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
  const savedAccounts = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('gamersgrid_accounts') || '[]');
    } catch {
      return [];
    }
  }, []);

  const currentEmail = auth.currentUser?.email;

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-300 pb-20 pt-0 px-0">
      <div className="flex items-center gap-3 mb-1">
        {onBack && (
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] transition-colors cursor-pointer"
            title="Back to profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-xl font-bold text-white">Settings</h1>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2e] rounded-2xl p-4 flex flex-col gap-2">
        <h3 className="text-sm font-bold tracking-wider text-[#888888] mb-2 px-2">ACCOUNTS</h3>
        
        {savedAccounts.length > 0 ? savedAccounts.map((account: any, idx: number) => {
          const isCurrent = account.email === currentEmail;
          return (
            <div 
              key={idx} 
              onClick={() => !isCurrent && onSwitchAccount(account.email)}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                isCurrent ? 'bg-[#121212] border-[#5003BD]/50' : 'bg-[#121212] border-[#2a2a2e] hover:bg-[#1c1c20]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2a2a2e] flex items-center justify-center overflow-hidden shrink-0">
                  {account.photoURL ? (
                    <img src={account.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-white uppercase">{account.gamertag?.[0] || account.email?.[0] || 'A'}</span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">
                    {account.gamertag || 'Player'}
                    {isCurrent && <span className="ml-2 text-[10px] text-[#5003BD] bg-[#5003BD]/20 px-2 py-0.5 rounded-full">CURRENT</span>}
                  </div>
                  <div className="text-xs text-[#777777]">{account.email}</div>
                </div>
              </div>
              {isCurrent ? (
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              ) : (
                <ChevronRight className="w-4 h-4 text-[#555555]" />
              )}
            </div>
          );
        }) : (
          <div className="flex items-center justify-between p-3 bg-[#121212] rounded-xl border border-[#5003BD]/50 cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#5003BD] flex items-center justify-center text-white font-bold">
                {auth.currentUser?.email?.[0].toUpperCase() || 'A'}
              </div>
              <div>
                <div className="text-sm font-bold text-white">Current Account</div>
                <div className="text-xs text-[#777777]">{auth.currentUser?.email || 'user@example.com'}</div>
              </div>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
          </div>
        )}

        <button 
          onClick={onAddAccount}
          className="flex items-center justify-center gap-2 p-3 mt-2 bg-[#2a2a2e] hover:bg-[#383842] rounded-xl text-sm font-bold text-white transition-colors"
        >
          <Plus className="w-4 h-4" />
          ADD ANOTHER ACCOUNT
        </button>
      </div>

      <div className="bg-[#1a1a1a] border border-[#2a2a2e] rounded-2xl p-4 flex flex-col gap-2">
        <h3 className="text-sm font-bold tracking-wider text-[#888888] mb-2 px-2">ACTIONS</h3>
        
        <button 
          onClick={onSignOut}
          className="flex items-center justify-between p-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors border border-red-500/20 font-bold"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </div>
        </button>
      </div>
    </div>
  );
};
