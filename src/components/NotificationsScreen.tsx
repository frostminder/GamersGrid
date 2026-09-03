import React, { useState, useEffect } from 'react';
import { Bell, Heart, UserPlus, MessageCircle, Check } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../lib/userService';

interface NotificationItem {
  id: string;
  type: 'follow' | 'like' | 'comment';
  senderId: string;
  createdAt: any;
  read: boolean;
  senderProfile?: UserProfile;
}

export const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!auth.currentUser) return;
      
      const q = query(
        collection(db, 'notifications'), 
        where('userId', '==', auth.currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const notifs: NotificationItem[] = [];
      
      for (const d of snapshot.docs) {
        const data = d.data() as any;
        const senderDoc = await getDoc(doc(db, 'users', data.senderId));
        
        notifs.push({
          id: d.id,
          ...data,
          senderProfile: senderDoc.exists() ? { uid: senderDoc.id, ...senderDoc.data() } : undefined
        });
      }
      
      setNotifications(notifs);
      setLoading(false);
    };
    
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string) => {
    await updateDoc(doc(db, 'notifications', id), { read: true });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

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
    <div className="flex-1 w-full flex flex-col h-full bg-[#121212] pt-4 px-4 pb-20 animate-in fade-in">
      <div className="sticky top-0 z-10 bg-[#121212] pb-4">
        <h1 className="text-2xl font-bold text-white mb-2">Notifications</h1>
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
                className={`flex gap-3 p-4 rounded-xl border transition-colors cursor-pointer ${
                  notif.read ? 'bg-[#1a1a1a] border-[#2a2a2e]' : 'bg-[#232323] border-[#5003BD]/50 shadow-md shadow-[#5003BD]/10'
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
                
                <div className="flex-1">
                  <p className="text-sm text-[#CCCCCC]">
                    {getMessage(notif.type, notif.senderProfile?.gamertag || 'Someone')}
                  </p>
                  <span className="text-xs text-[#777777] mt-1 block">
                    {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleDateString() : 'Just now'}
                  </span>
                </div>

                {!notif.read && (
                  <div className="w-2 h-2 rounded-full bg-[#7A22EC] mt-1.5 shrink-0"></div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
