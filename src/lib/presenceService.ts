import { db, auth } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { UserProfile } from './userService';

export type PresenceStatus = 'online' | 'background' | 'offline';

export interface PresenceData {
  userId: string;
  status: PresenceStatus;
  lastSeen: number;
  updatedAt?: any;
}

export interface MutualGamer {
  uid: string;
  name: string;
  gamertag: string;
  photoURL?: string;
  country?: string;
  status: PresenceStatus;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
}

/**
 * Initialize current user presence tracking
 */
export const startPresenceTracking = (userId: string) => {
  if (!userId) return () => {};

  const userPresenceRef = doc(db, 'presence', userId);

  const updatePresence = async (status: PresenceStatus) => {
    try {
      await setDoc(userPresenceRef, {
        userId,
        status,
        lastSeen: Date.now(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch {
      // Non-blocking
    }
  };

  // Determine current initial status
  const initialStatus: PresenceStatus = (document.visibilityState === 'visible' && document.hasFocus()) 
    ? 'online' 
    : 'background';
  updatePresence(initialStatus);

  // Focus and visibility listeners
  const handleFocus = () => updatePresence('online');
  const handleBlur = () => updatePresence('background');
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      updatePresence('online');
    } else {
      updatePresence('background');
    }
  };

  const handleUnload = () => {
    updatePresence('offline');
  };

  window.addEventListener('focus', handleFocus);
  window.addEventListener('blur', handleBlur);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('beforeunload', handleUnload);
  window.addEventListener('pagehide', handleUnload);

  // Heartbeat every 20 seconds
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      updatePresence('online');
    } else if (document.visibilityState === 'hidden') {
      updatePresence('background');
    }
  }, 20000);

  return () => {
    window.removeEventListener('focus', handleFocus);
    window.removeEventListener('blur', handleBlur);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('beforeunload', handleUnload);
    window.removeEventListener('pagehide', handleUnload);
    clearInterval(interval);
    updatePresence('offline');
  };
};

/**
 * Helper to compute presence status from presence record
 */
export const calculatePresenceStatus = (p?: PresenceData | null): PresenceStatus => {
  if (!p) return 'offline';
  const now = Date.now();
  if (p.status === 'online' && now - p.lastSeen < 60000) {
    return 'online';
  } else if (p.status === 'background' && now - p.lastSeen < 120000) {
    return 'background';
  }
  return 'offline';
};

/**
 * Fetch ONLY real mutual followers from Firestore (users you follow and who follow you back)
 */
export const getMutualFollowers = async (currentUserId: string): Promise<MutualGamer[]> => {
  if (!currentUserId) return [];

  try {
    // 1. Who current user follows
    const followingQ = query(collection(db, 'follows'), where('followerId', '==', currentUserId));
    // 2. Who follows current user
    const followersQ = query(collection(db, 'follows'), where('followingId', '==', currentUserId));

    const [followingSnap, followersSnap] = await Promise.all([
      getDocs(followingQ),
      getDocs(followersQ),
    ]);

    const followingIds = new Set<string>();
    followingSnap.docs.forEach(d => {
      const data = d.data();
      if (data.followingId) followingIds.add(data.followingId);
    });

    const mutualIds: string[] = [];
    followersSnap.docs.forEach(d => {
      const data = d.data();
      if (data.followerId && followingIds.has(data.followerId)) {
        mutualIds.push(data.followerId);
      }
    });

    if (mutualIds.length === 0) {
      return [];
    }

    // Fetch user profiles & presence for real mutual followers
    const mutualUsers: MutualGamer[] = [];
    for (const id of mutualIds) {
      const userDoc = await getDoc(doc(db, 'users', id));
      if (userDoc.exists()) {
        const u = userDoc.data() as UserProfile;
        
        // Fetch real presence
        let status: PresenceStatus = 'offline';
        try {
          const presenceDoc = await getDoc(doc(db, 'presence', id));
          if (presenceDoc.exists()) {
            const p = presenceDoc.data() as PresenceData;
            status = calculatePresenceStatus(p);
          }
        } catch {
          // fallback offline
        }

        mutualUsers.push({
          uid: id,
          name: u.name || 'Gamer',
          gamertag: u.gamertag || 'player',
          photoURL: u.photoURL,
          country: u.country,
          status,
          unreadCount: 0,
        });
      }
    }

    return mutualUsers;
  } catch (err) {
    console.error('Error fetching mutual followers:', err);
    return [];
  }
};

/**
 * Realtime subscription to a user's presence
 */
export const subscribeToPresence = (userId: string, callback: (status: PresenceStatus) => void) => {
  return onSnapshot(doc(db, 'presence', userId), (docSnap) => {
    if (!docSnap.exists()) {
      callback('offline');
      return;
    }
    const data = docSnap.data() as PresenceData;
    callback(calculatePresenceStatus(data));
  }, () => {
    callback('offline');
  });
};
