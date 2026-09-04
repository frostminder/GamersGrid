import React from 'react';
import { 
  Gamepad2, 
  Layers, 
  Trophy, 
  Flame 
} from 'lucide-react';
import { 
  getPlatformMeta, 
  getGameMeta 
} from '../../data/gamesAndPlatforms';

interface ProfileGamesSectionProps {
  platforms?: string[];
  games?: string[];
}

export const ProfileGamesSection: React.FC<ProfileGamesSectionProps> = ({
  platforms = [],
  games = [],
}) => {
  return (
    <div className="w-full flex flex-col gap-5 py-2 animate-in fade-in duration-200">
      
      {/* 1. PLATFORMS SECTION */}
      <div className="w-full bg-[#18181b] border border-[#27272a] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5003BD]/20 border border-[#5003BD]/40 flex items-center justify-center text-[#a855f7]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Active Platforms
                <span className="text-xs font-normal text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                  {platforms.length}
                </span>
              </h2>
              <p className="text-xs text-zinc-500">Hardware and systems played on</p>
            </div>
          </div>
        </div>

        {platforms.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {platforms.map((platformId) => {
              const meta = getPlatformMeta(platformId);
              const Icon = meta.icon;
              return (
                <div
                  key={platformId}
                  className={`relative p-3.5 rounded-xl border border-zinc-800 bg-[#121214] flex flex-col items-start gap-2.5 transition-all duration-200 group hover:border-[#5003BD]/50 hover:bg-[#151518] shadow-sm`}
                >
                  <div className="w-full flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center ${meta.colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Online
                    </span>
                  </div>

                  <div className="mt-0.5">
                    <div className="text-xs sm:text-sm font-bold text-white group-hover:text-purple-300 transition-colors">
                      {meta.label}
                    </div>
                    <div className="text-[10px] sm:text-[11px] text-zinc-400 leading-snug truncate max-w-full">
                      {meta.fullName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full py-6 px-4 rounded-xl border border-dashed border-zinc-800 bg-[#121214] flex flex-col items-center justify-center text-center gap-2">
            <Gamepad2 className="w-6 h-6 text-zinc-600" />
            <p className="text-xs text-zinc-500 font-medium">No platforms specified yet.</p>
          </div>
        )}
      </div>

      {/* 2. MAIN GAMES SECTION */}
      <div className="w-full bg-[#18181b] border border-[#27272a] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Selected Games
                <span className="text-xs font-normal text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                  {games.length}
                </span>
              </h2>
              <p className="text-xs text-zinc-500">Primary gaming roster (No Images)</p>
            </div>
          </div>
        </div>

        {games.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {games.map((gameName) => {
              const meta = getGameMeta(gameName);
              return (
                <div
                  key={gameName}
                  className="rounded-xl border border-zinc-800 hover:border-[#5003BD]/50 bg-[#121214] hover:bg-[#151518] p-4 transition-all duration-200 group shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                        {meta.name}
                      </span>
                      <span className="text-[10px] font-semibold text-[#8b5cf6] bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 px-2 py-0.5 rounded-full">
                        {meta.tag}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {meta.genre} • <span className="text-zinc-400">{meta.publisher}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-amber-400 font-bold shrink-0 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full py-6 px-4 rounded-xl border border-dashed border-zinc-800 bg-[#121214] flex flex-col items-center justify-center text-center gap-2">
            <Trophy className="w-6 h-6 text-zinc-600" />
            <p className="text-xs text-zinc-500 font-medium">No games selected yet.</p>
          </div>
        )}
      </div>

    </div>
  );
};
