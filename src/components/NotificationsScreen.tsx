import React, { useState, useEffect } from 'react';
import { Bell, Heart, UserPlus, MessageCircle, Check, CheckCheck } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, getDoc, writeBatch, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '../lib/userService';

interface NotificationItem {
  id: string;
  type: 'follow' | 'like' | 'comment';
  senderId: string;
  createdAt: any;
  read: boolean;
  senderProfile?: UserProfile;
}

// Format time with explicit 12-hour AM / PM format
const formatNotificationTime = (timestamp: any): string => {
  if (!timestamp) return 'Just now';
  let date: Date;
  if (timestamp?.toDate) {
    date = timestamp.toDate();
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (timestamp?.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    return 'Just now';
  }

  const now = new Date();
  const isToday = now.toDateString() === date.toDateString();

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();

  const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) {
    return `Today at ${timeStr}`;
  } else if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  } else {
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${dateStr} at ${timeStr}`;
  }
};

export const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'notifications'), 
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const notifs: NotificationItem[] = [];
      for (const d of snapshot.docs) {
        const data = d.data() as any;
        let senderProfile: UserProfile | undefined = undefined;
        try {
          const senderDoc = await getDoc(doc(db, 'users', data.senderId));
          if (senderDoc.exists()) {
            senderProfile = { uid: senderDoc.id, ...senderDoc.data() } as UserProfile;
          }
        } catch {}

        notifs.push({
          id: d.id,
          ...data,
          senderProfile,
        });
      }
      setNotifications(notifs);
      setLoading(false);
    }, (err) => {
      console.error('Error in notifications snapshot:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    if (unread.length === 0) return;
    try {
      const batch = writeBatch(db);
      unread.forEach(n => {
        batch.update(doc(db, 'notifications', n.id), { read: true });
      });
      await batch.commit();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch(type) {
      case 'follow': return <UserPlus className="w-4 h-4 text-[#7A22EC]" />;
      case 'like': return <Heart className="w-4 h-4 text-pink-500" />;
      case 'comment': return <MessageCircle className="w-4 h-4 text-emerald-400" />;
      default: return <Bell className="w-4 h-4 text-[#777777]" />;
    }
  };

  const getMessage = (type: string, name: string) => {
    switch(type) {
      case 'follow': return <><span className="font-bold text-white">{name}</span> started following you</>;
      case 'like': return <><span className="font-bold text-white">{name}</span> liked your clip</>;
      case 'comment': return <><span className="font-bold text-white">{name}</span> commented on your clip</>;
      default: return <><span className="font-bold text-white">{name}</span> interacted with you</>;
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-[#121212] pt-0 px-0 pb-16 animate-in fade-in">
      <div className="sticky top-0 z-10 bg-[#121212] pb-2 pt-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/40 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {loading ? (
          <div className="text-center py-10 text-[#777777]">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10 text-[#777777] flex flex-col items-center">
            <div className="w-16 h-16 bg-[#2a2a2e] rounded-full flex items-center justify-center mb-4">
              <Bell className="w-8 h-8 text-[#5003BD]" />
            </div>
            <p>You have no notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(notif => (
              <div 
                key={notif.id}
                onClick={() => !notif.read && markAsRead(notif.id)}
                className={`flex gap-3 p-3.5 rounded-xl border transition-colors cursor-pointer ${
                  notif.read ? 'bg-[#1a1a1a] border-[#2a2a2e]' : 'bg-[#232323] border-red-500/40 shadow-md shadow-red-500/5'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#2a2a2e] flex items-center justify-center shrink-0 overflow-hidden relative">
                  {notif.senderProfile?.photoURL ? (
                    <img src={notif.senderProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-white text-sm">
                      {notif.senderProfile?.gamertag?.[0] || 'U'}
                    </span>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-[#1a1a1a] rounded-full p-1 border border-[#2a2a2e]">
                    {getIcon(notif.type)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#CCCCCC] leading-snug">
                    {getMessage(notif.type, notif.senderProfile?.gamertag || 'Someone')}
                  </p>
                  <span className="text-xs text-[#a1a1aa] mt-1 block font-medium">
                    {formatNotificationTime(notif.createdAt)}
                  </span>
                </div>

                {!notif.read && (
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-2 shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.8)]"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
