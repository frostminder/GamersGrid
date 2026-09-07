import React, { useState, useEffect } from 'react';
import { 
  collection, query, onSnapshot, where, getDocs, 
  setDoc, doc, serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { MessageSquare, Search, Plus, X, User as UserIcon, Loader2 } from 'lucide-react';

interface Conversation {
  id: string;
  participants: string[];
  // Rule 2: conversations collection: participants array, lastMessage (text, senderId, timestamp), unreadCounts (map of userId -> count)
  lastMessage?: string | { text: string; senderId?: string; timestamp?: any };
  lastMessageSenderId?: string;
  lastMessageTime?: any;
  unreadCounts?: Record<string, number>;
  participantData?: Record<string, { name: string; gamertag?: string; avatar?: string; photoURL?: string }>;
}

interface ChatListScreenProps {
  onSelectConversation: (conversationId: string, partnerName: string, partnerAvatar?: string, partnerId?: string) => void;
}

export const ChatListScreen: React.FC<ChatListScreenProps> = ({ onSelectConversation }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const currentUser = auth.currentUser;

  // Rule 3: Listener scoping
  // Chat list screen: ONE listener on the user's conversations collection only — NEVER per-conversation message listeners just to show a preview.
  // Rule 5: Local caching
  // Firestore offline persistence ensures cached conversations load instantly from device storage on repeat visits without re-reading from the server.
  useEffect(() => {
    if (!currentUser) return;

    // Rule 2: conversations collection with participants array
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Conversation);
      });

      // Sort conversations by newest lastMessageTime locally
      list.sort((a, b) => {
        const timeA = a.lastMessageTime?.toMillis?.() || 
                      (typeof a.lastMessage === 'object' && a.lastMessage?.timestamp?.toMillis?.()) || 0;
        const timeB = b.lastMessageTime?.toMillis?.() || 
                      (typeof b.lastMessage === 'object' && b.lastMessage?.timestamp?.toMillis?.()) || 0;
        return timeB - timeA;
      });

      setConversations(list);
      setLoading(false);
    }, (error) => {
      console.error('Error listening to conversations:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Load registered gamers when New Chat modal opens
  useEffect(() => {
    if (!showNewChatModal || !currentUser) return;
    setSearchingUsers(true);
    
    getDocs(collection(db, 'users')).then((snapshot) => {
      const users: any[] = [];
      snapshot.forEach(docSnap => {
        if (docSnap.id !== currentUser.uid) {
          users.push({ id: docSnap.id, ...docSnap.data() });
        }
      });
      setAvailableUsers(users);
      setSearchingUsers(false);
    }).catch(err => {
      console.error('Error fetching users:', err);
      setSearchingUsers(false);
    });
  }, [showNewChatModal, currentUser]);

  const handleStartChatWithUser = async (partner: any) => {
    if (!currentUser) return;

    // Deterministic conversation ID for 1-on-1 chats to prevent duplicate threads
    const sortedIds = [currentUser.uid, partner.id].sort();
    const convId = `conv_${sortedIds[0]}_${sortedIds[1]}`;

    const currentProfileGamertag = currentUser.displayName || currentUser.email?.split('@')[0] || 'Gamer';
    const currentAvatar = currentUser.photoURL || '';

    // Rule 2: Firestore data structure
    // conversations collection: participants array, lastMessage (text, senderId, timestamp), unreadCounts (map of userId -> count)
    const convRef = doc(db, 'conversations', convId);
    await setDoc(convRef, {
      participants: [currentUser.uid, partner.id],
      unreadCounts: {
        [currentUser.uid]: 0,
        [partner.id]: 0,
      },
      participantData: {
        [currentUser.uid]: {
          name: currentProfileGamertag,
          gamertag: currentProfileGamertag,
          avatar: currentAvatar,
        },
        [partner.id]: {
          name: partner.gamertag || partner.name || 'Gamer',
          gamertag: partner.gamertag || partner.name || 'Gamer',
          avatar: partner.photoURL || '',
        },
      },
      updatedAt: serverTimestamp(),
    }, { merge: true });

    setShowNewChatModal(false);
    onSelectConversation(
      convId, 
      partner.gamertag || partner.name || 'Gamer', 
      partner.photoURL || '', 
      partner.id
    );
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    const partnerId = conv.participants.find(id => id !== currentUser?.uid) || '';
    const partnerInfo = conv.participantData?.[partnerId];
    const name = partnerInfo?.gamertag || partnerInfo?.name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full w-full bg-[#121212] select-none">
      {/* Header */}
      <div className="p-4 bg-[#181818] border-b border-[#2A2A2E] flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-gaming font-bold text-white tracking-wide flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#7A22EC]" />
            Messages
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">Direct encrypted gamer chats</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5003BD] hover:bg-[#7A22EC] text-white text-xs font-semibold transition-all shadow-md active:scale-95"
            id="btn-new-chat"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-[#2A2A2E]/60 bg-[#141414]">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter conversations..."
            className="w-full bg-[#1e1e1e] text-xs text-white pl-9 pr-4 py-2 rounded-xl border border-[#2A2A2E] focus:outline-none focus:border-[#5003BD] placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#2A2A2E]/40">
        {loading ? (
          <div className="p-8 flex flex-col items-center justify-center text-zinc-500 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#7A22EC]" />
            <span className="text-xs">Loading conversations...</span>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 text-zinc-500">
            <div className="w-12 h-12 rounded-2xl bg-[#1e1e1e] border border-[#2A2A2E] flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-400">No active conversations</p>
            <p className="text-xs text-zinc-600 max-w-[220px]">
              Tap "New Chat" above to start messaging players across Gamers Grid.
            </p>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="mt-2 px-4 py-2 rounded-xl bg-[#222226] hover:bg-[#2e2e34] text-white text-xs font-semibold border border-[#333338] transition-colors"
            >
              Start Conversation
            </button>
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const partnerId = conv.participants.find(id => id !== currentUser?.uid) || currentUser?.uid || '';
            const partnerInfo = conv.participantData?.[partnerId] || { name: 'Gamer', avatar: '' };
            const partnerName = partnerInfo.gamertag || partnerInfo.name || 'Gamer';
            
            // Rule 2: unreadCounts (map of userId -> count)
            const unreadCount = conv.unreadCounts?.[currentUser?.uid || ''] || 0;

            // Render last message text
            let lastMessageText = 'No messages yet';
            if (typeof conv.lastMessage === 'string') {
              lastMessageText = conv.lastMessage;
            } else if (typeof conv.lastMessage === 'object' && conv.lastMessage?.text) {
              lastMessageText = conv.lastMessage.text;
            }

            // Timestamp formatting
            const lastTime = conv.lastMessageTime?.toDate?.() || 
              (typeof conv.lastMessage === 'object' && conv.lastMessage?.timestamp?.toDate?.());
            const timeStr = lastTime 
              ? new Date(lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id, partnerName, partnerInfo.avatar || partnerInfo.photoURL, partnerId)}
                className="p-3.5 flex items-center gap-3.5 cursor-pointer hover:bg-[#1c1c20] transition-colors group"
                id={`conversation-item-${conv.id}`}
              >
                <div className="relative shrink-0">
                  <img
                    src={partnerInfo.avatar || partnerInfo.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80'}
                    alt={partnerName}
                    className="w-12 h-12 rounded-2xl object-cover border border-[#2A2A2E] group-hover:border-[#5003BD] transition-colors"
                  />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#5003BD] text-white text-[11px] font-bold min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-[#121212] shadow-lg animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h4 className="text-white font-semibold text-sm truncate group-hover:text-purple-300 transition-colors">
                      {partnerName}
                    </h4>
                    {timeStr && (
                      <span className="text-[11px] text-zinc-500 shrink-0 font-mono">
                        {timeStr}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs truncate ${unreadCount > 0 ? 'text-white font-medium' : 'text-zinc-400'}`}>
                    {lastMessageText}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181a] border border-[#2A2A2E] rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#2A2A2E] flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2 font-gaming">
                <UserIcon className="w-4 h-4 text-[#7A22EC]" />
                Select a Gamer to Message
              </h3>
              <button 
                onClick={() => setShowNewChatModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#252528] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#2A2A2E]/40 p-2">
              {searchingUsers ? (
                <div className="p-6 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#7A22EC]" />
                  Loading gamers...
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  No other gamers found in network.
                </div>
              ) : (
                availableUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleStartChatWithUser(user)}
                    className="p-3 flex items-center gap-3 rounded-xl hover:bg-[#222228] cursor-pointer transition-colors"
                  >
                    <img
                      src={user.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80'}
                      alt={user.gamertag || 'Gamer'}
                      className="w-10 h-10 rounded-xl object-cover border border-[#2A2A2E]"
                    />
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-semibold text-white truncate">
                        {user.gamertag || user.name || 'Gamer'}
                      </h5>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {user.bio || user.email || 'Gamers Grid Member'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
