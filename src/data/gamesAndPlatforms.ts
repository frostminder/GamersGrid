import { Monitor, Gamepad2, Tv, Smartphone } from 'lucide-react';

export interface PlatformItem {
  id: string;
  label: string;
  fullName: string;
  icon: any;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  badgeBg: string;
  description: string;
}

export const ALL_PLATFORMS: PlatformItem[] = [
  {
    id: 'pc',
    label: 'PC',
    fullName: 'Personal Computer',
    icon: Monitor,
    colorClass: 'text-cyan-400',
    borderClass: 'border-cyan-500/40 hover:border-cyan-400',
    bgClass: 'bg-cyan-500/10',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    description: 'Steam, Epic Games, Battle.net'
  },
  {
    id: 'ps',
    label: 'PlayStation',
    fullName: 'PlayStation 5 / PS4',
    icon: Gamepad2,
    colorClass: 'text-blue-400',
    borderClass: 'border-blue-500/40 hover:border-blue-400',
    bgClass: 'bg-blue-500/10',
    badgeBg: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    description: 'PSN, DualSense Controller'
  },
  {
    id: 'xbox',
    label: 'Xbox',
    fullName: 'Xbox Series X|S / One',
    icon: Tv,
    colorClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40 hover:border-emerald-400',
    bgClass: 'bg-emerald-500/10',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    description: 'Xbox Live, Game Pass'
  },
  {
    id: 'mobile',
    label: 'Mobile',
    fullName: 'iOS & Android',
    icon: Smartphone,
    colorClass: 'text-purple-400',
    borderClass: 'border-purple-500/40 hover:border-purple-400',
    bgClass: 'bg-purple-500/10',
    badgeBg: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    description: 'Touch, High Refresh Screen'
  },
];

export interface GameMetadata {
  name: string;
  genre: string;
  tag: string;
  coverImage: string;
  publisher: string;
  colorAccent: string;
}

export const GAME_DETAILS_MAP: Record<string, GameMetadata> = {
  'Call of Duty: Warzone': {
    name: 'Call of Duty: Warzone',
    genre: 'Tactical Battle Royale',
    tag: 'FPS',
    coverImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800',
    publisher: 'Activision',
    colorAccent: 'from-amber-600/30 to-zinc-950'
  },
  'EA FC 25': {
    name: 'EA FC 25',
    genre: 'Football / Sports Sim',
    tag: 'Sports',
    coverImage: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=800',
    publisher: 'EA Sports',
    colorAccent: 'from-emerald-600/30 to-zinc-950'
  },
  'Valorant': {
    name: 'Valorant',
    genre: 'Tactical 5v5 Hero Shooter',
    tag: 'Tactical FPS',
    coverImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=800',
    publisher: 'Riot Games',
    colorAccent: 'from-rose-600/30 to-zinc-950'
  },
  'Fortnite': {
    name: 'Fortnite',
    genre: 'Battle Royale & Sandbox',
    tag: 'Battle Royale',
    coverImage: 'https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&q=80&w=800',
    publisher: 'Epic Games',
    colorAccent: 'from-purple-600/30 to-zinc-950'
  },
  'Apex Legends': {
    name: 'Apex Legends',
    genre: 'Hero Battle Royale',
    tag: 'Battle Royale',
    coverImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=800',
    publisher: 'Respawn / EA',
    colorAccent: 'from-red-600/30 to-zinc-950'
  },
  'Super Smash Bros': {
    name: 'Super Smash Bros',
    genre: 'Platform Brawler',
    tag: 'Fighting',
    coverImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=800',
    publisher: 'Nintendo',
    colorAccent: 'from-orange-600/30 to-zinc-950'
  },
  'League of Legends': {
    name: 'League of Legends',
    genre: 'Multiplayer Online Battle Arena',
    tag: 'MOBA',
    coverImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&q=80&w=800',
    publisher: 'Riot Games',
    colorAccent: 'from-blue-600/30 to-zinc-950'
  },
  'CS2': {
    name: 'CS2',
    genre: 'Counter-Strike 2 Tactical FPS',
    tag: 'Tactical FPS',
    coverImage: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=800',
    publisher: 'Valve',
    colorAccent: 'from-amber-500/30 to-zinc-950'
  },
  'Rocket League': {
    name: 'Rocket League',
    genre: 'Vehicular Soccer & Acrobatics',
    tag: 'Arcade Sports',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=800',
    publisher: 'Psyonix',
    colorAccent: 'from-cyan-600/30 to-zinc-950'
  }
};

export const AVAILABLE_GAMES = [
  'Call of Duty: Warzone',
  'EA FC 25',
  'Valorant',
  'Fortnite',
  'Apex Legends',
  'Super Smash Bros',
  'League of Legends',
  'CS2',
  'Rocket League'
];

export function getPlatformMeta(platformId: string): PlatformItem {
  const found = ALL_PLATFORMS.find(p => p.id === platformId.toLowerCase());
  if (found) return found;
  return {
    id: platformId,
    label: platformId.toUpperCase(),
    fullName: platformId,
    icon: Gamepad2,
    colorClass: 'text-zinc-300',
    borderClass: 'border-zinc-700',
    bgClass: 'bg-zinc-800/40',
    badgeBg: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    description: 'Gaming Platform'
  };
}

export function getGameMeta(gameName: string): GameMetadata {
  if (GAME_DETAILS_MAP[gameName]) {
    return GAME_DETAILS_MAP[gameName];
  }
  return {
    name: gameName,
    genre: 'Video Game',
    tag: 'Gaming',
    coverImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&q=80&w=800',
    publisher: 'Multiplatform',
    colorAccent: 'from-purple-900/30 to-zinc-950'
  };
}
