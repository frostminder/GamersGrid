import React, { useState } from 'react';
import { 
  X, Coins, Gem, CreditCard, Sparkles, Check, ArrowUpRight, ArrowDownLeft, 
  ShieldCheck, Crown, Zap, Gift, History, DollarSign 
} from 'lucide-react';
import { WalletState } from '../types/mockData';

interface WalletModalProps {
  wallet: WalletState;
  onClose: () => void;
  onAddCoins: (amount: number, description: string) => void;
  onTogglePremium: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  wallet,
  onClose,
  onAddCoins,
  onTogglePremium,
}) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'premium' | 'history'>('shop');
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const coinPackages = [
    { coins: 500, price: '$4.99', popular: false, label: 'Host Starter (500 Coins)' },
    { coins: 1100, price: '$9.99', popular: true, label: 'Pro Pack (+100 Bonus)' },
    { coins: 2500, price: '$19.99', popular: false, label: 'Tournament Grinder (+500 Bonus)' },
    { coins: 6500, price: '$49.99', popular: false, label: 'Clan Vault (+1,500 Bonus)' },
  ];

  const handleBuyCoins = (coins: number, label: string) => {
    setSelectedPack(coins);
    setTimeout(() => {
      onAddCoins(coins, `Purchased ${label}`);
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        setSelectedPack(null);
      }, 1500);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#232323] border border-[#5003BD] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-b from-[#5003BD]/30 to-[#232323] border-b border-[#2A2A2E] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#5003BD] flex items-center justify-center text-white shadow-lg shadow-[#5003BD]/50">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-gaming text-xl font-black text-white uppercase tracking-wider">
                Gamers Grid Economy
              </h2>
              <span className="text-[11px] text-[#999999]">Two-Currency Virtual Wallet & Pass</span>
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-full text-[#999999] hover:text-white hover:bg-[#2A2A2E]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency Balance Header Card */}
        <div className="p-5 grid grid-cols-2 gap-3 bg-[#181818] border-b border-[#2A2A2E]">
          {/* Grid Coins */}
          <div className="p-3.5 rounded-2xl bg-[#232323] border border-amber-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                <span>Grid Coins</span>
              </span>
              <span className="text-[10px] text-[#888888] font-mono-uid">Real Currency</span>
            </div>
            <div className="text-2xl font-black text-white font-mono-uid">
              {wallet.gridCoins.toLocaleString()}
            </div>
            <span className="text-[10px] text-[#999999]">Used for Tournament Entry & Host Fees</span>
          </div>

          {/* Grid Shards */}
          <div className="p-3.5 rounded-2xl bg-[#232323] border border-cyan-500/40 relative overflow-hidden">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                <Gem className="w-3.5 h-3.5" />
                <span>Grid Shards</span>
              </span>
              <span className="text-[10px] text-[#888888] font-mono-uid">Earned</span>
            </div>
            <div className="text-2xl font-black text-white font-mono-uid">
              {wallet.gridShards.toLocaleString()}
            </div>
            <span className="text-[10px] text-[#999999]">Earned via challenges & clip views</span>
          </div>
        </div>

        {/* Tabs: Shop / Premium / History */}
        <div className="flex border-b border-[#2A2A2E] bg-[#121212] px-5 pt-2">
          <button
            onClick={() => setActiveTab('shop')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors cursor-pointer relative ${
              activeTab === 'shop' ? 'text-white' : 'text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            Coin Packs
            {activeTab === 'shop' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5003BD]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('premium')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors cursor-pointer relative ${
              activeTab === 'premium' ? 'text-white' : 'text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            Premium Pass ($4.99/mo)
            {activeTab === 'premium' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5003BD]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 text-xs font-bold transition-colors cursor-pointer relative ${
              activeTab === 'history' ? 'text-white' : 'text-[#888888] hover:text-[#CCCCCC]'
            }`}
          >
            Transaction History
            {activeTab === 'history' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5003BD]" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {paymentSuccess && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center gap-2 text-emerald-300 text-xs font-bold animate-in fade-in">
              <Check className="w-4 h-4" />
              <span>Payment Successful! Grid Coins credited to your wallet.</span>
            </div>
          )}

          {activeTab === 'shop' && (
            <div className="space-y-3">
              <div className="text-xs text-[#999999] flex items-center justify-between">
                <span>Select a Grid Coins package:</span>
                <span className="text-[10px] text-[#777777]">Global (Stripe) & Regional (Paystack)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {coinPackages.map((pack) => (
                  <div
                    key={pack.coins}
                    className={`p-4 rounded-2xl bg-[#121212] border transition-all relative cursor-pointer ${
                      pack.popular
                        ? 'border-[#5003BD] shadow-lg shadow-[#5003BD]/20 bg-gradient-to-b from-[#5003BD]/10 to-[#121212]'
                        : 'border-[#2A2A2E] hover:border-[#5003BD]/50'
                    }`}
                  >
                    {pack.popular && (
                      <span className="absolute -top-2 right-3 bg-[#5003BD] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                        MOST POPULAR
                      </span>
                    )}

                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold font-mono-uid text-lg">
                        <Coins className="w-4 h-4" />
                        <span>{pack.coins.toLocaleString()}</span>
                      </div>
                      <span className="text-sm font-bold text-white font-mono-uid">{pack.price}</span>
                    </div>

                    <p className="text-[11px] text-[#888888] mb-3">{pack.label}</p>

                    <button
                      onClick={() => handleBuyCoins(pack.coins, pack.label)}
                      disabled={selectedPack !== null}
                      className="w-full py-2 bg-[#232323] hover:bg-[#5003BD] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer border border-[#2A2A2E] hover:border-[#5003BD]"
                    >
                      {selectedPack === pack.coins ? 'Processing...' : `Buy for ${pack.price}`}
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-[#121212] border border-[#2A2A2E] text-[11px] text-[#777777] leading-relaxed">
                🛡️ <strong>Secure Closed-Loop Economy:</strong> Grid Coins are protected by SSL encryption. Host fees (500 coins) and seat entry fees (100 coins) are automated.
              </div>
            </div>
          )}

          {activeTab === 'premium' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-[#5003BD]/40 via-[#232323] to-[#121212] border border-[#7A22EC]/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown className="w-6 h-6 text-amber-400" />
                    <h3 className="font-gaming text-xl font-black text-white uppercase">
                      Gamers Grid PRO
                    </h3>
                  </div>
                  <span className="text-lg font-black text-white font-mono-uid">$4.99 / mo</span>
                </div>

                <p className="text-xs text-[#CCCCCC]">
                  The essential subscription for competitive tournament hosts, creators, and hardcore clans.
                </p>

                <div className="space-y-2 pt-2 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-2 text-white">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Host unlimited community esports tournaments</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Zero ads across all highlight feeds & clips</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Exclusive animated gradient avatar rings & PRO badge</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Double Grid Shard multipliers on daily clip views</span>
                  </div>
                </div>

                <button
                  onClick={onTogglePremium}
                  className="w-full py-3 bg-[#5003BD] hover:bg-[#7A22EC] text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-[#5003BD]/50 cursor-pointer mt-2"
                >
                  {wallet.isPremium ? 'Active Membership (Manage / Renew)' : 'Upgrade to PRO for $4.99/mo'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2 text-xs">
              {wallet.transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-[#121212] border border-[#2A2A2E] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      tx.amount > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {tx.amount > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-bold text-white text-xs">{tx.description}</p>
                      <span className="text-[10px] text-[#777777]">{tx.timestamp}</span>
                    </div>
                  </div>

                  <div className="text-right font-mono-uid font-bold text-sm">
                    <span className={tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                    </span>
                    <span className="text-[10px] text-[#888888] block uppercase">
                      {tx.currency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
