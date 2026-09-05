import React, { useState, useEffect } from 'react';
import { ShieldCheck, Wifi, Users, LayoutDashboard, Settings, Bell, Home, Trophy, PlaySquare, User, Search, Plus, MessageSquare, Flame } from 'lucide-react';
import { GamersGridLogo } from '../components/GamersGridLogo';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc, updateDoc, orderBy, serverTimestamp, limit } from 'firebase/firestore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ProfileTab } from '../components/ProfileTab';
import { TournamentHub } from '../components/TournamentHub';
import { SettingsMockup } from '../components/MockupScreens';
import { MessagesScreen } from '../components/MessagesScreen';
import { SearchScreen } from '../components/SearchScreen';
import { NotificationsScreen } from '../components/NotificationsScreen';
import { CreatePostScreen } from '../components/CreatePostScreen';
import { FeedCard } from '../components/FeedCard';
import { ClipPlayerModal } from '../components/ClipPlayerModal';
import { startPresenceTracking } from '../lib/presenceService';
import { MOCK_TOURNAMENTS, INITIAL_WALLET, INITIAL_POSTS, Post } from '../types/mockData';

export const HomeScreen: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = React.useState(false);
  const [logoError, setLogoError] = React.useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isChatActive, setIsChatActive] = useState(false);
  const [dismissInstall, setDismissInstall] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [postsList, setPostsList] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(true);
  const [selectedClip, setSelectedClip] = useState<any | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'home';

  const handleTabChange = (tab: string) => {
    if (tab === activeTab) return;
    if (tab === 'home') {
      navigate('/home');
    } else {
      navigate(`/home?tab=${tab}`);
    }
    setIsChatActive(false);
  };

  useEffect(() => {
    let unsubscribeSnapshot: () => void;
    let stopPresence: (() => void) | undefined;
    let unsubNotifs: (() => void) | undefined;
    let unsubChats: (() => void) | undefined;
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        navigate("/auth", { replace: true });
        setUserProfile(null);
        setUnreadNotificationsCount(0);
        setUnreadMessagesCount(0);
        if (stopPresence) {
          stopPresence();
          stopPresence = undefined;
        }
        if (unsubNotifs) {
          unsubNotifs();
          unsubNotifs = undefined;
        }
        if (unsubChats) {
          unsubChats();
          unsubChats = undefined;
        }
      } else {
        if (!stopPresence) {
          stopPresence = startPresenceTracking(currentUser.uid);
        }

        // Real-time unread notifications listener
        const notifQ = query(
          collection(db, 'notifications'),
          where('userId', '==', currentUser.uid),
          where('read', '==', false)
        );
        unsubNotifs = onSnapshot(notifQ, (snap) => {
          setUnreadNotificationsCount(snap.docs.length);
        }, (err) => {
          console.error('Error listening to notifications count:', err);
        });

        // Real-time unread messages listener
        const chatsQ = query(
          collection(db, 'chats'),
          where('participants', 'array-contains', currentUser.uid)
        );
        unsubChats = onSnapshot(chatsQ, (snap) => {
          let total = 0;
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            const count = data.unreadCount?.[currentUser.uid];
            if (typeof count === 'number' && count > 0) {
              total += count;
            } else if (data.lastMessageSenderId && data.lastMessageSenderId !== currentUser.uid && data.read === false) {
              total += 1;
            }
          });
          setUnreadMessagesCount(total);
        }, (err) => {
          console.error('Error listening to unread messages count:', err);
        });

        unsubscribeSnapshot = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(data);
            
            // Save to localStorage for quick switching
            try {
              const saved = JSON.parse(localStorage.getItem('gamersgrid_accounts') || '[]');
              const existingIndex = saved.findIndex((acc: any) => acc.email === currentUser.email);
              const accountData = {
                email: currentUser.email,
                gamertag: data.gamertag,
                photoURL: data.photoURL || currentUser.photoURL
              };
              
              if (existingIndex >= 0) {
                saved[existingIndex] = accountData;
              } else {
                saved.push(accountData);
              }
              localStorage.setItem('gamersgrid_accounts', JSON.stringify(saved));
            } catch (e) {
              console.error('Error saving account to local storage:', e);
            }
          }
        });
      }
      setUser(currentUser);
    });

    return () => {
      unsubscribe();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
      if (stopPresence) stopPresence();
      if (unsubNotifs) unsubNotifs();
      if (unsubChats) unsubChats();
    };
  }, []);

  // Listen and seed posts
  useEffect(() => {
    let unsubscribePosts: () => void;

    const syncPosts = async () => {
      try {
        setLoadingPosts(true);
        
        // Setup real-time listener for posts, ordering by createdAtTimestamp descending
        // Only load posts that actually have a timestamp (ignores old mockups if any are malformed)
        const postsQuery = query(
          collection(db, 'posts'),
          orderBy('createdAtTimestamp', 'desc'),
          limit(50)
        );
        
        unsubscribePosts = onSnapshot(postsQuery, (snap) => {
          const loaded: any[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            // Filter out old mockup seeded posts that might lack real creator data or have mock 'isNew' flags
            // if we want to ensure only real user posts show up
            if (data.creator && !['system', 'usr_1', 'usr_2', 'usr_3', 'usr_4'].includes(data.creator.id)) {
              loaded.push({
                ...data,
                id: docSnap.id
              });
            }
          });
          
          setPostsList(loaded);
          setLoadingPosts(false);
        }, (err) => {
          console.error('Error listening to posts:', err);
          setLoadingPosts(false);
        });

      } catch (err) {
        console.error('Error in syncPosts:', err);
        setLoadingPosts(false);
      }
    };

    syncPosts();

    return () => {
      if (unsubscribePosts) unsubscribePosts();
    };
  }, []);

  const handleLikePost = async (postId: string) => {
    try {
      const pIndex = postsList.findIndex(p => p.id === postId);
      if (pIndex === -1) return;
      const targetPost = postsList[pIndex];
      const newIsLiked = !targetPost.isLiked;
      const newLikesCount = targetPost.likesCount + (newIsLiked ? 1 : -1);

      // Optimistic update
      setPostsList(prev => prev.map(p => p.id === postId ? { ...p, isLiked: newIsLiked, likesCount: newLikesCount } : p));
      if (selectedClip && selectedClip.id === postId) {
        setSelectedClip(prev => prev ? { ...prev, isLiked: newIsLiked, likesCount: newLikesCount } : null);
      }

      // Sync with Firestore
      await updateDoc(doc(db, 'posts', postId), {
        isLiked: newIsLiked,
        likesCount: newLikesCount
      });
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleFollowCreator = async (creatorId: string) => {
    try {
      setPostsList(prev => prev.map(p => {
        if (p.creator.id === creatorId) {
          const currentFollowState = p.creator.isFollowing;
          return {
            ...p,
            creator: {
              ...p.creator,
              isFollowing: !currentFollowState
            }
          };
        }
        return p;
      }));

      if (selectedClip && selectedClip.creator.id === creatorId) {
        setSelectedClip(prev => {
          if (!prev) return null;
          return {
            ...prev,
            creator: {
              ...prev.creator,
              isFollowing: !prev.creator.isFollowing
            }
          };
        });
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    }
  };

  const handleSavePost = async (postId: string) => {
    try {
      const target = postsList.find(p => p.id === postId);
      if (!target) return;
      const newIsSaved = !target.isSaved;

      setPostsList(prev => prev.map(p => p.id === postId ? { ...p, isSaved: newIsSaved } : p));
      if (selectedClip && selectedClip.id === postId) {
        setSelectedClip(prev => prev ? { ...prev, isSaved: newIsSaved } : null);
      }

      await updateDoc(doc(db, 'posts', postId), {
        isSaved: newIsSaved
      });
    } catch (err) {
      console.error('Error saving post:', err);
    }
  };

  const handleAddComment = async (postId: string, commentText: string) => {
    try {
      const target = postsList.find(p => p.id === postId);
      if (!target) return;

      const currentUser = auth.currentUser;
      const newComment = {
        id: `c_${Date.now()}`,
        user: {
          id: currentUser?.uid || 'guest',
          username: userProfile?.gamertag || currentUser?.email?.split('@')[0] || 'gamer',
          displayName: userProfile?.name || userProfile?.gamertag || 'Gamer',
          avatar: userProfile?.photoURL || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        },
        text: commentText,
        createdAt: 'Just now',
        likes: 0
      };

      const updatedComments = [...(target.comments || []), newComment];
      const newCommentsCount = (target.commentsCount || 0) + 1;

      setPostsList(prev => prev.map(p => p.id === postId ? { ...p, comments: updatedComments, commentsCount: newCommentsCount } : p));
      if (selectedClip && selectedClip.id === postId) {
        setSelectedClip(prev => prev ? { ...prev, comments: updatedComments, commentsCount: newCommentsCount } : null);
      }

      await updateDoc(doc(db, 'posts', postId), {
        comments: updatedComments,
        commentsCount: newCommentsCount
      });
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleTipCoins = async (post: any) => {
    try {
      const updatedShares = (post.sharesCount || 0) + 1;
      
      setPostsList(prev => prev.map(p => p.id === post.id ? { ...p, sharesCount: updatedShares } : p));
      if (selectedClip && selectedClip.id === post.id) {
        setSelectedClip(prev => prev ? { ...prev, sharesCount: updatedShares } : null);
      }

      alert(`🪙 Sparkles! You successfully tipped 100 Gaming Coins to @${post.creator.username}!`);
      
      await updateDoc(doc(db, 'posts', post.id), {
        sharesCount: updatedShares
      });
    } catch (err) {
      console.error('Error tipping coins:', err);
    }
  };

  return (
    <div className={`min-h-screen w-full bg-[#121212] text-white flex flex-col items-center ${isChatActive ? 'pb-0' : 'pb-24'}`}>
      {/* Premium Top Navigation */}
      {(!isChatActive && activeTab !== 'profile' && activeTab !== 'settings' && activeTab !== 'create') && (
        <header className="w-full bg-[#121212]/80 backdrop-blur-xl border-b border-[#2a2a2e] px-4 py-3 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            {!logoError ? (
              <img 
                src="/logo.png" 
                alt="GamersGrid" 
                className="h-8 w-auto object-contain drop-shadow-[0_0_8px_rgba(80,3,189,0.5)]" 
                onError={() => setLogoError(true)} 
              />
            ) : (
              <GamersGridLogo size={32} color="#5003BD" glow={true} />
            )}
            <span className="font-mono font-bold tracking-widest text-white hidden sm:block">GAMERS GRID</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <button 
              onClick={() => handleTabChange('notifications')}
              className={`relative p-2 rounded-full transition-colors group ${activeTab === 'notifications' ? 'bg-[#2a2a2e]' : 'hover:bg-[#2a2a2e]'}`}
              title={unreadNotificationsCount > 0 ? `${unreadNotificationsCount} unread notification${unreadNotificationsCount > 1 ? 's' : ''}` : 'Notifications'}
            >
              <Bell className={`w-5 h-5 transition-colors ${activeTab === 'notifications' ? 'text-white' : 'text-[#aaaaaa] group-hover:text-white'}`} />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#121212] shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse"></span>
              )}
            </button>
            
            {/* User Avatar */}
            <div 
              onClick={() => handleTabChange('profile')}
              className="h-9 w-9 rounded-full bg-gradient-to-tr bg-[#5003BD] p-[2px] cursor-pointer hover:scale-105 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center overflow-hidden">
                {(userProfile?.photoURL || user?.photoURL) ? (
                  <img src={userProfile?.photoURL || user?.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-sm text-white uppercase">{userProfile?.gamertag?.[0] || user?.email?.[0] || 'G'}</span>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className={`flex-1 w-full flex flex-col ${isChatActive ? 'p-0 gap-0 max-w-none' : (activeTab === 'profile' || activeTab === 'settings' || activeTab === 'create') ? 'p-0 gap-0 max-w-none' : 'max-w-4xl px-4 pt-3 pb-6 gap-4'}`}>
        
        {activeTab === 'home' && (
          <div className="flex flex-col gap-6">
            {/* Community Highlights & Clips Feed Section */}
            <div className="flex flex-col gap-4">
              {loadingPosts ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-2 border-[#5003BD] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[#888888] text-xs font-mono">LOADING CLIPS...</span>
                </div>
              ) : postsList.length === 0 ? (
                <div className="bg-[#1a1a1a] border border-[#2a2a2e] rounded-3xl p-12 text-center flex flex-col items-center gap-4">
                  <span className="text-[#555555] text-5xl">🎬</span>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-base">No community clips yet</h4>
                    <p className="text-xs text-[#888888] max-w-sm">Be the first to upload a clip, gameplay highlight, or esports commentary!</p>
                  </div>
                  <button 
                    onClick={() => handleTabChange('create')}
                    className="bg-[#5003BD] hover:bg-[#630cdb] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors mt-2"
                  >
                    Post a Clip
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {postsList.map((post) => (
                    <FeedCard 
                      key={post.id}
                      post={post}
                      onLike={handleLikePost}
                      onFollow={handleFollowCreator}
                      onOpenComments={(p) => setSelectedClip(p)}
                      onOpenClipModal={(p) => setSelectedClip(p)}
                      onTipCoins={handleTipCoins}
                      onSave={handleSavePost}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tournaments' && (
          <TournamentHub 
            tournaments={MOCK_TOURNAMENTS} 
            wallet={INITIAL_WALLET} 
            onJoinTournament={() => {}} 
            onOpenWallet={() => {}} 
            onBack={() => handleTabChange('home')}
          />
        )}

        {activeTab === 'search' && (
          <SearchScreen 
            onBack={() => handleTabChange('home')}
            onOpenClipModal={(p) => setSelectedClip(p)}
            onLikePost={handleLikePost}
            onFollowCreator={handleFollowCreator}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsScreen onBack={() => handleTabChange('home')} />
        )}
        {activeTab === 'create' && (
          <CreatePostScreen 
            onBack={() => handleTabChange('home')}
            onPostCreated={() => handleTabChange('home')}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesScreen onChatActiveChange={(active) => setIsChatActive(active)} />
        )}

        {activeTab === 'profile' && (
          <ProfileTab onNavigate={(tab) => handleTabChange(tab)} />
        )}

        {activeTab === 'settings' && (
          <SettingsMockup 
            onBack={() => handleTabChange('profile')}
            onSignOut={async () => {
              await auth.signOut();
              navigate('/auth', { replace: true });
            }} 
            onAddAccount={async () => {
              await auth.signOut();
              navigate('/auth', { replace: true });
            }}
            onSwitchAccount={async (email) => {
              await auth.signOut();
              navigate('/auth', { replace: true, state: { prefillEmail: email } });
            }}
          />
        )}

      </main>

      {/* Immersive Clip Player Overlay */}
      {selectedClip && (
        <ClipPlayerModal 
          post={selectedClip}
          onClose={() => setSelectedClip(null)}
          onLike={handleLikePost}
          onFollow={handleFollowCreator}
          onAddComment={handleAddComment}
          onTipCoins={handleTipCoins}
          onSave={handleSavePost}
        />
      )}

      {/* PWA Install Modal (Android/Desktop) */}
      {(!isInstalled && isInstallable && !dismissInstall) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#1c1c1f] border border-[#5003BD]/30 p-8 shadow-[0_0_50px_rgba(80,3,189,0.15)] animate-in zoom-in-95 duration-300 flex flex-col items-center text-center relative">
            <button 
              onClick={() => setDismissInstall(true)}
              className="absolute top-4 right-4 text-[#888888] hover:text-white transition-colors"
            >
              ✕
            </button>
            <div className="w-16 h-16 bg-gradient-to-tr bg-[#5003BD] rounded-2xl p-1 shadow-lg mb-6">
              <div className="w-full h-full bg-[#121212] rounded-xl flex items-center justify-center">
                <GamersGridLogo size={32} color="#5003BD" glow={true} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Install Gamers Grid</h3>
            <p className="text-[#aaaaaa] mb-8 leading-relaxed">
              Add Gamers Grid to your home screen for the full, immersive app experience. No browser bars, faster loading.
            </p>
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={install}
                className="w-full rounded-xl bg-[#5003BD] hover:bg-[#3d0291] py-4 text-sm font-bold text-white transition-colors shadow-[0_0_15px_rgba(80,3,189,0.4)]"
              >
                INSTALL APP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Install Prompt Overlay */}
      {(!isInstalled && isIOS && !showIOSGuide && !dismissInstall) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-[#1c1c1f] border border-[#5003BD]/30 p-8 shadow-[0_0_50px_rgba(80,3,189,0.15)] animate-in zoom-in-95 duration-300 flex flex-col items-center text-center relative">
            <button 
              onClick={() => setDismissInstall(true)}
              className="absolute top-4 right-4 text-[#888888] hover:text-white transition-colors"
            >
              ✕
            </button>
            <div className="w-16 h-16 bg-gradient-to-tr bg-[#5003BD] rounded-2xl p-1 shadow-lg mb-6">
              <div className="w-full h-full bg-[#121212] rounded-xl flex items-center justify-center">
                <GamersGridLogo size={32} color="#5003BD" glow={true} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Install Gamers Grid</h3>
            <p className="text-[#aaaaaa] mb-8 leading-relaxed">
              Add Gamers Grid to your iOS home screen for the full native app experience.
            </p>
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => setShowIOSGuide(true)}
                className="w-full rounded-xl bg-[#5003BD] hover:bg-[#3d0291] py-4 text-sm font-bold text-white transition-colors shadow-[0_0_15px_rgba(80,3,189,0.4)]"
              >
                HOW TO INSTALL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      {!isChatActive && (
        <nav className="fixed bottom-0 w-full bg-[#888888]/10 backdrop-blur-2xl rounded-t-3xl border-t border-white/10 shadow-2xl flex items-center justify-evenly px-2 h-16 z-50">
          {[
            { id: 'home', icon: Home },
            { id: 'search', icon: Search },
            { id: 'create', icon: Plus },
            { id: 'messages', icon: MessageSquare },
            { id: 'tournaments', icon: Trophy }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className="relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300"
              >
                {isActive && (
                  <div className="absolute inset-0 bg-[#5003BD] rounded-full shadow-[0_0_15px_rgba(80,3,189,0.5)]"></div>
                )}
                <Icon 
                  className={`relative z-10 w-6 h-6 transition-colors ${isActive ? 'text-white' : 'text-[#aaaaaa] hover:text-white'}`} 
                  strokeWidth={isActive ? 2.5 : 2} 
                />
                {/* Red dot and number for unread messages */}
                {tab.id === 'messages' && unreadMessagesCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[19px] h-[19px] px-1 bg-red-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-[#121212] shadow-[0_0_8px_rgba(220,38,38,0.7)] z-20 animate-in zoom-in">
                    {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      )}

      {/* iOS Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl bg-[#1c1c1f] border border-[#2a2a2e] p-8 shadow-2xl animate-in slide-in-from-bottom-4">
            <h3 className="text-xl font-bold text-white mb-4">Install on iPhone / iPad</h3>
            <p className="text-[15px] text-[#aaaaaa] mb-8 leading-relaxed">
              1. Tap the <strong className="text-white">Share</strong> button in your Safari toolbar at the bottom.<br/><br/>
              2. Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
            </p>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-[#2a2a2e] hover:bg-[#383842] py-4 text-sm font-bold text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
