import React, { useState } from 'react';
import { 
  Gamepad2, 
  Layers, 
  Plus, 
  Pencil, 
  Check, 
  X, 
  Sparkles, 
  Trophy, 
  Flame, 
  Tv, 
  Monitor, 
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { 
  ALL_PLATFORMS, 
  AVAILABLE_GAMES, 
  getPlatformMeta, 
  getGameMeta 
} from '../../data/gamesAndPlatforms';
import { db, auth } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface ProfileGamesSectionProps {
  platforms?: string[];
  games?: string[];
  isOwner?: boolean;
  onUpdate?: (newPlatforms: string[], newGames: string[]) => void;
}

export const ProfileGamesSection: React.FC<ProfileGamesSectionProps> = ({
  platforms = [],
  games = [],
  isOwner = false,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editPlatforms, setEditPlatforms] = useState<string[]>(platforms);
  const [editGames, setEditGames] = useState<string[]>(games);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenEdit = () => {
    setEditPlatforms(platforms);
    setEditGames(games);
    setErrorMsg(null);
    setIsEditing(true);
  };

  const togglePlatform = (id: string) => {
    setEditPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleGame = (game: string) => {
    setEditGames(prev => 
      prev.includes(game) ? prev.filter(g => g !== game) : [...prev, game]
    );
  };

  const handleSave = async () => {
    if (editPlatforms.length === 0) {
      setErrorMsg('Please select at least one gaming platform.');
      return;
    }
    if (editGames.length === 0) {
      setErrorMsg('Please select at least one main game.');
      return;
    }

    if (!auth.currentUser) return;
    setSaving(true);
    setErrorMsg(null);

    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        platforms: editPlatforms,
        games: editGames,
      }, { merge: true });

      onUpdate?.(editPlatforms, editGames);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error updating games and platforms:', err);
      setErrorMsg(err?.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 py-4 animate-in fade-in duration-200">
      
      {/* Top Header / Actions for Owner */}
      {isOwner && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#888888] uppercase tracking-wider">
              Gaming Profile & Arsenal
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#242429] hover:bg-[#303036] text-xs font-semibold text-purple-300 hover:text-white border border-purple-500/20 transition-all cursor-pointer shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Edit Games & Platforms</span>
          </button>
        </div>
      )}

      {/* 1. PLATFORMS SECTION */}
      <div className="w-full bg-[#18181b] border border-[#27272a] rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5003BD]/20 border border-[#5003BD]/40 flex items-center justify-center text-[#a855f7]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Platforms
                <span className="text-xs font-normal text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                  {platforms.length}
                </span>
              </h2>
              <p className="text-xs text-[#888888]">Hardware and systems played on</p>
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
                  className={`relative p-3.5 rounded-xl border ${meta.borderClass} ${meta.bgClass} flex flex-col items-start gap-2.5 transition-all duration-200 group hover:translate-y-[-2px] shadow-sm`}
                >
                  <div className="w-full flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center ${meta.colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </div>

                  <div className="mt-1">
                    <div className="text-sm font-bold text-white group-hover:text-purple-200 transition-colors">
                      {meta.label}
                    </div>
                    <div className="text-[11px] text-zinc-400 leading-snug truncate max-w-full">
                      {meta.fullName}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full py-8 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 flex flex-col items-center justify-center text-center gap-2">
            <Gamepad2 className="w-8 h-8 text-zinc-600" />
            <p className="text-sm text-zinc-400 font-medium">No platforms specified yet.</p>
            {isOwner && (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="mt-1 text-xs text-[#a855f7] hover:text-purple-300 font-semibold underline cursor-pointer"
              >
                Select your platforms now
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. MAIN GAMES SECTION */}
      <div className="w-full bg-[#18181b] border border-[#27272a] rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                Main Games
                <span className="text-xs font-normal text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                  {games.length}
                </span>
              </h2>
              <p className="text-xs text-[#888888]">Primary competitive & casual titles</p>
            </div>
          </div>
        </div>

        {games.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {games.map((gameName) => {
              const meta = getGameMeta(gameName);
              return (
                <div
                  key={gameName}
                  className="relative rounded-xl overflow-hidden border border-[#2a2a2e] hover:border-[#5003BD]/60 transition-all duration-300 group shadow-md flex flex-col bg-[#121212]"
                >
                  {/* Game Cover Art Header */}
                  <div className="relative h-28 w-full overflow-hidden shrink-0 bg-zinc-900">
                    <img
                      src={meta.coverImage}
                      alt={meta.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${meta.colorAccent} opacity-90`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-black/40" />
                    
                    {/* Tag badge on top right */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-zinc-200 border border-white/10 shadow">
                        {meta.tag}
                      </span>
                    </div>

                    {/* Verified game badge */}
                    <div className="absolute bottom-2 left-3 flex items-center gap-1.5 text-xs text-amber-300 font-bold bg-black/60 px-2 py-0.5 rounded backdrop-blur border border-amber-500/20">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span>Main Title</span>
                    </div>
                  </div>

                  {/* Game Details */}
                  <div className="p-3.5 flex flex-col justify-between flex-1 gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors leading-snug">
                        {meta.name}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-0.5">{meta.genre}</p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80 text-[11px] text-zinc-500">
                      <span>Publisher</span>
                      <span className="font-medium text-zinc-300">{meta.publisher}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="w-full py-8 px-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 flex flex-col items-center justify-center text-center gap-2">
            <Trophy className="w-8 h-8 text-zinc-600" />
            <p className="text-sm text-zinc-400 font-medium">No games selected yet.</p>
            {isOwner && (
              <button
                type="button"
                onClick={handleOpenEdit}
                className="mt-1 text-xs text-[#a855f7] hover:text-purple-300 font-semibold underline cursor-pointer"
              >
                Choose your main titles now
              </button>
            )}
          </div>
        )}
      </div>

      {/* EDIT MODAL FOR OWNER */}
      {isEditing && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#18181b] border border-[#2a2a2e] rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto hide-scrollbar">
            
            <div className="flex items-center justify-between border-b border-[#2a2a2e] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#5003BD] flex items-center justify-center text-white">
                  <Gamepad2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white leading-tight">Edit Games & Platforms</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">Customize what is visible on your profile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            {/* Platforms Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                <span>Select Platforms</span>
                <span className="text-[11px] font-normal text-zinc-500">{editPlatforms.length} selected</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {ALL_PLATFORMS.map((platform) => {
                  const isSelected = editPlatforms.includes(platform.id);
                  const Icon = platform.icon;
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => togglePlatform(platform.id)}
                      className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'border-[#5003BD] bg-[#5003BD]/20 text-white shadow-md'
                          : 'border-[#2a2a2e] bg-[#121212] text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#5003BD] text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold truncate">{platform.label}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{platform.fullName}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-purple-300 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Games Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                <span>Select Main Games</span>
                <span className="text-[11px] font-normal text-zinc-500">{editGames.length} selected</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_GAMES.map((game) => {
                  const isSelected = editGames.includes(game);
                  return (
                    <button
                      key={game}
                      type="button"
                      onClick={() => toggleGame(game)}
                      className={`px-3.5 py-2 rounded-full border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'border-[#5003BD] bg-[#5003BD] text-white shadow-sm font-semibold'
                          : 'border-[#2a2a2e] bg-[#121212] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{game}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2a2a2e]">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-xs font-bold text-white bg-[#5003BD] hover:bg-[#6207e3] rounded-xl transition-all shadow-lg shadow-[#5003BD]/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Save Changes</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
