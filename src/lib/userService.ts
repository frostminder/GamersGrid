import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  gamertag?: string;
  photoURL?: string;
  bannerURL?: string;
  bio?: string;
}

export interface Notification {
  id: string;
  userId: string;
  senderId: string;
  type: 'follow' | 'like' | 'comment';
  createdAt: any;
  read: boolean;
  senderProfile?: UserProfile;
}

export const searchUsers = async (searchTerm: string): Promise<UserProfile[]> => {
  if (!searchTerm) return [];
  // For basic text search without Algolia, we can fetch all and filter client side
  // or use string inequalities if we search by one field. Let's use string inequalities on gamertag.
  // Note: Firebase string inequalities are case sensitive, so it's a bit limited. 
  // Client-side filtering is easier for small prototypes.
  
  const q = query(collection(db, 'users'));
  const snapshot = await getDocs(q);
  const users: UserProfile[] = [];
  const term = searchTerm.toLowerCase();
  
  snapshot.forEach(doc => {
    const data = doc.data() as UserProfile;
    data.uid = doc.id;
    if (
      data.gamertag?.toLowerCase().includes(term) ||
      data.email?.toLowerCase().includes(term)
    ) {
      users.push(data);
    }
  });
  
  return users;
};

export const followUser = async (followerId: string, followingId: string) => {
  if (followerId === followingId) return;
  
  const followId = `${followerId}_${followingId}`;
  const followRef = doc(db, 'follows', followId);
  
  await setDoc(followRef, {
    followerId,
    followingId,
    createdAt: serverTimestamp()
  });
  
  // Create notification
  const notifRef = doc(collection(db, 'notifications'));
  await setDoc(notifRef, {
    userId: followingId,
    senderId: followerId,
    type: 'follow',
    createdAt: serverTimestamp(),
    read: false
  });
};

export const unfollowUser = async (followerId: string, followingId: string) => {
  const followId = `${followerId}_${followingId}`;
  await deleteDoc(doc(db, 'follows', followId));
};

export const getFollowStats = async (userId: string) => {
  const followingQ = query(collection(db, 'follows'), where('followerId', '==', userId));
  const followersQ = query(collection(db, 'follows'), where('followingId', '==', userId));
  
  const [followingSnap, followersSnap] = await Promise.all([
    getDocs(followingQ),
    getDocs(followersQ)
  ]);
  
  return {
    followingCount: followingSnap.size,
    followersCount: followersSnap.size
  };
};

export const getIsFollowing = async (followerId: string, followingId: string) => {
  const followId = `${followerId}_${followingId}`;
  const followSnap = await getDoc(doc(db, 'follows', followId));
  return followSnap.exists();
};

export const getFollowers = async (userId: string): Promise<UserProfile[]> => {
  const followersQ = query(collection(db, 'follows'), where('followingId', '==', userId));
  const snapshot = await getDocs(followersQ);
  const users: UserProfile[] = [];
  for (const d of snapshot.docs) {
    const data = d.data();
    const userDoc = await getDoc(doc(db, 'users', data.followerId));
    if (userDoc.exists()) {
      users.push({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
    }
  }
  return users;
};

export const getFollowing = async (userId: string): Promise<UserProfile[]> => {
  const followingQ = query(collection(db, 'follows'), where('followerId', '==', userId));
  const snapshot = await getDocs(followingQ);
  const users: UserProfile[] = [];
  for (const d of snapshot.docs) {
    const data = d.data();
    const userDoc = await getDoc(doc(db, 'users', data.followingId));
    if (userDoc.exists()) {
      users.push({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
    }
  }
  return users;
};
