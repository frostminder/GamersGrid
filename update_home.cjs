const fs = require('fs');
let file = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

file = file.replace(/const \[loadingPosts, setLoadingPosts\] = useState<boolean>\(true\);/, "const [loadingPosts, setLoadingPosts] = useState<boolean>(true);\n  const [feedTab, setFeedTab] = useState<'foryou' | 'following'>('foryou');");

const replacement = `{activeTab === 'home' && (
          <div className="flex flex-col gap-6">
            <div className="flex bg-[#1a1a1a] p-1 rounded-xl w-full max-w-sm mx-auto border border-[#2a2a2e]">
              <button 
                onClick={() => setFeedTab('foryou')}
                className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-colors \${feedTab === 'foryou' ? 'bg-[#5003BD] text-white' : 'text-[#888888] hover:text-white'}\`}
              >
                For You
              </button>
              <button 
                onClick={() => setFeedTab('following')}
                className={\`flex-1 py-2 text-sm font-bold rounded-lg transition-colors \${feedTab === 'following' ? 'bg-[#5003BD] text-white' : 'text-[#888888] hover:text-white'}\`}
              >
                Following
              </button>
            </div>
            {/* Community Highlights & Clips Feed Section */}
            <div className="flex flex-col gap-4">
              {loadingPosts ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-2 border-[#5003BD] border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[#888888] text-xs font-mono">LOADING CLIPS...</span>
                </div>
              ) : (feedTab === 'foryou' ? postsList : postsList.filter((p: any) => p.creator.isFollowing)).length === 0 ? (
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
                  {(feedTab === 'foryou' ? postsList : postsList.filter((p: any) => p.creator.isFollowing)).map((post) => (
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
        )}`;

file = file.replace(/\{activeTab === 'home' && \([\s\S]*?\}\s*<\/div>\s*<\/div>\s*\)\}/, replacement);
fs.writeFileSync('src/screens/HomeScreen.tsx', file);
