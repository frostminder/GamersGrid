import React, { useState } from 'react';
import { TopSearchBar } from '../components/TopSearchBar';
import { PillTabs } from '../components/PillTabs';
import { FeedCard } from '../components/FeedCard';
import { GlassBottomTabs, NavigationTab } from '../components/GlassBottomTabs';
import { TournamentHub } from '../components/TournamentHub';
import { ClipPlayerModal } from '../components/ClipPlayerModal';
import { WalletModal } from '../components/WalletModal';
import { ChatModal } from '../components/ChatModal';
import { ProfileDrawer } from '../components/ProfileDrawer';
import { 
  INITIAL_POSTS, MOCK_TOURNAMENTS, INITIAL_WALLET, INITIAL_CHATS, 
  CURRENT_USER, Post, Tournament, WalletState, ChatChannel 
} from '../types/mockData';
import { 
  Smartphone, Monitor, RotateCcw, Plus, Sparkles, Filter, 
  Flame, CheckCircle, Info 
} from 'lucide-react';

export const HomeScreen: React.FC = () => {
  // Navigation & View state
  const [navTab, setNavTab] = useState<NavigationTab>('home');
  const [activeCategoryTab, setActiveCategoryTab] = useState('for_you');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedFilter, setFeedFilter] = useState('all');
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'responsive'>('mobile');

  // Application Data States
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [tournaments, setTournaments] = useState<Tournament[]>(MOCK_TOURNAMENTS);
  const [wallet, setWallet] = useState<WalletState>(INITIAL_WALLET);
  const [chats, setChats] = useState<ChatChannel[]>(INITIAL_CHATS);
  const [currentUser, setCurrentUser] = useState(CURRENT_USER);

  // Viewed posts set for "For You" hard exclusion logic (Roadmap Section 3)
  const [viewedPostIds, setViewedPostIds] = useState<Set<string>>(new Set());

  // Modals & Drawers state
  const [activeClipModal, setActiveClipModal] = useState<Post | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showPostCreateToast, setShowPostCreateToast] = useState(false);

  // 1. Hard Exclusion "For You" Feed Filter Logic (Roadmap Section 3)
  const filteredPosts = posts.filter((post) => {
    // If active category is "For You", exclude already viewed posts unless search is active
    if (activeCategoryTab === 'for_you' && !searchQuery) {
      if (viewedPostIds.has(post.id)) return false;
    }

    // Category matching
    if (activeCategoryTab === 'following') {
      if (!post.creator.isFollowing) return false;
    } else if (activeCategoryTab === 'blood_strike') {
      if (post.gameCategory !== 'Blood Strike') return false;
    } else if (activeCategoryTab === 'warzone') {
      if (post.gameCategory !== 'Warzone') return false;
    } else if (activeCategoryTab === 'pubg_mobile') {
      if (post.gameCategory !== 'PUBG Mobile') return false;
    }

    // Search query matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title.toLowerCase().includes(q);
      const matchCaption = post.caption.toLowerCase().includes(q);
      const matchCreator = post.creator.username.toLowerCase().includes(q) || post.creator.displayName.toLowerCase().includes(q);
      const matchGame = post.game.toLowerCase().includes(q);
      const matchTag = post.tags.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchCaption && !matchCreator && !matchGame && !matchTag) return false;
    }

    // Additional filter dropdown
    if (feedFilter === 'verified') {
      if (!post.creator.isVerified) return false;
    } else if (feedFilter === 'under_1min') {
      if (post.duration.startsWith('1:') || post.duration.startsWith('2:')) return false;
    }

    return true;
  });

  // Action handlers
  const handleLikePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const isLiked = !p.isLiked;
          return {
            ...p,
            isLiked,
            likesCount: isLiked ? p.likesCount + 1 : p.likesCount - 1,
          };
        }
        return p;
      })
    );
  };

  const handleFollowUser = (userId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.creator.id === userId) {
          return {
            ...p,
            creator: {
              ...p.creator,
              isFollowing: !p.creator.isFollowing,
            },
          };
        }
        return p;
      })
    );
  };

  const handleSavePost = (postId: string) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isSaved: !p.isSaved } : p))
    );
  };

  const handleTipCoins = (post: Post) => {
    if (wallet.gridCoins < 50) {
      setShowWalletModal(true);
      return;
    }
    setWallet((prev) => ({
      ...prev,
      gridCoins: prev.gridCoins - 50,
      transactions: [
        {
          id: `tx_${Date.now()}`,
          type: 'purchase',
          amount: -50,
          currency: 'coins',
          description: `Tipped 50 Grid Coins to @${post.creator.username}`,
          timestamp: 'Just now',
        },
        ...prev.transactions,
      ],
    }));
    alert(`Tipped 50 Grid Coins to @${post.creator.username}! 🎉`);
  };

  const handleAddComment = (postId: string, text: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: [
              {
                id: `c_${Date.now()}`,
                user: currentUser,
                text,
                createdAt: 'Just now',
                likes: 0,
              },
              ...(p.comments || []),
            ],
          };
        }
        return p;
      })
    );
  };

  const handleAddCoins = (amount: number, description: string) => {
    setWallet((prev) => ({
      ...prev,
      gridCoins: prev.gridCoins + amount,
      transactions: [
        {
          id: `tx_${Date.now()}`,
          type: 'purchase',
          amount,
          currency: 'coins',
          description,
          timestamp: 'Just now',
        },
        ...prev.transactions,
      ],
    }));
  };

  const handleTogglePremium = () => {
    setWallet((prev) => ({
      ...prev,
      isPremium: !prev.isPremium,
    }));
  };

  const handleSendMessage = (channelId: string, text: string) => {
    const newMsg = {
      id: `msg_${Date.now()}`,
      sender: currentUser,
      text,
      timestamp: 'Just now',
    };

    setChats((prev) =>
      prev.map((ch) => {
        if (ch.id === channelId) {
          return {
            ...ch,
            lastMessage: text,
            lastTimestamp: 'Just now',
            messages: [...ch.messages, newMsg],
          };
        }
        return ch;
      })
    );
  };

  const handleJoinTournament = (
    tournamentId: string,
    ign: string,
    uid: string,
    screenshotUrl: string
  ) => {
    // Deduct 100 Grid Coins
    setWallet((prev) => ({
      ...prev,
      gridCoins: prev.gridCoins - 100,
      transactions: [
        {
          id: `tx_${Date.now()}`,
          type: 'tournament_entry',
          amount: -100,
          currency: 'coins',
          description: 'Tournament Seat Entry Fee',
          timestamp: 'Just now',
        },
        ...prev.transactions,
      ],
    }));

    // Add to roster
    setTournaments((prev) =>
      prev.map((t) => {
        if (t.id === tournamentId) {
          const newPlayer = {
            userId: currentUser.id,
            username: currentUser.username,
            avatar: currentUser.avatar,
            inGameName: ign,
            uid,
            ignScreenshotUrl: screenshotUrl,
            isPaid: true,
            status: 'verified' as const,
            seed: t.roster.length + 1,
          };
          return {
            ...t,
            registeredCount: t.registeredCount + 1,
            roster: [...t.roster, newPlayer],
          };
        }
        return t;
      })
    );
  };

  const handleResetForYouViews = () => {
    setViewedPostIds(new Set());
  };

  const markPostAsViewed = (postId: string) => {
    setViewedPostIds((prev) => new Set([...prev, postId]));
  };

  const handleUpdateLinkedAccounts = (bsUid: string, wzTag: string, pubgId: string) => {
    setCurrentUser((prev) => ({
      ...prev,
      linkedAccounts: {
        bloodStrikeUid: bsUid,
        warzoneTag: wzTag,
        pubgId,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center">
      {/* Top Device Viewport Switcher Toolbar */}
      <div className="w-full bg-[#181818] border-b border-[#2A2A2E] px-4 py-2 flex items-center justify-between text-xs text-[#999999] z-30">
        <div className="flex items-center gap-2">
          <span className="font-gaming font-bold text-white uppercase tracking-wider">
            Gamers Grid Simulator
          </span>
          <span className="hidden sm:inline bg-[#5003BD]/50 text-purple-200 text-[10px] font-mono-uid px-2 py-0.5 rounded">
            Phase 1 UI Ready
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Device toggle */}
          <div className="flex items-center bg-[#121212] p-0.5 rounded-lg border border-[#2A2A2E]">
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                deviceMode === 'mobile' ? 'bg-[#5003BD] text-white font-bold' : 'text-[#888888] hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="text-[11px]">Mobile Phone Frame</span>
            </button>
            <button
              onClick={() => setDeviceMode('responsive')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
                deviceMode === 'responsive' ? 'bg-[#5003BD] text-white font-bold' : 'text-[#888888] hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="text-[11px]">Full Responsive View</span>
            </button>
          </div>

          {/* Reset For-You Filter Button */}
          {activeCategoryTab === 'for_you' && (
            <button
              onClick={handleResetForYouViews}
              className="flex items-center gap-1 text-[11px] text-[#7A22EC] hover:text-purple-300 transition-colors cursor-pointer"
              title="Reset viewed post history to re-populate For You feed"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset "For You" Views ({viewedPostIds.size})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container: either simulated iPhone container or full responsive width */}
      <div 
        className={`w-full transition-all duration-300 relative flex flex-col ${
          deviceMode === 'mobile'
            ? 'max-w-[440px] my-4 sm:my-6 rounded-[36px] border-[6px] border-[#2A2A2E] shadow-2xl bg-[#121212] min-h-[850px] overflow-hidden'
            : 'max-w-4xl px-4 py-4'
        }`}
      >
        {/* Top Search Bar & Currency Header */}
        <TopSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          wallet={wallet}
          onOpenWallet={() => setShowWalletModal(true)}
          selectedFilter={feedFilter}
          onSelectFilter={setFeedFilter}
        />

        {/* Category Pill Tabs */}
        <PillTabs
          activeTab={activeCategoryTab}
          onTabChange={(tabId) => {
            setActiveCategoryTab(tabId);
            if (tabId === 'tournaments') {
              setNavTab('tournaments');
            } else {
              setNavTab('home');
            }
          }}
        />

        {/* View Switcher based on Bottom Nav */}
        <main className="flex-1 px-3 sm:px-4 py-4">
          {navTab === 'home' || navTab === 'clips' ? (
            <div className="space-y-4 pb-28">
              {/* Filter notification indicator if For You active */}
              {activeCategoryTab === 'for_you' && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#232323] border border-[#5003BD]/30 text-xs text-[#999999]">
                  <div className="flex items-center gap-1.5 text-purple-300">
                    <Flame className="w-3.5 h-3.5 text-[#7A22EC]" />
                    <span className="font-bold">"For You" Hard-Exclusion Active</span>
                  </div>
                  <span className="text-[10px] text-[#777777]">
                    {viewedPostIds.size} viewed hidden
                  </span>
                </div>
              )}

              {/* Feed List: Single vertical column, full-width cards per row (Roadmap Section 2) */}
              {filteredPosts.length === 0 ? (
                <div className="text-center py-16 space-y-3 bg-[#232323] rounded-2xl border border-[#2A2A2E] p-6">
                  <div className="w-12 h-12 rounded-full bg-[#5003BD]/20 text-[#7A22EC] flex items-center justify-center mx-auto">
                    <Info className="w-6 h-6" />
                  </div>
                  <h3 className="font-gaming text-lg font-bold text-white">No Clips in this Feed</h3>
                  <p className="text-xs text-[#999999] max-w-xs mx-auto">
                    All clips for this category have either been viewed or filtered. Tap reset to replay highlight reels!
                  </p>
                  <button
                    onClick={handleResetForYouViews}
                    className="px-4 py-2 rounded-xl bg-[#5003BD] hover:bg-[#7A22EC] text-white font-bold text-xs cursor-pointer"
                  >
                    Reset "For You" Feed History
                  </button>
                </div>
              ) : (
                filteredPosts.map((post) => (
                  <FeedCard
                    key={post.id}
                    post={post}
                    onLike={handleLikePost}
                    onFollow={handleFollowUser}
                    onOpenComments={(p) => {
                      markPostAsViewed(p.id);
                      setActiveClipModal(p);
                    }}
                    onOpenClipModal={(p) => {
                      markPostAsViewed(p.id);
                      setActiveClipModal(p);
                    }}
                    onTipCoins={handleTipCoins}
                    onSave={handleSavePost}
                  />
                ))
              )}
            </div>
          ) : navTab === 'tournaments' ? (
            <TournamentHub
              tournaments={tournaments}
              wallet={wallet}
              onJoinTournament={handleJoinTournament}
              onOpenWallet={() => setShowWalletModal(true)}
            />
          ) : navTab === 'chat' ? (
            <ChatModal
              channels={chats}
              onSendMessage={handleSendMessage}
            />
          ) : (
            <ProfileDrawer
              user={currentUser}
              wallet={wallet}
              posts={posts}
              onClose={() => setNavTab('home')}
              onOpenWallet={() => setShowWalletModal(true)}
              onUpdateLinkedAccounts={handleUpdateLinkedAccounts}
            />
          )}
        </main>

        {/* Floating Glassmorphic Bottom Navigation Bar */}
        <GlassBottomTabs
          activeTab={navTab}
          onSelectTab={(tab) => {
            setNavTab(tab);
            if (tab === 'tournaments') {
              setActiveCategoryTab('tournaments');
            }
          }}
          unreadChatCount={3}
          liveTournamentCount={2}
        />
      </div>

      {/* Full-Screen Immersive Clip Player Modal */}
      {activeClipModal && (
        <ClipPlayerModal
          post={activeClipModal}
          onClose={() => setActiveClipModal(null)}
          onLike={handleLikePost}
          onFollow={handleFollowUser}
          onAddComment={handleAddComment}
          onTipCoins={handleTipCoins}
          onSave={handleSavePost}
        />
      )}

      {/* Virtual Economy & Wallet Modal */}
      {showWalletModal && (
        <WalletModal
          wallet={wallet}
          onClose={() => setShowWalletModal(false)}
          onAddCoins={handleAddCoins}
          onTogglePremium={handleTogglePremium}
        />
      )}
    </div>
  );
};
