export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  isVerified?: boolean;
  isPremium?: boolean;
  level: number;
  xp: number;
  bio?: string;
  isFollowing?: boolean;
  linkedAccounts?: {
    bloodStrikeUid?: string;
    warzoneTag?: string;
    pubgId?: string;
  };
}

export interface Comment {
  id: string;
  user: User;
  text: string;
  createdAt: string;
  likes: number;
  isLiked?: boolean;
}

export interface Post {
  id: string;
  creator: User;
  title: string;
  caption: string;
  game: string;
  gameCategory: 'Blood Strike' | 'Warzone' | 'PUBG Mobile' | 'Valorant' | 'Apex Legends';
  videoUrl: string;
  thumbnailUrl: string;
  imageUrls?: string[];
  duration: string; // e.g. "1:45"
  isNew?: boolean;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  createdAt: string;
  tags: string[];
  comments?: Comment[];
}

export interface TournamentPlayer {
  userId: string;
  username: string;
  avatar: string;
  inGameName: string;
  uid: string;
  ignScreenshotUrl: string;
  isPaid: boolean;
  status: 'verified' | 'mismatch' | 'pending' | 'kicked';
  kickReason?: string;
  teamName?: string;
  seed?: number;
}

export interface TournamentMatch {
  id: string;
  round: number; // 1 = Ro16, 2 = Quarter, 3 = Semi, 4 = Finals
  matchNumber: number;
  player1?: TournamentPlayer;
  player2?: TournamentPlayer;
  winnerId?: string;
  score1?: number;
  score2?: number;
  isBye?: boolean;
  status: 'upcoming' | 'live' | 'completed';
}

export interface Tournament {
  id: string;
  title: string;
  game: string;
  bannerUrl: string;
  host: User;
  format: 'Single Elimination' | 'Double Elimination' | 'Battle Royale Leaderboard';
  teamSize: 'Solo' | 'Duo' | 'Squad';
  entryFeeCoins: number; // e.g. 100 Grid Coins ($1.00)
  hostFeeCoins: number; // 500 Grid Coins
  prizePoolCoins: number;
  maxSeats: number;
  registeredCount: number;
  status: 'Registration Open' | 'Roster Locked' | 'In Progress' | 'Completed';
  startDate: string;
  roomCode?: string;
  roomPass?: string;
  ocrVerified?: boolean;
  roster: TournamentPlayer[];
  matches?: TournamentMatch[];
}

export interface WalletState {
  gridCoins: number; // purchased currency ($1.00 = 100 coins)
  gridShards: number; // earned currency via tasks/engagement
  isPremium: boolean;
  transactions: {
    id: string;
    type: 'purchase' | 'tournament_entry' | 'tournament_prize' | 'host_fee' | 'reward';
    amount: number;
    currency: 'coins' | 'shards';
    description: string;
    timestamp: string;
  }[];
}

export interface ChatMessage {
  id: string;
  sender: User;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}

export interface ChatChannel {
  id: string;
  name: string;
  game: string;
  type: 'tournament_room' | 'direct_message' | 'squad_group';
  avatar?: string;
  unreadCount: number;
  lastMessage: string;
  lastTimestamp: string;
  messages: ChatMessage[];
}

export const CURRENT_USER: User = {
  id: 'usr_me',
  username: 'ApexViper_GG',
  displayName: 'Alex Rivers',
  avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
  isVerified: true,
  isPremium: true,
  level: 42,
  xp: 8450,
  bio: 'Blood Strike & Warzone sniper specialist. 🏆 4x Gamers Grid Weekly Champion.',
  isFollowing: false,
  linkedAccounts: {
    bloodStrikeUid: 'BS-884920194',
    warzoneTag: 'ViperSniper#4491',
    pubgId: '551984201',
  },
};

export const INITIAL_POSTS: Post[] = [];

export const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: 'tourney_1',
    title: 'Blood Strike Weekend Alpha Invitational',
    game: 'Blood Strike',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
    host: {
      id: 'usr_host1',
      username: 'GridOfficial_ESports',
      displayName: 'Gamers Grid Tournaments',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
      isVerified: true,
      isPremium: true,
      level: 99,
      xp: 99999,
    },
    format: 'Single Elimination',
    teamSize: 'Solo',
    entryFeeCoins: 100,
    hostFeeCoins: 500,
    prizePoolCoins: 1400,
    maxSeats: 16,
    registeredCount: 14,
    status: 'Registration Open',
    startDate: 'Tonight at 20:00 UTC',
    roomCode: 'BS-ROOM-9921',
    roomPass: 'GRID2026',
    ocrVerified: true,
    roster: [
      {
        userId: 'usr_1',
        username: 'ShadowReaper',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        inGameName: 'SR_Reaper99',
        uid: 'BS-991204812',
        ignScreenshotUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80',
        isPaid: true,
        status: 'verified',
        seed: 1,
      },
      {
        userId: 'usr_me',
        username: 'ApexViper_GG',
        avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
        inGameName: 'Viper_GG',
        uid: 'BS-884920194',
        ignScreenshotUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=300&auto=format&fit=crop&q=80',
        isPaid: true,
        status: 'verified',
        seed: 2,
      },
      {
        userId: 'usr_3',
        username: 'NeonPulse',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        inGameName: 'Neon_Elena',
        uid: 'BS-771920031',
        ignScreenshotUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&auto=format&fit=crop&q=80',
        isPaid: true,
        status: 'verified',
        seed: 3,
      },
      {
        userId: 'usr_7',
        username: 'CyberRonin',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        inGameName: 'Kenji_Strike',
        uid: 'BS-663819204',
        ignScreenshotUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&auto=format&fit=crop&q=80',
        isPaid: true,
        status: 'verified',
        seed: 4,
      },
      {
        userId: 'usr_fake1',
        username: 'Sneaky_Bot_99',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
        inGameName: 'DifferentName_X',
        uid: 'BS-999999999',
        ignScreenshotUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80',
        isPaid: true,
        status: 'mismatch',
        kickReason: 'OCR Mismatch: Submitted UID BS-123456789 != Room Lobby UID BS-999999999',
        seed: 5,
      },
      {
        userId: 'usr_5',
        username: 'ViperX',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        inGameName: 'Dante_X',
        uid: 'BS-551092834',
        ignScreenshotUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
        isPaid: true,
        status: 'verified',
        seed: 6,
      },
      {
        userId: 'usr_8',
        username: 'Tox1cKilla',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        inGameName: 'Tox1c_K',
        uid: 'BS-441928371',
        ignScreenshotUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
        isPaid: true,
        status: 'verified',
        seed: 7,
      },
    ],
  },
  {
    id: 'tourney_2',
    title: 'Warzone Duo Royale Cash Cup',
    game: 'Warzone Mobile',
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80',
    host: {
      id: 'usr_4',
      username: 'WarzoneTactics',
      displayName: 'GhostSquad Mobile',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
      isVerified: true,
      isPremium: true,
      level: 39,
      xp: 7200,
    },
    format: 'Battle Royale Leaderboard',
    teamSize: 'Duo',
    entryFeeCoins: 100,
    hostFeeCoins: 500,
    prizePoolCoins: 3000,
    maxSeats: 30,
    registeredCount: 26,
    status: 'Registration Open',
    startDate: 'Tomorrow at 18:00 UTC',
    roster: [],
  },
  {
    id: 'tourney_3',
    title: 'PUBG Mobile Midnight Squad Showdown',
    game: 'PUBG Mobile',
    bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80',
    host: {
      id: 'usr_6',
      username: 'ZeroGravity',
      displayName: 'Zane Valkyrie',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      isVerified: true,
      isPremium: true,
      level: 64,
      xp: 19500,
    },
    format: 'Single Elimination',
    teamSize: 'Squad',
    entryFeeCoins: 100,
    hostFeeCoins: 500,
    prizePoolCoins: 4800,
    maxSeats: 16,
    registeredCount: 16,
    status: 'Roster Locked',
    startDate: 'Saturday at 21:00 UTC',
    roster: [],
  },
];

export const INITIAL_WALLET: WalletState = {
  gridCoins: 1250,
  gridShards: 4800,
  isPremium: true,
  transactions: [
    {
      id: 'tx_1',
      type: 'purchase',
      amount: 1000,
      currency: 'coins',
      description: 'Coin Pack (1,000 Grid Coins)',
      timestamp: 'Yesterday',
    },
    {
      id: 'tx_2',
      type: 'tournament_prize',
      amount: 450,
      currency: 'coins',
      description: '2nd Place: Blood Strike Solo Sprint',
      timestamp: '3 days ago',
    },
    {
      id: 'tx_3',
      type: 'tournament_entry',
      amount: -100,
      currency: 'coins',
      description: 'Entry: Weekend Alpha Invitational',
      timestamp: '5 days ago',
    },
    {
      id: 'tx_4',
      type: 'reward',
      amount: 500,
      currency: 'shards',
      description: 'Daily Highlight Clip View Streak (7 Days)',
      timestamp: 'Today',
    },
  ],
};

export const INITIAL_CHATS: ChatChannel[] = [
  {
    id: 'ch_bs_alpha',
    name: 'Blood Strike Alpha Room #9921',
    game: 'Blood Strike',
    type: 'tournament_room',
    unreadCount: 3,
    lastMessage: 'Host: Room code BS-ROOM-9921 is now live for verified seats!',
    lastTimestamp: '3m ago',
    messages: [
      {
        id: 'm1',
        sender: {
          id: 'usr_host1',
          username: 'GridOfficial_ESports',
          displayName: 'Gamers Grid Tournaments',
          avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
          level: 99,
          xp: 99999,
        },
        text: 'Welcome players. Pre-match OCR verification is complete. 1 mismatch removed.',
        timestamp: '15m ago',
        isSystem: true,
      },
      {
        id: 'm2',
        sender: {
          id: 'usr_1',
          username: 'ShadowReaper',
          displayName: 'Marcus Ray',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          level: 58,
          xp: 14200,
        },
        text: 'Ready in lobby. Good luck everyone! 🎮',
        timestamp: '8m ago',
      },
      {
        id: 'm3',
        sender: {
          id: 'usr_host1',
          username: 'GridOfficial_ESports',
          displayName: 'Gamers Grid Tournaments',
          avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
          level: 99,
          xp: 99999,
        },
        text: 'Host: Room code BS-ROOM-9921 is now live for verified seats! Password: GRID2026',
        timestamp: '3m ago',
        isSystem: true,
      },
    ],
  },
  {
    id: 'ch_dm_shadow',
    name: 'ShadowReaper',
    game: 'Direct Message',
    type: 'direct_message',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    unreadCount: 1,
    lastMessage: 'Yo Viper, you running duo in the Warzone cash cup tomorrow?',
    lastTimestamp: '18m ago',
    messages: [
      {
        id: 'm10',
        sender: {
          id: 'usr_1',
          username: 'ShadowReaper',
          displayName: 'Marcus Ray',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          level: 58,
          xp: 14200,
        },
        text: 'Yo Viper, you running duo in the Warzone cash cup tomorrow?',
        timestamp: '18m ago',
      },
    ],
  },
  {
    id: 'ch_dm_neon',
    name: 'NeonPulse',
    game: 'Direct Message',
    type: 'direct_message',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    unreadCount: 0,
    lastMessage: 'Great game yesterday, that last rotation saved us.',
    lastTimestamp: '2h ago',
    messages: [
      {
        id: 'm20',
        sender: {
          id: 'usr_3',
          username: 'NeonPulse',
          displayName: 'Elena',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          level: 45,
          xp: 9900,
        },
        text: 'Great game yesterday, that last rotation saved us.',
        timestamp: '2h ago',
      },
    ],
  },
];
