import React from 'react';
import { Flame, Users, Film, Trophy, Crosshair, ShieldAlert, Target } from 'lucide-react';

export interface CategoryTab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface PillTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const PillTabs: React.FC<PillTabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: CategoryTab[] = [
    { id: 'for_you', label: 'For you', icon: <Flame className="w-3.5 h-3.5" /> },
    { id: 'following', label: 'Following', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'clips', label: 'Clips', icon: <Film className="w-3.5 h-3.5" /> },
    { id: 'tournaments', label: 'Tournaments', icon: <Trophy className="w-3.5 h-3.5" />, badge: 'LIVE' },
    { id: 'blood_strike', label: 'Blood Strike', icon: <Crosshair className="w-3.5 h-3.5" /> },
    { id: 'warzone', label: 'Warzone Mobile', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
    { id: 'pubg_mobile', label: 'PUBG Mobile', icon: <Target className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="bg-[#121212] px-4 py-2 border-b border-[#2A2A2E]/80 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-2 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              id={`tab-${tab.id}`}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-[#5003BD] text-white shadow-md shadow-[#5003BD]/30 scale-[1.02] border border-[#7A22EC]/40'
                  : 'bg-[#232323] text-[#999999] hover:text-white hover:bg-[#282828] border border-transparent'
              }`}
            >
              {tab.icon && (
                <span className={isActive ? 'text-white' : 'text-[#777777]'}>
                  {tab.icon}
                </span>
              )}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase animate-pulse tracking-tighter">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
