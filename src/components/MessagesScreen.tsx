import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MessageSquare, Users, Globe, Search, Plus, Send, X, 
  Check, ArrowLeft, UserCheck, ChevronRight, Hash, 
  UserPlus, Reply, Trash2, Ban
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc,
  getDoc,
  getDocs,
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  getMutualFollowers, 
  MutualGamer, 
  PresenceStatus, 
  subscribeToPresence,
  calculatePresenceStatus,
  PresenceData
} from '../lib/presenceService';
import { searchUsers, UserProfile } from '../lib/userService';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  createdAt: any;
  isMe: boolean;
  read?: boolean;
  readAt?: any;
  delivered?: boolean;
  isDeleted?: boolean;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  } | null;
}

interface FirestoreChat {
  id: string;
  participants: string[];
  participantData?: Record<string, {
    name: string;
    gamertag: string;
    photoURL?: string;
  }>;
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageSenderName?: string;
  lastMessageTime?: any;
  updatedAt?: any;
  typing?: Record<string, number>;
}

interface FirestoreGroup {
  id: string;
  name: string;
  game: string;
  avatar?: string;
  createdBy: string;
  createdByName?: string;
  members: string[];
  lastMessage?: string;
  lastMessageSender?: string;
  lastMessageTime?: any;
  createdAt?: any;
}

interface FirestoreCommunity {
  id: string;
  name: string;
  description: string;
  icon: string;
  game?: string;
  createdBy: string;
  lastMessage?: string;
  lastMessageTime?: any;
  createdAt?: any;
}

export interface MessagesScreenProps {
  onChatActiveChange?: (active: boolean) => void;
}

// Swipeable message row supporting swipe-right to reply, desktop hover actions, and deleted message states
interface SwipeableMessageRowProps {
  msg: ChatMessage;
  onReply: (msg: ChatMessage) => void;
  onDeletePrompt: (msg: ChatMessage) => void;
  renderTicks: (msg: ChatMessage) => React.ReactNode;
  formatTime: (time: any) => string;
}

const SwipeableMessageRow: React.FC<SwipeableMessageRowProps> = ({
  msg,
  onReply,
  onDeletePrompt,
  renderTicks,
  formatTime,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const hasVibrated = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (msg.isDeleted) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    hasVibrated.current = false;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (msg.isDeleted || !isSwiping) return;
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - touchStartX.current;
    const diffY = currentY - touchStartY.current;

    // Detect horizontal swipe intention
    if (isHorizontalSwipe.current === null) {
      if (Math.abs(diffX) > 6 || Math.abs(diffY) > 6) {
        isHorizontalSwipe.current = diffX > 0 && Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (isHorizontalSwipe.current) {
      if (diffX > 0) {
        // Damped right swipe up to 65px
        const clamped = Math.min(diffX * 0.55, 65);
        setOffsetX(clamped);

        if (clamped >= 38 && !hasVibrated.current) {
          hasVibrated.current = true;
          try {
            navigator.vibrate?.(12);
          } catch {
            // Ignore vibration error
          }
        }
      } else {
        setOffsetX(0);
      }
    }
  };

  const handleTouchEnd = () => {
    if (offsetX >= 38 && !msg.isDeleted) {
      onReply(msg);
    }
    setOffsetX(0);
    setIsSwiping(false);
    isHorizontalSwipe.current = null;
    hasVibrated.current = false;
  };

  return (
    <div 
      className={`relative w-full flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} group select-none`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Swipe Reply indicator icon on the left (pops up when swiping right) */}
      <div 
        className="absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none transition-transform z-10 flex items-center justify-center"
        style={{
          opacity: Math.min(offsetX / 32, 1),
          transform: `translateY(-50%) scale(${Math.min(0.6 + (offsetX / 75), 1)})`,
        }}
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
          offsetX >= 38 ? 'bg-[#5003BD] text-white shadow-lg shadow-[#5003BD]/50' : 'bg-zinc-800 text-zinc-300'
        }`}>
          <Reply className="w-3.5 h-3.5" />
        </div>
      </div>

      {!msg.isMe && (
        <span className="text-[11px] text-[#71717a] font-medium ml-1 mb-1">
          {msg.senderName}
        </span>
      )}

      <div className="relative flex items-center gap-1.5 max-w-[85%] sm:max-w-[70%]">
        {/* Quick action buttons on hover / touch */}
        {!msg.isDeleted && (
          <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 ${msg.isMe ? 'order-first' : 'order-last'}`}>
            <button
              type="button"
              onClick={() => onReply(msg)}
              className="p-1.5 rounded-lg bg-[#27272a]/90 hover:bg-[#3f3f46] text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
            {msg.isMe && (
              <button
                type="button"
                onClick={() => onDeletePrompt(msg)}
                className="p-1.5 rounded-lg bg-[#27272a]/90 hover:bg-red-950/60 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Delete for everyone"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Message Bubble with dynamic translation */}
        <div 
          style={{
            transform: `translateX(${offsetX}px)`,
            transition: isSwiping ? 'none' : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)',
          }}
          className={`relative px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
            msg.isDeleted
              ? 'bg-[#1a1a20]/80 border border-zinc-800/80 text-zinc-400 rounded-bl-xs'
              : msg.isMe 
                ? 'bg-[#5003BD] text-white rounded-br-xs shadow-md shadow-[#5003BD]/20' 
                : 'bg-[#27272a] text-[#f4f4f5] rounded-bl-xs border border-[#3f3f46]/50'
          }`}
        >
          {/* Quoted reply preview (WhatsApp-style card with vertical accent bar) */}
          {!msg.isDeleted && msg.replyTo && (
            <div className="mb-2 p-2 rounded-lg bg-black/25 border-l-3 border-[#a855f7] text-left">
              <div className="text-[11px] font-bold text-[#a855f7] truncate">
                {msg.replyTo.senderName}
              </div>
              <div className="text-[11px] text-zinc-300 truncate opacity-90">
                {msg.replyTo.text}
              </div>
            </div>
          )}

          {/* Message Text or Deleted Notice */}
          {msg.isDeleted ? (
            <div className="flex items-center gap-1.5 italic text-zinc-400 text-xs py-0.5">
              <Ban className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
              <span>{msg.isMe ? 'You deleted this message' : 'This message was deleted'}</span>
            </div>
          ) : (
            <p className="break-words">{msg.text}</p>
          )}

          {/* Time & authentic WhatsApp ticks */}
          <div className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${
            msg.isMe && !msg.isDeleted ? 'text-purple-200' : 'text-[#71717a]'
          }`}>
            <span>{formatTime(msg.createdAt)}</span>
            {renderTicks(msg)}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MessagesScreen: React.FC<MessagesScreenProps> = ({ onChatActiveChange }) => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'groups' | 'community'>('inbox');
  const [mutuals, setMutuals] = useState<MutualGamer[]>([]);
  const [presences, setPresences] = useState<Record<string, PresenceStatus>>({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real Firestore Data
  const [chats, setChats] = useState<FirestoreChat[]>([]);
  const [groups, setGroups] = useState<FirestoreGroup[]>([]);
  const [communities, setCommunities] = useState<FirestoreCommunity[]>([]);
  
  // Active Chat State
  const [activeChatGamer, setActiveChatGamer] = useState<MutualGamer | UserProfile | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<FirestoreGroup | null>(null);
  const [activeCommunity, setActiveCommunity] = useState<FirestoreCommunity | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const lastTypingPing = useRef<number>(0);
  
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Swipe to reply and Message delete state
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notify parent of active chat status so header/bottom-nav can hide
  useEffect(() => {
    const isChatActive = !!(activeChatGamer || activeGroup || activeCommunity);
    onChatActiveChange?.(isChatActive);
    return () => {
      onChatActiveChange?.(false);
    };
  }, [activeChatGamer, activeGroup, activeCommunity, onChatActiveChange]);

  // Search & New Chat Modal
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<UserProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Create Group & Create Community Modals
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupGame, setNewGroupGame] = useState('Call of Duty: Warzone');

  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDesc, setNewCommunityDesc] = useState('');
  const [newCommunityIcon, setNewCommunityIcon] = useState('🎮');

  const currentUser = auth.currentUser;

  // 1. Fetch Real Mutual Followers
  useEffect(() => {
    if (!currentUser) return;
    const loadMutuals = async () => {
      const list = await getMutualFollowers(currentUser.uid);
      setMutuals(list);

      // Subscribe to each mutual friend's presence in real time
      const unsubscribers = list.map(m => {
        return subscribeToPresence(m.uid, (status) => {
          setPresences(prev => ({ ...prev, [m.uid]: status }));
        });
      });

      return () => {
        unsubscribers.forEach(unsub => unsub());
      };
    };

    loadMutuals();
  }, [currentUser?.uid]);

  // 2. Subscribe to Real Direct Chats
  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'chats'), 
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: FirestoreChat[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as FirestoreChat);
      });
      // Sort by latest message / updated time
      list.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() || a.updatedAt || 0;
        const timeB = b.updatedAt?.toMillis?.() || b.updatedAt || 0;
        return timeB - timeA;
      });
      setChats(list);
    }, (error) => {
      console.error('Error listening to chats:', error);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 3. Subscribe to Real Groups
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'groups'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: FirestoreGroup[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as FirestoreGroup);
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
        return timeB - timeA;
      });
      setGroups(list);
    }, (error) => {
      console.error('Error listening to groups:', error);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 4. Subscribe to Real Communities
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, 'communities'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: FirestoreCommunity[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as FirestoreCommunity);
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
        return timeB - timeA;
      });
      setCommunities(list);
    }, (error) => {
      console.error('Error listening to communities:', error);
    });

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // 5. Subscribe to Active Chat Messages & Real-Time Read Receipts
  useEffect(() => {
    let messagesUnsub = () => {};
    let chatDocUnsub = () => {};

    if (activeChatId) {
      // 1-on-1 direct chat
      const messagesRef = collection(db, 'chats', activeChatId, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
      messagesUnsub = onSnapshot(q, (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const isFromPartner = data.senderId !== currentUser?.uid;
          
          // Mark incoming message as read when in active chat
          if (isFromPartner && !data.read) {
            updateDoc(doc(db, 'chats', activeChatId, 'messages', docSnap.id), {
              read: true,
              delivered: true,
              readAt: serverTimestamp(),
            }).catch((err) => console.error('Error marking read:', err));
          }

          msgs.push({
            id: docSnap.id,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            text: data.text,
            createdAt: data.createdAt,
            isMe: data.senderId === currentUser?.uid,
            read: data.read ?? false,
            readAt: data.readAt,
            delivered: data.delivered ?? false,
            isDeleted: data.isDeleted ?? false,
            replyTo: data.replyTo ?? null,
          });
        });
        setCurrentMessages(msgs);
      });

      // Typing status listener for direct chat
      chatDocUnsub = onSnapshot(doc(db, 'chats', activeChatId), (snap) => {
        if (snap.exists() && activeChatGamer) {
          const data = snap.data();
          const typingMap = data.typing || {};
          const partnerTimestamp = typingMap[activeChatGamer.uid];
          if (partnerTimestamp && Date.now() - partnerTimestamp < 4000) {
            setPartnerTyping(true);
          } else {
            setPartnerTyping(false);
          }
        } else {
          setPartnerTyping(false);
        }
      });
    } else if (activeGroup) {
      // Group chat
      const messagesRef = collection(db, 'groups', activeGroup.id, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
      messagesUnsub = onSnapshot(q, (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          msgs.push({
            id: docSnap.id,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            text: data.text,
            createdAt: data.createdAt,
            isMe: data.senderId === currentUser?.uid,
            read: data.read ?? false,
            readAt: data.readAt,
            delivered: data.delivered ?? false,
            isDeleted: data.isDeleted ?? false,
            replyTo: data.replyTo ?? null,
          });
        });
        setCurrentMessages(msgs);
      });
      setPartnerTyping(false);
    } else if (activeCommunity) {
      // Community channel
      const messagesRef = collection(db, 'communities', activeCommunity.id, 'messages');
      const q = query(messagesRef, orderBy('createdAt', 'asc'));
      messagesUnsub = onSnapshot(q, (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          msgs.push({
            id: docSnap.id,
            senderId: data.senderId,
            senderName: data.senderName,
            senderAvatar: data.senderAvatar,
            text: data.text,
            createdAt: data.createdAt,
            isMe: data.senderId === currentUser?.uid,
            read: data.read ?? false,
            readAt: data.readAt,
            delivered: data.delivered ?? false,
            isDeleted: data.isDeleted ?? false,
            replyTo: data.replyTo ?? null,
          });
        });
        setCurrentMessages(msgs);
      });
      setPartnerTyping(false);
    } else {
      setCurrentMessages([]);
      setPartnerTyping(false);
    }

    return () => {
      messagesUnsub();
      chatDocUnsub();
    };
  }, [activeChatId, activeGroup?.id, activeCommunity?.id, currentUser?.uid, activeChatGamer?.uid]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages]);

  // Helper for presence colors (NO status text under user, purely the color indicator)
  const getStatusColor = (userId: string, defaultStatus?: PresenceStatus) => {
    const status = presences[userId] || defaultStatus || 'offline';
    switch (status) {
      case 'online':
        return {
          bg: 'bg-green-500',
          glow: 'shadow-[0_0_8px_rgba(34,197,94,0.8)]',
          label: 'Online',
        };
      case 'background':
        return {
          bg: 'bg-amber-400',
          glow: 'shadow-[0_0_8px_rgba(251,191,36,0.8)]',
          label: 'In Background',
        };
      case 'offline':
      default:
        return {
          bg: 'bg-red-500',
          glow: 'shadow-[0_0_8px_rgba(239,68,68,0.8)]',
          label: 'Offline',
        };
    }
  };

  // Helper to open or create 1-on-1 direct chat
  const handleOpenDirectChat = async (targetUser: MutualGamer | UserProfile) => {
    if (!currentUser) return;
    const targetUid = targetUser.uid;
    const chatId = [currentUser.uid, targetUid].sort().join('_');

    // Ensure chat doc exists in Firestore
    const chatDocRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatDocRef);
    if (!chatSnap.exists()) {
      await setDoc(chatDocRef, {
        participants: [currentUser.uid, targetUid],
        participantData: {
          [currentUser.uid]: {
            name: currentUser.displayName || 'Gamer',
            gamertag: currentUser.displayName || 'Gamer',
            photoURL: currentUser.photoURL || '',
          },
          [targetUid]: {
            name: targetUser.name || 'Gamer',
            gamertag: targetUser.gamertag || 'player',
            photoURL: targetUser.photoURL || '',
          }
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    setActiveChatGamer(targetUser);
    setActiveChatId(chatId);
    setActiveGroup(null);
    setActiveCommunity(null);
    setShowNewChatModal(false);
  };

  // Handle Typing status update
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setMessageInput(text);

    if (activeChatId && currentUser) {
      const now = Date.now();
      if (now - lastTypingPing.current > 2000) {
        lastTypingPing.current = now;
        setDoc(doc(db, 'chats', activeChatId), {
          typing: {
            [currentUser.uid]: now,
          }
        }, { merge: true }).catch(() => {});
      }
    }
  };

  // Close active chat and return to hub
  const handleBackToHub = () => {
    if (activeChatId && currentUser) {
      setDoc(doc(db, 'chats', activeChatId), {
        typing: {
          [currentUser.uid]: 0,
        }
      }, { merge: true }).catch(() => {});
    }
    setActiveChatGamer(null);
    setActiveChatId(null);
    setActiveGroup(null);
    setActiveCommunity(null);
    setPartnerTyping(false);
    onChatActiveChange?.(false);
  };

  // Render authentic WhatsApp-style message ticks:
  // 1 tick: sent (recipient is offline)
  // 2 ticks: recipient is online or in standby (delivered)
  // Blue ticks: message read
  const renderMessageTicks = (msg: ChatMessage) => {
    if (!msg.isMe || msg.isDeleted) return null;

    // 1. Blue double check: Message has been read
    if (msg.read) {
      return (
        <span className="inline-flex items-center -space-x-1.5 text-[#53bdeb]" title="Read">
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
        </span>
      );
    }

    // 2. Double check (grey): Recipient is online or in standby (background), or message marked delivered
    const partnerStatus = activeChatGamer ? (presences[activeChatGamer.uid] || 'offline') : 'offline';
    const isOnlineOrStandby = msg.delivered || partnerStatus === 'online' || partnerStatus === 'background';

    if (isOnlineOrStandby) {
      return (
        <span className="inline-flex items-center -space-x-1.5 text-zinc-400" title="Delivered">
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
        </span>
      );
    }

    // 3. Single check (grey): Sent, but recipient is offline (app closed / not running)
    return (
      <Check 
        className="w-3.5 h-3.5 text-zinc-400 shrink-0 inline-block" 
        strokeWidth={2.5} 
        title="Sent"
      />
    );
  };

  // Delete message for everyone
  const handleDeleteMessage = async () => {
    if (!messageToDelete || !currentUser || isDeleting) return;
    setIsDeleting(true);

    try {
      const targetId = messageToDelete.id;
      if (activeChatId) {
        await updateDoc(doc(db, 'chats', activeChatId, 'messages', targetId), {
          isDeleted: true,
          text: 'This message was deleted',
          deletedAt: serverTimestamp(),
          replyTo: null,
        });

        // Update chat doc's lastMessage preview if this was the last message
        const currentChat = chats.find(c => c.id === activeChatId);
        if (currentChat?.lastMessage === messageToDelete.text) {
          await setDoc(doc(db, 'chats', activeChatId), {
            lastMessage: 'This message was deleted',
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      } else if (activeGroup) {
        await updateDoc(doc(db, 'groups', activeGroup.id, 'messages', targetId), {
          isDeleted: true,
          text: 'This message was deleted',
          deletedAt: serverTimestamp(),
          replyTo: null,
        });
      } else if (activeCommunity) {
        await updateDoc(doc(db, 'communities', activeCommunity.id, 'messages', targetId), {
          isDeleted: true,
          text: 'This message was deleted',
          deletedAt: serverTimestamp(),
          replyTo: null,
        });
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    } finally {
      setIsDeleting(false);
      setMessageToDelete(null);
    }
  };

  // Send Message in active conversation
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isSending || !currentUser) return;

    const text = messageInput.trim();
    const replyPayload = replyingTo ? {
      id: replyingTo.id,
      text: replyingTo.text,
      senderName: replyingTo.isMe ? 'You' : replyingTo.senderName,
    } : null;

    setMessageInput('');
    setReplyingTo(null);
    setIsSending(true);

    try {
      if (activeChatId) {
        // Direct Chat: check partner presence for initial delivery status
        const partnerStatus = activeChatGamer ? (presences[activeChatGamer.uid] || 'offline') : 'offline';
        const isDelivered = partnerStatus === 'online' || partnerStatus === 'background';

        await addDoc(collection(db, 'chats', activeChatId, 'messages'), {
          senderId: currentUser.uid,
          senderName: currentUser.displayName || 'Gamer',
          senderAvatar: currentUser.photoURL || '',
          text,
          createdAt: serverTimestamp(),
          read: false,
          delivered: isDelivered,
          isDeleted: false,
          replyTo: replyPayload,
        });

        await setDoc(doc(db, 'chats', activeChatId), {
          lastMessage: text,
          lastMessageSenderId: currentUser.uid,
          lastMessageSenderName: currentUser.displayName || 'Gamer',
          updatedAt: serverTimestamp(),
          typing: {
            [currentUser.uid]: 0,
          }
        }, { merge: true });
      } else if (activeGroup) {
        // Group Chat
        await addDoc(collection(db, 'groups', activeGroup.id, 'messages'), {
          senderId: currentUser.uid,
          senderName: currentUser.displayName || 'Gamer',
          senderAvatar: currentUser.photoURL || '',
          text,
          createdAt: serverTimestamp(),
          read: false,
          delivered: true,
          isDeleted: false,
          replyTo: replyPayload,
        });

        await setDoc(doc(db, 'groups', activeGroup.id), {
          lastMessage: text,
          lastMessageSender: currentUser.displayName || 'Gamer',
          lastMessageTime: serverTimestamp(),
        }, { merge: true });
      } else if (activeCommunity) {
        // Community Channel
        await addDoc(collection(db, 'communities', activeCommunity.id, 'messages'), {
          senderId: currentUser.uid,
          senderName: currentUser.displayName || 'Gamer',
          senderAvatar: currentUser.photoURL || '',
          text,
          createdAt: serverTimestamp(),
          read: false,
          delivered: true,
          isDeleted: false,
          replyTo: replyPayload,
        });

        await setDoc(doc(db, 'communities', activeCommunity.id), {
          lastMessage: text,
          lastMessageTime: serverTimestamp(),
        }, { merge: true });
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Create Squad Group in Firestore
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !currentUser) return;

    try {
      const docRef = await addDoc(collection(db, 'groups'), {
        name: newGroupName.trim(),
        game: newGroupGame,
        avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80',
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || 'Gamer',
        members: [currentUser.uid],
        lastMessage: 'Squad group chat created.',
        lastMessageSender: currentUser.displayName || 'Gamer',
        createdAt: serverTimestamp(),
      });

      setShowCreateGroupModal(false);
      setNewGroupName('');
      setActiveGroup({
        id: docRef.id,
        name: newGroupName.trim(),
        game: newGroupGame,
        avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80',
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || 'Gamer',
        members: [currentUser.uid],
        lastMessage: 'Squad group chat created.',
        lastMessageSender: currentUser.displayName || 'Gamer',
      });
      setActiveChatGamer(null);
      setActiveChatId(null);
      setActiveCommunity(null);
    } catch (err) {
      console.error('Error creating group:', err);
    }
  };

  // Create Community Channel in Firestore
  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommunityName.trim() || !currentUser) return;

    try {
      const cleanName = newCommunityName.trim().toLowerCase().replace(/\s+/g, '-');
      const docRef = await addDoc(collection(db, 'communities'), {
        name: cleanName,
        description: newCommunityDesc.trim() || 'Community hub for gamers',
        icon: newCommunityIcon || '🎮',
        createdBy: currentUser.uid,
        lastMessage: 'Channel initialized. Welcome to the hub!',
        createdAt: serverTimestamp(),
      });

      setShowCreateCommunityModal(false);
      setNewCommunityName('');
      setNewCommunityDesc('');
      setActiveCommunity({
        id: docRef.id,
        name: cleanName,
        description: newCommunityDesc.trim() || 'Community hub for gamers',
        icon: newCommunityIcon || '🎮',
        createdBy: currentUser.uid,
      });
      setActiveChatGamer(null);
      setActiveChatId(null);
      setActiveGroup(null);
    } catch (err) {
      console.error('Error creating community:', err);
    }
  };

  // User Search handler
  const handleSearchUsers = async (term: string) => {
    if (!term.trim()) {
      setUserSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const results = await searchUsers(term);
      setUserSearchResults(results.filter(u => u.uid !== currentUser?.uid));
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  // Helpers for displaying chat partner in inbox
  const getChatPartner = (chat: FirestoreChat) => {
    if (!currentUser || !chat.participants) return null;
    const partnerId = chat.participants.find(p => p !== currentUser.uid);
    if (!partnerId) return null;
    const partnerData = chat.participantData?.[partnerId];
    return {
      uid: partnerId,
      name: partnerData?.name || 'Gamer',
      gamertag: partnerData?.gamertag || 'player',
      photoURL: partnerData?.photoURL || '',
    };
  };

  // Format timestamp helper
  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    if (timestamp.toDate) {
      const d = timestamp.toDate();
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return 'Just now';
  };

  // ========================================================
  // ACTIVE CHAT VIEW (1-ON-1, GROUP, OR COMMUNITY)
  // ========================================================
  if (activeChatGamer || activeGroup || activeCommunity) {
    const isDirect = !!activeChatGamer;
    const title = activeChatGamer 
      ? (activeChatGamer.name || activeChatGamer.gamertag) 
      : activeGroup 
        ? activeGroup.name 
        : `#${activeCommunity?.name}`;
    
    const subtitle = activeChatGamer 
      ? `@${activeChatGamer.gamertag}`
      : activeGroup 
        ? `${activeGroup.game} • Squad Chat`
        : activeCommunity?.description || 'Community Channel';

    const statusConfig = activeChatGamer ? getStatusColor(activeChatGamer.uid) : null;

    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-[#121212] w-screen h-[100dvh] overflow-hidden animate-in fade-in duration-150">
        {/* Chat Header (Edge to edge, full width) */}
        <div className="px-4 py-3 bg-[#18181b] border-b border-[#2a2a2e] flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBackToHub}
              className="p-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-white transition-colors cursor-pointer"
              title="Back to messages"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Avatar with presence */}
            <div className="relative">
              {activeChatGamer ? (
                <div className="w-10 h-10 rounded-full bg-[#27272a] border border-[#3f3f46] overflow-hidden">
                  {activeChatGamer.photoURL ? (
                    <img src={activeChatGamer.photoURL} alt={title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-white bg-[#5003BD]/40 text-sm">
                      {(activeChatGamer.gamertag?.[0] || 'G').toUpperCase()}
                    </div>
                  )}
                </div>
              ) : activeGroup ? (
                <div className="w-10 h-10 rounded-xl bg-[#27272a] border border-[#3f3f46] overflow-hidden">
                  <img src={activeGroup.avatar} alt={activeGroup.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#5003BD]/20 border border-[#5003BD]/40 flex items-center justify-center text-xl">
                  {activeCommunity?.icon || '🎮'}
                </div>
              )}

              {/* Status dot on avatar bottom right if direct chat */}
              {activeChatGamer && statusConfig && (
                <span 
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#18181b] ${statusConfig.bg} ${statusConfig.glow}`}
                  title={statusConfig.label}
                />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base leading-none">{title}</h3>
                {/* Status dot beside name as requested */}
                {activeChatGamer && statusConfig && (
                  <span 
                    className={`w-2 h-2 rounded-full ${statusConfig.bg} ${statusConfig.glow} inline-block shrink-0`}
                    title={statusConfig.label}
                  />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-[#71717a]">
                <span className="truncate max-w-[200px] sm:max-w-xs">{subtitle}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 hide-scrollbar bg-[#121212]">
          {currentMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#71717a]">
              <MessageSquare className="w-10 h-10 text-[#5003BD] mb-2 opacity-80" />
              <p className="text-white font-bold text-sm">No messages yet</p>
              <p className="text-xs max-w-xs mt-1">Send a message to start this conversation live!</p>
            </div>
          ) : (
            currentMessages.map((msg) => (
              <SwipeableMessageRow
                key={msg.id}
                msg={msg}
                onReply={(targetMsg) => {
                  setReplyingTo(targetMsg);
                }}
                onDeletePrompt={(targetMsg) => {
                  setMessageToDelete(targetMsg);
                }}
                renderTicks={renderMessageTicks}
                formatTime={formatTime}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Real-Time Typing Indicator */}
        {partnerTyping && activeChatGamer && (
          <div className="px-4 py-1.5 bg-[#18181b]/80 border-t border-[#2a2a2e]/60 flex items-center gap-2 text-xs text-purple-300 animate-in fade-in shrink-0">
            <span className="font-semibold text-zinc-300">
              @{activeChatGamer.gamertag} is typing
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-bounce" />
            </span>
          </div>
        )}

        {/* WhatsApp-Style Replying Preview Bar */}
        {replyingTo && (
          <div className="px-4 py-2.5 bg-[#18181b] border-t border-[#2a2a2e] flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 shrink-0">
            <div className="flex items-start gap-2.5 min-w-0 border-l-3 border-[#a855f7] pl-2.5 py-0.5">
              <Reply className="w-3.5 h-3.5 text-[#a855f7] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#a855f7] leading-tight">
                  Replying to {replyingTo.isMe ? 'yourself' : replyingTo.senderName}
                </p>
                <p className="text-xs text-zinc-300 truncate mt-0.5 opacity-90 max-w-[280px] sm:max-w-md">
                  {replyingTo.text}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Cancel reply"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Message Input Box (Bottom edge-to-edge, full screen) */}
        <form onSubmit={handleSendMessage} className="p-3 bg-[#18181b] border-t border-[#2a2a2e] flex items-center gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <input
            type="text"
            value={messageInput}
            onChange={handleMessageInputChange}
            placeholder={
              replyingTo
                ? `Reply to ${replyingTo.isMe ? 'yourself' : replyingTo.senderName}...`
                : activeChatGamer 
                  ? `Message @${activeChatGamer.gamertag}...` 
                  : "Type a message..."
            }
            className="flex-1 bg-[#121212] text-white text-sm px-4 py-3 rounded-xl border border-[#2a2a2e] focus:outline-none focus:border-[#5003BD] placeholder:text-[#71717a]"
          />
          <button
            type="submit"
            disabled={!messageInput.trim() || isSending}
            className="p-3 bg-[#5003BD] hover:bg-[#6207e3] disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer shadow-lg shadow-[#5003BD]/30 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Delete Message Confirmation Modal */}
        {messageToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="w-full max-w-sm bg-[#18181b] border border-[#2a2a2e] rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-base leading-tight">Delete message?</h4>
                  <p className="text-xs text-[#a1a1aa] mt-0.5">This message will be deleted for everyone in this chat.</p>
                </div>
              </div>

              <div className="bg-[#121212] p-3 rounded-xl border border-[#27272a] text-xs text-zinc-300 italic truncate">
                "{messageToDelete.text}"
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setMessageToDelete(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteMessage}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors shadow-lg shadow-red-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  {isDeleting ? 'Deleting...' : 'Delete for everyone'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // MAIN MESSAGES HUB (TOP ROW + 3 TABS)
  // ========================================================
  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in duration-300 pb-20">
      
      {/* Header and Presence Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#5003BD]" />
          Messages
        </h1>
        
        {/* Presence Legend Indicator */}
        <div className="flex items-center gap-3 text-[11px] bg-[#1a1a1e] border border-[#2a2a2e] px-3 py-1.5 rounded-full text-[#a1a1aa] w-fit">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
            Online
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
            Background
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
            Offline
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TOP ROW: REAL PROFILES OF THOSE WHO MUTUALLY FOLLOW       */}
      {/* ======================================================== */}
      <div className="bg-[#18181c] border border-[#2a2a2e] rounded-2xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-[#5003BD]" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#a1a1aa]">
              Mutual Follows
            </span>
            {mutuals.length > 0 && (
              <span className="text-[10px] bg-[#5003BD]/20 text-purple-300 px-2 py-0.5 rounded-full font-bold">
                {mutuals.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setShowNewChatModal(true)}
            className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-medium"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Find Players</span>
          </button>
        </div>

        {/* Horizontal scroll list of mutual follow avatars with status dots */}
        <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar py-1 px-1">
          {mutuals.length === 0 ? (
            <div className="w-full text-center py-3 px-2 flex flex-col items-center justify-center">
              <p className="text-xs text-[#a1a1aa]">
                No mutual followers yet.
              </p>
              <p className="text-[11px] text-[#71717a] mt-0.5">
                When you and another tester follow each other, their live status and profile will show here.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-2.5 px-3 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-[#5003BD]" />
                Search & Message Players
              </button>
            </div>
          ) : (
            mutuals.map((gamer) => {
              const status = getStatusColor(gamer.uid, gamer.status);
              return (
                <button
                  key={gamer.uid}
                  onClick={() => handleOpenDirectChat(gamer)}
                  className="flex flex-col items-center group cursor-pointer shrink-0 focus:outline-none"
                >
                  {/* Profile Avatar with status dot at bottom right */}
                  <div className="relative mb-1.5">
                    <div className="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr from-[#5003BD]/60 to-transparent group-hover:from-[#5003BD] transition-all">
                      <div className="w-full h-full rounded-full bg-[#27272a] border-2 border-[#18181c] overflow-hidden">
                        {gamer.photoURL ? (
                          <img 
                            src={gamer.photoURL} 
                            alt={gamer.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-white text-sm bg-[#5003BD]/40">
                            {(gamer.gamertag?.[0] || 'G').toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Dot at bottom-right corner of profile */}
                    <span 
                      className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#18181c] ${status.bg} ${status.glow}`}
                      title={status.label}
                    />
                  </div>

                  {/* Name with inline status dot (NO status text under the user) */}
                  <div className="flex items-center gap-1.5 max-w-[80px] justify-center">
                    <span className="text-xs font-semibold text-white group-hover:text-purple-300 truncate transition-colors text-center">
                      {gamer.gamertag}
                    </span>
                    {/* Dot beside name */}
                    <span 
                      className={`w-1.5 h-1.5 rounded-full ${status.bg} ${status.glow} inline-block shrink-0`}
                      title={status.label}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3 TAB AREA: INBOX, GROUPS, COMMUNITY                     */}
      {/* ======================================================== */}
      <div className="flex items-center p-1 bg-[#18181c] border border-[#2a2a2e] rounded-xl">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'inbox'
              ? 'bg-[#5003BD] text-white shadow-md shadow-[#5003BD]/30'
              : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]/50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Inbox</span>
          {chats.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'inbox' ? 'bg-white/20 text-white' : 'bg-[#27272a] text-[#71717a]'
            }`}>
              {chats.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'groups'
              ? 'bg-[#5003BD] text-white shadow-md shadow-[#5003BD]/30'
              : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Groups</span>
          {groups.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'groups' ? 'bg-white/20 text-white' : 'bg-[#27272a] text-[#71717a]'
            }`}>
              {groups.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('community')}
          className={`flex-1 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'community'
              ? 'bg-[#5003BD] text-white shadow-md shadow-[#5003BD]/30'
              : 'text-[#a1a1aa] hover:text-white hover:bg-[#27272a]/50'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Community</span>
          {communities.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              activeTab === 'community' ? 'bg-white/20 text-white' : 'bg-[#27272a] text-[#71717a]'
            }`}>
              {communities.length}
            </span>
          )}
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#71717a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'inbox' 
                ? "Filter conversations..."
                : activeTab === 'groups'
                  ? "Search squad groups..."
                  : "Search community channels..."
            }
            className="w-full bg-[#18181c] text-white text-xs sm:text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#2a2a2e] focus:outline-none focus:border-[#5003BD] placeholder:text-[#71717a]"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 p-1 text-[#71717a] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {activeTab === 'inbox' && (
          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-2.5 bg-[#5003BD] hover:bg-[#6207e3] text-white rounded-xl transition-all cursor-pointer shrink-0 shadow-md shadow-[#5003BD]/30 flex items-center gap-1.5 text-xs font-bold"
            title="Start new direct message"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: INBOX LIST (REAL CHATS)                           */}
      {/* ======================================================== */}
      {activeTab === 'inbox' && (
        <div className="flex flex-col gap-2">
          {chats.length === 0 ? (
            <div className="bg-[#18181c] border border-[#2a2a2e] rounded-2xl p-8 text-center text-[#71717a]">
              <MessageSquare className="w-8 h-8 text-[#5003BD] mx-auto mb-2 opacity-60" />
              <p className="text-white font-bold text-sm">No conversations yet</p>
              <p className="text-xs mt-1 max-w-sm mx-auto text-[#a1a1aa]">
                Select a mutual friend from the top row or search registered players to send your first message.
              </p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-4 px-4 py-2 bg-[#5003BD] hover:bg-[#6207e3] text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-[#5003BD]/20"
              >
                <Plus className="w-4 h-4" />
                Start a New Chat
              </button>
            </div>
          ) : (
            chats
              .filter(chat => {
                if (!searchQuery.trim()) return true;
                const partner = getChatPartner(chat);
                const q = searchQuery.toLowerCase();
                return (
                  partner?.name.toLowerCase().includes(q) ||
                  partner?.gamertag.toLowerCase().includes(q) ||
                  chat.lastMessage?.toLowerCase().includes(q)
                );
              })
              .map((chat) => {
                const partner = getChatPartner(chat);
                if (!partner) return null;
                const status = getStatusColor(partner.uid);

                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setActiveChatGamer(partner as any);
                      setActiveChatId(chat.id);
                      setActiveGroup(null);
                      setActiveCommunity(null);
                    }}
                    className="bg-[#18181c] hover:bg-[#202026] border border-[#2a2a2e] hover:border-[#5003BD]/50 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar with Presence Dot at bottom-right */}
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-full bg-[#27272a] border border-[#3f3f46] overflow-hidden">
                          {partner.photoURL ? (
                            <img src={partner.photoURL} alt={partner.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-white bg-[#5003BD]/40">
                              {(partner.gamertag?.[0] || 'G').toUpperCase()}
                            </div>
                          )}
                        </div>
                        {/* Status Dot at bottom right of avatar */}
                        <span 
                          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#18181c] ${status.bg} ${status.glow}`}
                          title={status.label}
                        />
                      </div>

                      {/* Information (NO status text under the user) */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors truncate">
                            {partner.name || partner.gamertag}
                          </span>
                          {/* Status dot beside name */}
                          <span 
                            className={`w-2 h-2 rounded-full ${status.bg} ${status.glow} inline-block shrink-0`}
                            title={status.label}
                          />
                          <span className="text-[11px] text-[#71717a] truncate">
                            @{partner.gamertag}
                          </span>
                        </div>
                        <p className={`text-xs truncate max-w-[210px] sm:max-w-[360px] ${
                          chat.lastMessage === 'This message was deleted' ? 'italic text-zinc-500 flex items-center gap-1' : 'text-[#a1a1aa]'
                        }`}>
                          {chat.lastMessage === 'This message was deleted' && (
                            <Ban className="w-3 h-3 text-zinc-500 inline shrink-0" />
                          )}
                          <span>{chat.lastMessage || 'Tap to open chat'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0 pl-2">
                      <span className="text-[10px] text-[#71717a] font-mono">
                        {formatTime(chat.updatedAt)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#52525b] group-hover:text-white transition-colors" />
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: GROUPS (REAL FIRESTORE SQUAD GROUPS)              */}
      {/* ======================================================== */}
      {activeTab === 'groups' && (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setShowCreateGroupModal(true)}
            className="w-full py-3 px-4 bg-gradient-to-r from-[#5003BD] to-[#7928CA] hover:brightness-110 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#5003BD]/20"
          >
            <Plus className="w-4 h-4" />
            Create Squad Group Chat
          </button>

          {groups.length === 0 ? (
            <div className="bg-[#18181c] border border-[#2a2a2e] rounded-2xl p-8 text-center text-[#71717a]">
              <Users className="w-8 h-8 text-[#5003BD] mx-auto mb-2 opacity-60" />
              <p className="text-white font-bold text-sm">No squad groups created yet</p>
              <p className="text-xs mt-1 text-[#a1a1aa]">
                Create a squad group to chat and coordinate with your teammates in real-time.
              </p>
            </div>
          ) : (
            groups
              .filter(g => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return g.name.toLowerCase().includes(q) || g.game.toLowerCase().includes(q);
              })
              .map((group) => (
                <div
                  key={group.id}
                  onClick={() => {
                    setActiveGroup(group);
                    setActiveChatGamer(null);
                    setActiveChatId(null);
                    setActiveCommunity(null);
                  }}
                  className="bg-[#18181c] hover:bg-[#202026] border border-[#2a2a2e] hover:border-[#5003BD]/50 p-3.5 rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[#27272a] border border-[#3f3f46] overflow-hidden shrink-0 relative">
                      <img src={group.avatar} alt={group.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors truncate">
                          {group.name}
                        </span>
                        <span className="text-[10px] bg-[#27272a] text-[#a1a1aa] px-2 py-0.5 rounded-full font-medium shrink-0">
                          {group.game}
                        </span>
                      </div>
                      <p className="text-xs text-[#a1a1aa] truncate max-w-[210px] sm:max-w-[360px]">
                        {group.lastMessage || 'Squad channel ready'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0 pl-2">
                    <span className="text-[10px] text-[#71717a] font-mono">
                      {formatTime(group.lastMessageTime || group.createdAt)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#52525b] group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: COMMUNITY (REAL FIRESTORE HUBS)                    */}
      {/* ======================================================== */}
      {activeTab === 'community' && (
        <div className="flex flex-col gap-3">
          <div className="p-3.5 bg-[#5003BD]/10 border border-[#5003BD]/30 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-[#5003BD] shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-white">Gamers Grid Community Channels</h4>
                <p className="text-[11px] text-[#a1a1aa]">Real public channels for tournaments, clips, and gamer chat</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateCommunityModal(true)}
              className="px-3 py-1.5 bg-[#5003BD] hover:bg-[#6207e3] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Hub</span>
            </button>
          </div>

          {communities.length === 0 ? (
            <div className="bg-[#18181c] border border-[#2a2a2e] rounded-2xl p-8 text-center text-[#71717a]">
              <Globe className="w-8 h-8 text-[#5003BD] mx-auto mb-2 opacity-60" />
              <p className="text-white font-bold text-sm">No community channels created yet</p>
              <p className="text-xs mt-1 text-[#a1a1aa]">
                Create a channel hub for game discussions, tips, tournaments, or clips!
              </p>
              <button
                onClick={() => setShowCreateCommunityModal(true)}
                className="mt-4 px-4 py-2 bg-[#5003BD] hover:bg-[#6207e3] text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Create First Community Hub
              </button>
            </div>
          ) : (
            communities
              .filter(c => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
              })
              .map((channel) => (
                <div
                  key={channel.id}
                  onClick={() => {
                    setActiveCommunity(channel);
                    setActiveChatGamer(null);
                    setActiveChatId(null);
                    setActiveGroup(null);
                  }}
                  className="bg-[#18181c] hover:bg-[#202026] border border-[#2a2a2e] hover:border-[#5003BD]/50 p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#27272a] border border-[#3f3f46] flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform">
                      {channel.icon || '🎮'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-[#5003BD]" />
                          {channel.name}
                        </span>
                      </div>
                      <p className="text-xs text-[#a1a1aa] line-clamp-1">
                        {channel.description}
                      </p>
                      {channel.lastMessage && (
                        <p className="text-[11px] text-[#71717a] mt-1 truncate">
                          Latest: "{channel.lastMessage}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 pl-2">
                    <span className="text-[10px] text-[#71717a] font-mono">
                      {formatTime(channel.lastMessageTime || channel.createdAt)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#52525b] group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: FIND / SEARCH REAL REGISTERED PLAYERS             */}
      {/* ======================================================== */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#18181c] border border-[#2a2a2e] rounded-2xl max-w-md w-full p-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#5003BD]" />
                Start a New Direct Message
              </h3>
              <button 
                onClick={() => {
                  setShowNewChatModal(false);
                  setUserSearchResults([]);
                }}
                className="p-1 rounded-lg text-[#71717a] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#71717a]" />
              <input
                type="text"
                autoFocus
                placeholder="Search registered player by gamertag or name..."
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="w-full bg-[#121212] text-white text-sm pl-10 pr-4 py-2.5 rounded-xl border border-[#2a2a2e] focus:outline-none focus:border-[#5003BD] placeholder:text-[#71717a]"
              />
            </div>

            {/* Results List */}
            <div className="max-h-60 overflow-y-auto space-y-2 hide-scrollbar">
              {isSearchingUsers ? (
                <div className="py-6 text-center text-xs text-[#71717a]">
                  Searching registered gamers...
                </div>
              ) : userSearchResults.length > 0 ? (
                userSearchResults.map((user) => {
                  const status = getStatusColor(user.uid);
                  return (
                    <div
                      key={user.uid}
                      onClick={() => handleOpenDirectChat(user)}
                      className="p-3 bg-[#121212] hover:bg-[#202026] border border-[#2a2a2e] hover:border-[#5003BD]/50 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-[#27272a] overflow-hidden border border-[#3f3f46]">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-white bg-[#5003BD]/40 text-sm">
                                {(user.gamertag?.[0] || 'G').toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span 
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-[#121212] ${status.bg}`} 
                            title={status.label}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white">{user.name || user.gamertag}</span>
                            <span 
                              className={`w-1.5 h-1.5 rounded-full ${status.bg}`} 
                              title={status.label}
                            />
                          </div>
                          <span className="text-xs text-[#71717a]">@{user.gamertag}</span>
                        </div>
                      </div>

                      <button className="px-3 py-1 bg-[#5003BD] hover:bg-[#6207e3] text-white text-xs font-bold rounded-lg transition-colors">
                        Message
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="py-6 text-center text-xs text-[#71717a]">
                  Type a gamertag to find other registered testers and start a direct conversation.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE SQUAD GROUP                                */}
      {/* ======================================================== */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#18181c] border border-[#2a2a2e] rounded-2xl max-w-md w-full p-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#5003BD]" />
                Create Squad Group Chat
              </h3>
              <button 
                onClick={() => setShowCreateGroupModal(false)}
                className="p-1 rounded-lg text-[#71717a] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#a1a1aa] uppercase mb-1.5">
                  Squad Group Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Warzone Duo, Apex Ranked Squad..."
                  required
                  className="w-full bg-[#121212] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2a2a2e] focus:outline-none focus:border-[#5003BD]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a1a1aa] uppercase mb-1.5">
                  Game Title
                </label>
                <select
                  value={newGroupGame}
                  onChange={(e) => setNewGroupGame(e.target.value)}
                  className="w-full bg-[#121212] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2a2a2e] focus:outline-none focus:border-[#5003BD]"
                >
                  <option value="Call of Duty: Warzone">Call of Duty: Warzone</option>
                  <option value="Valorant">Valorant</option>
                  <option value="Apex Legends">Apex Legends</option>
                  <option value="EA Sports FC 25">EA Sports FC 25</option>
                  <option value="Rocket League">Rocket League</option>
                  <option value="Counter-Strike 2">Counter-Strike 2</option>
                  <option value="Fortnite">Fortnite</option>
                  <option value="GTA Online">GTA Online</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#a1a1aa] hover:bg-[#27272a] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#5003BD] hover:bg-[#6207e3] text-white transition-colors disabled:opacity-40 cursor-pointer shadow-md shadow-[#5003BD]/30"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE COMMUNITY HUB                              */}
      {/* ======================================================== */}
      {showCreateCommunityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#18181c] border border-[#2a2a2e] rounded-2xl max-w-md w-full p-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#5003BD]" />
                Create Community Channel
              </h3>
              <button 
                onClick={() => setShowCreateCommunityModal(false)}
                className="p-1 rounded-lg text-[#71717a] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCommunity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#a1a1aa] uppercase mb-1.5">
                  Channel Name
                </label>
                <div className="flex items-center bg-[#121212] rounded-xl border border-[#2a2a2e] px-3">
                  <Hash className="w-4 h-4 text-[#5003BD] shrink-0" />
                  <input
                    type="text"
                    value={newCommunityName}
                    onChange={(e) => setNewCommunityName(e.target.value)}
                    placeholder="lfg-tournaments, game-clips, general..."
                    required
                    className="w-full bg-transparent text-white text-sm px-2 py-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a1a1aa] uppercase mb-1.5">
                  Channel Icon Emoji
                </label>
                <div className="flex items-center gap-2">
                  {['🎮', '🏆', '⚡', '🔥', '🎙️', '🎯', '🛡️'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCommunityIcon(emoji)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-all cursor-pointer ${
                        newCommunityIcon === emoji 
                          ? 'border-[#5003BD] bg-[#5003BD]/20 scale-105' 
                          : 'border-[#2a2a2e] bg-[#121212] hover:border-[#3f3f46]'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a1a1aa] uppercase mb-1.5">
                  Description
                </label>
                <textarea
                  value={newCommunityDesc}
                  onChange={(e) => setNewCommunityDesc(e.target.value)}
                  placeholder="What is this channel for? e.g. Tournaments, clips, weapon meta..."
                  rows={3}
                  className="w-full bg-[#121212] text-white text-sm px-3.5 py-2.5 rounded-xl border border-[#2a2a2e] focus:outline-none focus:border-[#5003BD] resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCommunityModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#a1a1aa] hover:bg-[#27272a] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCommunityName.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#5003BD] hover:bg-[#6207e3] text-white transition-colors disabled:opacity-40 cursor-pointer shadow-md shadow-[#5003BD]/30"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
