import React from 'react';
import { Home, Film, Trophy, MessageSquare, User as UserIcon } from 'lucide-react';
import { GamersGridLogo } from './GamersGridLogo';

export type NavigationTab = 'home' | 'clips' | 'tournaments' | 'chat' | 'profile';

interface GlassBottomTabsProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  unreadChatCount?: number;
  liveTournamentCount?: number;
}

export const GlassBottomTabs: React.FC<GlassBottomTabsProps> = ({
  activeTab,
  onSelectTab,
  unreadChatCount = 3,
  liveTournamentCount = 2,
}) => {
  const tabs = [
    {
      id: 'home' as NavigationTab,
      label: 'Home',
      icon: Home,
    },
    {
      id: 'clips' as NavigationTab,
      label: 'Clips',
      icon: Film,
    },
    {
      id: 'tournaments' as NavigationTab,
      label: 'Tournaments',
      icon: Trophy,
      badge: liveTournamentCount > 0 ? liveTournamentCount : undefined,
    },
    {
      id: 'chat' as NavigationTab,
      label: 'Chat',
      icon: MessageSquare,
      badge: unreadChatCount > 0 ? unreadChatCount : undefined,
    },
    {
      id: 'profile' as NavigationTab,
      label: 'Profile',
      icon: UserIcon,
    },
  ];

  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <nav
        aria-label="Bottom Navigation"
        className="glass-nav-pill pointer-events-auto flex items-center justify-between px-3 sm:px-6 py-2.5 rounded-[26px] max-w-md w-full transition-all duration-300 transform shadow-2xl"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              id={`bottom-nav-${tab.id}`}
              className={`relative flex flex-col items-center justify-center py-1 px-2.5 sm:px-3 rounded-2xl transition-all duration-200 cursor-pointer group ${
                isActive
                  ? 'text-white'
                  : 'text-[#999999] hover:text-[#CCCCCC]'
              }`}
            >
              {/* Active Glow Pill Background */}
              {isActive && (
                <div className="absolute inset-0 bg-[#5003BD] rounded-xl shadow-lg shadow-[#5003BD]/50 -z-10 animate-in zoom-in-90 duration-150" />
              )}

              {/* Icon Container with Badge */}
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 text-white' : 'group-hover:scale-105'
                  }`}
                />

                {tab.badge !== undefined && !isActive && (
                  <span className="absolute -top-1.5 -right-2 bg-[#5003BD] text-white font-bold text-[9px] min-w-[15px] h-[15px] flex items-center justify-center rounded-full border border-white/20 px-0.5">
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] mt-0.5 font-bold tracking-tight whitespace-nowrap transition-colors ${
                  isActive ? 'text-white' : 'text-[#888888] group-hover:text-[#BBBBBB]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
