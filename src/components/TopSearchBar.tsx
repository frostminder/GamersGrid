import React, { useState } from 'react';
import { Search, SlidersHorizontal, Bell, Coins, Gem, Sparkles, X, Check } from 'lucide-react';
import { GamersGridLogo } from './GamersGridLogo';
import { WalletState } from '../types/mockData';

interface TopSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  wallet: WalletState;
  onOpenWallet: () => void;
  onOpenNotifications?: () => void;
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
  onOpenPostClip?: () => void;
}

export const TopSearchBar: React.FC<TopSearchBarProps> = ({
  searchQuery,
  onSearchChange,
  wallet,
  onOpenWallet,
  selectedFilter,
  onSelectFilter,
}) => {
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const filterOptions = [
    { id: 'all', label: 'All Content' },
    { id: 'verified', label: 'Verified Creators Only' },
    { id: 'tournaments', label: 'Tournaments & Brackets' },
    { id: 'clutches', label: '1v4 & Squad Clutches' },
    { id: 'guides', label: 'Guides & Meta Weapon Builds' },
    { id: 'under_1min', label: 'Quick Clips (< 1 min)' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#121212]/95 backdrop-blur-md border-b border-[#2A2A2E] px-4 py-2.5 transition-all">
      {/* Top row: Brand + Currency counters + Actions */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2">
          <GamersGridLogo size={32} showText={true} glow={true} color="#5003BD" />
        </div>

        {/* Right side widgets: Coins & Shards + Notifications */}
        <div className="flex items-center gap-2">
          {/* Currency Pill */}
          <button
            onClick={onOpenWallet}
            id="wallet-chip-btn"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#232323] border border-[#5003BD]/50 hover:border-[#5003BD] hover:bg-[#282828] transition-all cursor-pointer group shadow-sm"
            title="Open Wallet & Coin Shop"
          >
            {/* Grid Coins (Paid) */}
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                <Coins className="w-2.5 h-2.5 text-amber-400" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-amber-300 font-mono-uid">
                {wallet.gridCoins.toLocaleString()}
              </span>
            </div>

            <div className="w-px h-3 bg-[#2A2A2E]" />

            {/* Grid Shards (Earned) */}
            <div className="flex items-center gap-1">
              <Gem className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span className="text-xs font-bold text-cyan-300 font-mono-uid">
                {wallet.gridShards.toLocaleString()}
              </span>
            </div>
          </button>

          {/* Notifications Button */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              id="notifications-btn"
              className="relative p-2 rounded-full bg-[#232323] text-[#999999] hover:text-white hover:bg-[#2A2A2E] transition-colors cursor-pointer border border-[#2A2A2E]"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#5003BD] animate-ping" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#7A22EC]" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-[#232323] border border-[#5003BD]/40 rounded-xl p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-[#2A2A2E] mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-white">Live Alerts</span>
                  <button onClick={() => setNotificationsOpen(false)} className="text-[#999999] hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2 rounded-lg bg-[#121212] border border-[#5003BD]/30">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] mb-0.5">
                      <Sparkles className="w-3 h-3" />
                      <span>OCR Room Verified</span>
                    </div>
                    <p className="text-[#CCCCCC]">Room BS-ROOM-9921 code released. Your seat #2 is confirmed.</p>
                    <span className="text-[10px] text-[#777777] mt-1 block">5 min ago</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#121212] border border-[#2A2A2E]">
                    <div className="text-cyan-400 font-bold text-[11px] mb-0.5">Daily Streak Reward</div>
                    <p className="text-[#CCCCCC]">+500 Grid Shards credited for watching highlights.</p>
                    <span className="text-[10px] text-[#777777] mt-1 block">1h ago</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom row: Search input matching roadmap specs: '#232323' fill, '0.5px' border '#5003BD', filter icon on right */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-[#777777] pointer-events-none">
          <Search className="w-4 h-4" />
        </div>

        <input
          id="main-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search clips, creators, tournaments, games..."
          className="w-full bg-[#232323] text-white placeholder-[#777777] text-sm rounded-full pl-10 pr-11 py-2 border-[0.5px] border-[#5003BD] focus:outline-none focus:ring-1 focus:ring-[#7A22EC] focus:border-[#7A22EC] transition-all shadow-inner"
        />

        {searchQuery ? (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-10 p-1 text-[#777777] hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}

        <button
          onClick={() => setShowFilterModal(true)}
          id="search-filter-btn"
          className="absolute right-2 p-1.5 text-[#999999] hover:text-white hover:bg-[#2A2A2E] rounded-full transition-colors cursor-pointer"
          title="Filter search"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#7A22EC]" />
        </button>
      </div>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#232323] border border-[#5003BD] rounded-2xl w-full max-w-sm p-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2E] mb-4">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#7A22EC]" />
                <h3 className="font-gaming text-lg font-bold uppercase tracking-wider text-white">Feed Filter</h3>
              </div>
              <button onClick={() => setShowFilterModal(false)} className="text-[#999999] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 mb-5">
              {filterOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => {
                    onSelectFilter(opt.id);
                    setShowFilterModal(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-sm transition-all cursor-pointer ${
                    selectedFilter === opt.id
                      ? 'bg-[#5003BD] text-white font-semibold shadow-lg shadow-[#5003BD]/30'
                      : 'bg-[#121212] text-[#CCCCCC] hover:bg-[#282828]'
                  }`}
                >
                  <span>{opt.label}</span>
                  {selectedFilter === opt.id && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-[#777777] bg-[#121212] p-2.5 rounded-lg border border-[#2A2A2E] mb-4">
              💡 <strong>"For You" Hard Exclusion:</strong> Once a post is viewed, it is filtered from For You automatically. Search remains unfiltered.
            </div>

            <button
              onClick={() => setShowFilterModal(false)}
              className="w-full py-2.5 bg-[#2A2A2E] hover:bg-[#333333] text-white font-medium rounded-xl text-sm transition-colors cursor-pointer"
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
