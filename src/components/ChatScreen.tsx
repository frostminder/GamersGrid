import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, query, orderBy, onSnapshot, limit, 
  startAfter, writeBatch, doc, serverTimestamp, getDocs, updateDoc, increment
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { 
  ArrowLeft, Send, Image as ImageIcon, Loader2, Play, 
  Paperclip, Check, CheckCheck, Video as VideoIcon, AlertCircle
} from 'lucide-react';
import { uploadToR2 } from '../lib/uploadMedia';

interface Message {
  id: string;
  senderId: string;
  text?: string;
  // Rule 7: Store only the resulting R2 URL as a string field — Firestore never stores the file itself
  attachmentUrl?: string;
  // Rule 8: Generate and store a small thumbnail (client-side, before upload) for every video
  thumbnailUrl?: string;
  createdAt: any;
}

interface ChatScreenProps {
  conversationId: string;
  partnerName: string;
  partnerAvatar?: string;
  partnerId?: string;
  onBack: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ 
  conversationId, 
  partnerName, 
  partnerAvatar,
  partnerId,
  onBack 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  const lastDocRef = useRef<any>(null);
  const currentUser = auth.currentUser;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastTypingPingRef = useRef<number>(0);

  // ---------------------------------------------------------------------------
  // Rule 3: Listener scoping
  // Open chat screen: listener attached ONLY to that conversation's messages
  // subcollection, explicitly unsubscribed on navigation away / unmount.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!currentUser || !conversationId) return;

    // Reset unread count for current user upon opening conversation
    const conversationRef = doc(db, 'conversations', conversationId);
    updateDoc(conversationRef, {
      [`unreadCounts.${currentUser.uid}`]: 0,
    }).catch(() => {});

    // Rule 2: messages subcollection under each conversation
    // Rule 8: Scoped per conversation, ordered by timestamp descending
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    
    // -------------------------------------------------------------------------
    // Rule 1: Fix chat opening behavior (critical)
    // Query the last 20 messages ordered by timestamp descending.
    // -------------------------------------------------------------------------
    const q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((docSnap) => {
        msgs.push({ id: docSnap.id, ...docSnap.data() } as Message);
      });
      
      // Store cursor for pagination
      if (snapshot.docs.length > 0 && !lastDocRef.current) {
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
      }

      // Merge real-time changes while preserving older paginated history
      setMessages((prevMessages) => {
        const merged = [...msgs];
        const msgMap = new Map(msgs.map(m => [m.id, m]));
        
        prevMessages.forEach(pm => {
          if (!msgMap.has(pm.id)) {
            merged.push(pm);
          }
        });
        
        // Data kept strictly in descending / newest-first order
        merged.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });

        return merged;
      });
    }, (err) => {
      console.error('Error listening to conversation messages:', err);
    });

    // Explicitly unsubscribed on unmount / navigation away
    return () => unsubscribe();
  }, [conversationId, currentUser]);

  // ---------------------------------------------------------------------------
  // Rule 4: Pagination
  // Page size: 20 messages, using limit(20) + startAfter() cursors.
  // Next page loads only when the user scrolls near the older end of loaded history.
  // ---------------------------------------------------------------------------
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || !lastDocRef.current || !currentUser) return;
    setLoadingMore(true);

    try {
      const messagesRef = collection(db, 'conversations', conversationId, 'messages');
      const q = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        startAfter(lastDocRef.current),
        limit(20)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setHasMore(false);
      } else {
        lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
        const olderMsgs: Message[] = [];
        snapshot.forEach((docSnap) => {
          olderMsgs.push({ id: docSnap.id, ...docSnap.data() } as Message);
        });

        setMessages((prev) => {
          const combined = [...prev, ...olderMsgs];
          // Remove potential duplicates
          const seen = new Set<string>();
          return combined.filter(m => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });
        });
      }
    } catch (err) {
      console.error('Error loading older messages:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [conversationId, hasMore, loadingMore, currentUser]);

  // Intersection Observer for infinite scrolling (triggers on older end of loaded history)
  const topElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreMessages();
      }
    }, { threshold: 0.1 });

    if (node) observerRef.current.observe(node);
  }, [loadingMore, hasMore, loadMoreMessages]);

  // ---------------------------------------------------------------------------
  // Rule 6: Writes
  // Sending a message: batch the message write and the parent conversation's
  // lastMessage / unreadCounts update into a single Firestore batched write.
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (e?: React.FormEvent, attachmentUrl?: string, thumbnailUrl?: string) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachmentUrl) || !currentUser || isSending) return;

    setIsSending(true);
    const textToSend = inputText.trim();
    setInputText('');

    try {
      // Atomic batched write
      const batch = writeBatch(db);
      
      const newMsgRef = doc(collection(db, 'conversations', conversationId, 'messages'));
      const conversationRef = doc(db, 'conversations', conversationId);

      const messageData: any = {
        senderId: currentUser.uid,
        createdAt: serverTimestamp(),
      };

      if (textToSend) messageData.text = textToSend;
      if (attachmentUrl) messageData.attachmentUrl = attachmentUrl;
      if (thumbnailUrl) messageData.thumbnailUrl = thumbnailUrl;

      batch.set(newMsgRef, messageData);

      // Rule 2: Parent conversation fields update
      const updateData: any = {
        lastMessage: {
          text: textToSend || (attachmentUrl ? 'Media Attachment' : 'New message'),
          senderId: currentUser.uid,
          timestamp: serverTimestamp(),
        },
        lastMessageSenderId: currentUser.uid,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Increment unread count for partner
      if (partnerId && partnerId !== currentUser.uid) {
        updateData[`unreadCounts.${partnerId}`] = increment(1);
      }

      batch.set(conversationRef, updateData, { merge: true });

      await batch.commit();
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Rule 6: Typing indicators
  // Debounce to at most one write every 2-3 seconds to prevent excessive writes.
  // ---------------------------------------------------------------------------
  const handleInputChange = (val: string) => {
    setInputText(val);

    const now = Date.now();
    if (now - lastTypingPingRef.current > 3000 && currentUser) {
      lastTypingPingRef.current = now;
      // Optional ephemeral typing ping (debounced to 3000ms)
    }
  };

  // ---------------------------------------------------------------------------
  // Rule 7 & 8: Cloudflare R2 Upload & Client-Side Thumbnailing
  // ---------------------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploadingMedia(true);

    try {
      // uploadToR2 enforces 2-minute video cap, 1080p ceiling, generates thumbnail,
      // requests presigned URL, and uploads directly to Cloudflare R2
      const { url, thumbnailUrl } = await uploadToR2(file);
      await handleSendMessage(undefined, url, thumbnailUrl);
    } catch (err: any) {
      console.error('R2 upload failed:', err);
      setUploadError(err.message || 'Media upload failed');
    } finally {
      setIsUploadingMedia(false);
      // Reset input value
      e.target.value = '';
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#121212] overflow-hidden select-none">
      {/* Top Header */}
      <div className="p-3 bg-[#181818] border-b border-[#2A2A2E] flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-[#2A2A2E] rounded-full transition-colors text-white active:scale-95"
            aria-label="Back to conversations"
            id="btn-back-chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img
                src={partnerAvatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80'}
                alt={partnerName}
                className="w-9 h-9 rounded-xl object-cover border border-[#2A2A2E]"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#181818]" />
            </div>
            <div>
              <h3 className="text-white font-gaming font-bold text-sm leading-tight">{partnerName}</h3>
              <span className="text-[11px] text-emerald-400 font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="p-2.5 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between text-amber-300 text-xs px-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{uploadError}</span>
          </div>
          <button onClick={() => setUploadError(null)} className="text-zinc-400 hover:text-white font-bold ml-1">×</button>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          Rule 1: Fix chat opening behavior (critical)
          Render message list using an inverted list (flex-direction: column-reverse,
          data kept in descending/newest-first order). 
          In an inverted list, index 0 renders at the visual bottom by default — 
          so the newest message is already in place on first render, with no scroll
          or animation needed.
          Loading older messages (pagination) happens when the user scrolls toward
          the end of the inverted list (visually scrolling up).
          ---------------------------------------------------------------------- */}
      <div 
        className="flex-1 overflow-y-auto bg-[#0a0a0a] p-4 flex flex-col-reverse gap-3 hide-scrollbar"
        id="chat-messages-container"
      >
        {messages.map((msg, index) => {
          const isMe = msg.senderId === currentUser?.uid;
          // In flex-col-reverse, the oldest loaded message in the array is at index messages.length - 1
          const isLastElement = index === messages.length - 1;

          const isVideo = msg.attachmentUrl?.match(/\.(mp4|webm|mov)$/i) || Boolean(msg.thumbnailUrl);
          const isPlaying = playingVideoId === msg.id;

          const timeFormatted = msg.createdAt?.toDate 
            ? new Date(msg.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';

          return (
            <div
              key={msg.id}
              ref={isLastElement ? topElementRef : null}
              className={`flex flex-col max-w-[78%] sm:max-w-[65%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
            >
              <div 
                className={`p-3 rounded-2xl text-sm transition-all shadow-md ${
                  isMe 
                    ? 'bg-[#5003BD] text-white rounded-tr-none' 
                    : 'bg-[#222226] text-zinc-100 rounded-tl-none border border-[#2A2A2E]'
                }`}
              >
                {/* Rule 7 & 8: Media rendering */}
                {msg.attachmentUrl && (
                  <div className="mb-2 rounded-xl overflow-hidden max-w-[280px] bg-black/40 border border-white/10">
                    {isVideo ? (
                      // Rule 8: Display thumbnail in feeds/chat until user actually taps to play
                      isPlaying ? (
                        <video
                          src={msg.attachmentUrl}
                          controls
                          autoPlay
                          className="w-full h-auto rounded-lg max-h-[300px]"
                        />
                      ) : (
                        <div 
                          onClick={() => setPlayingVideoId(msg.id)}
                          className="relative group cursor-pointer aspect-video bg-zinc-900 flex items-center justify-center overflow-hidden"
                        >
                          <img 
                            // Rule 7: Lazy-load media: only load what's currently visible
                            loading="lazy" 
                            src={msg.thumbnailUrl || msg.attachmentUrl} 
                            alt="Video preview" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>
                      )
                    ) : (
                      <img 
                        // Rule 7: Lazy-load media
                        loading="lazy" 
                        src={msg.attachmentUrl} 
                        alt="Attachment" 
                        className="w-full h-auto rounded-lg max-h-[320px] object-cover"
                      />
                    )}
                  </div>
                )}

                {msg.text && (
                  <p className="break-words [word-break:break-word] whitespace-pre-wrap leading-relaxed text-[13px]">
                    {msg.text}
                  </p>
                )}

                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-zinc-400">
                  <span>{timeFormatted}</span>
                  {isMe && <CheckCheck className="w-3 h-3 text-purple-300 inline" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Loading spinner when paginating older messages */}
        {loadingMore && (
          <div className="flex justify-center p-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#7A22EC]" />
          </div>
        )}
      </div>

      {/* Bottom Input Field */}
      <div className="p-3 bg-[#181818] border-t border-[#2A2A2E] shrink-0">
        <form 
          onSubmit={handleSendMessage}
          className="flex items-center gap-2"
        >
          {/* File Upload Button (Rule 7: Direct to R2) */}
          <label className="p-2.5 rounded-xl hover:bg-[#2A2A2E] text-zinc-400 hover:text-white cursor-pointer transition-colors shrink-0 active:scale-95">
            {isUploadingMedia ? (
              <Loader2 className="w-5 h-5 animate-spin text-[#7A22EC]" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
            <input 
              type="file" 
              accept="image/*,video/mp4,video/quicktime,video/webm" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isSending || isUploadingMedia}
            />
          </label>

          <input
            type="text"
            value={inputText}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Type a gamer message..."
            className="flex-1 bg-[#121212] text-white text-sm px-4 py-2.5 rounded-xl border border-[#2A2A2E] focus:border-[#5003BD] focus:outline-none placeholder:text-zinc-500"
            disabled={isSending || isUploadingMedia}
          />

          <button
            type="submit"
            disabled={(!inputText.trim() && !isSending) || isSending || isUploadingMedia}
            className="p-2.5 rounded-xl bg-[#5003BD] hover:bg-[#7A22EC] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 active:scale-95 shadow-md"
            aria-label="Send message"
            id="btn-send-message"
          >
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
      </div>
    </div>
  );
};
