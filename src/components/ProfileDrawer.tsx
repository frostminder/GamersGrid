import React, { useState } from 'react';
import { 
  X, ShieldCheck, Crown, Trophy, Coins, Gem, Link, Edit3, 
  Check, Film, Bookmark, ExternalLink 
} from 'lucide-react';
import { User, WalletState, CURRENT_USER, Post } from '../types/mockData';

interface ProfileDrawerProps {
  user: User;
  wallet: WalletState;
  posts: Post[];
  onClose: () => void;
  onOpenWallet: () => void;
  onUpdateLinkedAccounts: (bloodStrikeUid: string, warzoneTag: string, pubgId: string) => void;
}

export const ProfileDrawer: React.FC<ProfileDrawerProps> = ({
  user,
  wallet,
  posts,
  onClose,
  onOpenWallet,
  onUpdateLinkedAccounts,
}) => {
  const [isEditingAccounts, setIsEditingAccounts] = useState(false);
  const [bsUid, setBsUid] = useState(user.linkedAccounts?.bloodStrikeUid || 'BS-884920194');
  const [wzTag, setWzTag] = useState(user.linkedAccounts?.warzoneTag || 'ViperSniper#4491');
  const [pubgId, setPubgId] = useState(user.linkedAccounts?.pubgId || '551984201');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveAccounts = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateLinkedAccounts(bsUid, wzTag, pubgId);
    setIsEditingAccounts(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const myClips = posts.filter((p) => p.creator.id === 'usr_me' || p.creator.username === 'ShadowReaper');

  return (
    <div className="bg-[#232323] rounded-2xl border border-[#2A2A2E] overflow-hidden p-5 shadow-2xl mb-24 space-y-6">
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-[#2A2A2E]">
        <div className="relative">
          <div className="p-1 rounded-full bg-gradient-to-tr from-[#5003BD] via-purple-400 to-cyan-400">
            <img
              src={user.avatar}
              alt={user.displayName}
              className="w-20 h-20 rounded-full object-cover bg-black"
            />
          </div>
          <span className="absolute -bottom-1 -right-1 bg-[#5003BD] text-white text-xs font-black px-2 py-0.5 rounded-full border-2 border-[#121212] font-mono-uid">
            LVL {user.level}
          </span>
        </div>

        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h2 className="font-gaming text-2xl font-black text-white">{user.displayName}</h2>
            {user.isVerified && <ShieldCheck className="w-5 h-5 text-cyan-400" />}
            {wallet.isPremium && (
              <span className="flex items-center gap-1 bg-[#5003BD] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                <Crown className="w-3 h-3 text-amber-300" />
                <span>PRO HOST</span>
              </span>
            )}
          </div>
          <p className="text-xs text-[#999999]">@{user.username}</p>
          <p className="text-xs text-[#CCCCCC] max-w-md">{user.bio}</p>

          {/* XP Bar */}
          <div className="pt-2 max-w-xs">
            <div className="flex justify-between text-[10px] text-[#888888] font-mono-uid mb-1">
              <span>XP: {user.xp.toLocaleString()} / 10,000</span>
              <span>Level 43 in 1,550 XP</span>
            </div>
            <div className="w-full h-1.5 bg-[#121212] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#5003BD] to-cyan-400 rounded-full w-[84%]" />
            </div>
          </div>
        </div>

        {/* Action Button: Wallet */}
        <button
          onClick={onOpenWallet}
          className="px-4 py-2 bg-[#121212] hover:bg-[#282828] text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <Coins className="w-4 h-4" />
          <span>Manage Wallet</span>
        </button>
      </div>

      {/* Linked Game Accounts Section (Critical for Fast Tournament Registrations) */}
      <div className="p-4 rounded-2xl bg-[#181818] border border-[#5003BD]/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link className="w-4 h-4 text-[#7A22EC]" />
            <h3 className="font-gaming text-base font-bold uppercase tracking-wider text-white">
              Linked Game Identifiers (UIDs)
            </h3>
          </div>

          <button
            onClick={() => setIsEditingAccounts(!isEditingAccounts)}
            className="text-xs font-bold text-purple-300 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingAccounts ? 'Cancel' : 'Edit UIDs'}</span>
          </button>
        </div>

        {savedSuccess && (
          <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            <span>Game UIDs saved successfully! Auto-filled for tournament matches.</span>
          </div>
        )}

        {isEditingAccounts ? (
          <form onSubmit={handleSaveAccounts} className="space-y-3 pt-2 text-xs">
            <div>
              <label className="block text-[#999999] mb-1 font-semibold">Blood Strike UID</label>
              <input
                type="text"
                value={bsUid}
                onChange={(e) => setBsUid(e.target.value)}
                className="w-full bg-[#121212] text-white p-2 rounded-xl border border-[#2A2A2E] focus:border-[#5003BD] focus:outline-none font-mono-uid"
              />
            </div>
            <div>
              <label className="block text-[#999999] mb-1 font-semibold">Warzone Mobile Tag</label>
              <input
                type="text"
                value={wzTag}
                onChange={(e) => setWzTag(e.target.value)}
                className="w-full bg-[#121212] text-white p-2 rounded-xl border border-[#2A2A2E] focus:border-[#5003BD] focus:outline-none font-mono-uid"
              />
            </div>
            <div>
              <label className="block text-[#999999] mb-1 font-semibold">PUBG Mobile Numeric ID</label>
              <input
                type="text"
                value={pubgId}
                onChange={(e) => setPubgId(e.target.value)}
                className="w-full bg-[#121212] text-white p-2 rounded-xl border border-[#2A2A2E] focus:border-[#5003BD] focus:outline-none font-mono-uid"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#5003BD] hover:bg-[#7A22EC] text-white font-bold rounded-xl cursor-pointer"
            >
              Save Linked Accounts
            </button>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-[#121212] border border-[#2A2A2E]">
              <span className="text-[10px] text-[#777777] uppercase block font-bold">Blood Strike</span>
              <span className="font-mono-uid text-white font-bold">{bsUid}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#121212] border border-[#2A2A2E]">
              <span className="text-[10px] text-[#777777] uppercase block font-bold">Warzone Tag</span>
              <span className="font-mono-uid text-white font-bold">{wzTag}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#121212] border border-[#2A2A2E]">
              <span className="text-[10px] text-[#777777] uppercase block font-bold">PUBG ID</span>
              <span className="font-mono-uid text-white font-bold">{pubgId}</span>
            </div>
          </div>
        )}
      </div>

      {/* Esports Trophy Cabinet */}
      <div className="space-y-3">
        <h3 className="font-gaming text-base font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Esports Trophies & Badges</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#181818] border border-amber-500/30 text-center space-y-1">
            <Trophy className="w-6 h-6 text-amber-400 mx-auto" />
            <div className="text-xs font-bold text-white">1st Place Alpha Cup</div>
            <span className="text-[10px] text-[#888888]">Blood Strike Solo</span>
          </div>
          <div className="p-3 rounded-xl bg-[#181818] border border-cyan-500/30 text-center space-y-1">
            <ShieldCheck className="w-6 h-6 text-cyan-400 mx-auto" />
            <div className="text-xs font-bold text-white">OCR Verified Pro</div>
            <span className="text-[10px] text-[#888888]">Zero Discrepancies</span>
          </div>
          <div className="p-3 rounded-xl bg-[#181818] border border-purple-500/30 text-center space-y-1">
            <Crown className="w-6 h-6 text-purple-400 mx-auto" />
            <div className="text-xs font-bold text-white">Host Pioneer</div>
            <span className="text-[10px] text-[#888888]">Hosted 12+ Rooms</span>
          </div>
          <div className="p-3 rounded-xl bg-[#181818] border border-emerald-500/30 text-center space-y-1">
            <Film className="w-6 h-6 text-emerald-400 mx-auto" />
            <div className="text-xs font-bold text-white">Top Creator</div>
            <span className="text-[10px] text-[#888888]">10k+ Clip Views</span>
          </div>
        </div>
      </div>
    </div>
  );
};
