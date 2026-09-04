import React, { useState } from 'react';
import { 
  Trophy, Users, Shield, Play, Plus, Search, CheckCircle2, AlertTriangle, 
  Scan, Upload, Shuffle, ChevronRight, Lock, Key, Coins, Info, X, Ban, Sparkles, ArrowLeft
} from 'lucide-react';
import { Tournament, TournamentPlayer, TournamentMatch, CURRENT_USER, WalletState } from '../types/mockData';

interface TournamentHubProps {
  tournaments: Tournament[];
  wallet: WalletState;
  onJoinTournament: (tournamentId: string, ign: string, uid: string, screenshotUrl: string) => void;
  onOpenWallet: () => void;
  onBack?: () => void;
}

export const TournamentHub: React.FC<TournamentHubProps> = ({
  tournaments,
  wallet,
  onJoinTournament,
  onOpenWallet,
  onBack,
}) => {
  const [selectedTournament, setSelectedTournament] = useState<Tournament>(tournaments[0]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [showBracketModal, setShowBracketModal] = useState(false);
  
  // Registration form state
  const [inGameName, setInGameName] = useState(CURRENT_USER.username);
  const [uidInput, setUidInput] = useState(CURRENT_USER.linkedAccounts?.bloodStrikeUid || 'BS-884920194');
  const [screenshotUploaded, setScreenshotUploaded] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  // OCR Room Verification simulation state
  const [ocrStep, setOcrStep] = useState<'idle' | 'scanning' | 'results'>('idle');
  const [ocrResults, setOcrResults] = useState<{
    detectedUids: string[];
    verifiedSeats: number;
    flaggedMismatches: { uid: string; name: string; reason: string }[];
  }>({
    detectedUids: [],
    verifiedSeats: 0,
    flaggedMismatches: [],
  });
  const [kickLogs, setKickLogs] = useState<string[]>([]);
  const [roomCodeReleased, setRoomCodeReleased] = useState(false);

  // Bracket generator state
  const [bracketMatches, setBracketMatches] = useState<TournamentMatch[]>([]);

  // Function to run the Bracket Randomizer with Power-of-2 Byes handling (Section 5 Roadmap)
  const generateBracket = (roster: TournamentPlayer[]) => {
    // 1. Shuffle roster randomly
    const shuffled = [...roster].sort(() => Math.random() - 0.5);
    const count = shuffled.length;
    
    // Find next power of 2 (e.g. 4, 8, 16, 32)
    let powerOfTwo = 2;
    while (powerOfTwo < count) {
      powerOfTwo *= 2;
    }
    const numByes = powerOfTwo - count;

    const matches: TournamentMatch[] = [];
    let matchIdx = 1;
    let playerIdx = 0;

    // First round pairings
    while (playerIdx < shuffled.length) {
      const p1 = shuffled[playerIdx];
      // If we have remaining byes, p1 gets a bye
      if (matches.length < numByes) {
        matches.push({
          id: `m_r1_${matchIdx}`,
          round: 1,
          matchNumber: matchIdx,
          player1: p1,
          player2: undefined,
          winnerId: p1.userId,
          score1: 1,
          score2: 0,
          isBye: true,
          status: 'completed',
        });
        playerIdx += 1;
      } else {
        const p2 = shuffled[playerIdx + 1];
        matches.push({
          id: `m_r1_${matchIdx}`,
          round: 1,
          matchNumber: matchIdx,
          player1: p1,
          player2: p2,
          winnerId: undefined,
          status: 'upcoming',
        });
        playerIdx += 2;
      }
      matchIdx++;
    }

    setBracketMatches(matches);
    setShowBracketModal(true);
  };

  // Run OCR verification simulation
  const startOcrScan = () => {
    setOcrStep('scanning');
    setTimeout(() => {
      setOcrStep('results');
      setOcrResults({
        detectedUids: [
          'BS-991204812',
          'BS-884920194',
          'BS-771920031',
          'BS-663819204',
          'BS-999999999', // Mismatch!
          'BS-551092834',
          'BS-441928371',
        ],
        verifiedSeats: 6,
        flaggedMismatches: [
          {
            uid: 'BS-999999999',
            name: 'Sneaky_Bot_99 (Room: DifferentName_X)',
            reason: 'UID mismatch detected between submitted evidence (BS-123456789) and in-lobby OCR text (BS-999999999)',
          },
        ],
      });
    }, 1800);
  };

  const handleKickSeat = (name: string, reason: string) => {
    setKickLogs((prev) => [...prev, `[ENFORCED] Kicked ${name} - Reason: ${reason} (Room-scoped block, Final/No Appeal)`]);
    setOcrResults((prev) => ({
      ...prev,
      flaggedMismatches: prev.flaggedMismatches.filter((item) => item.name !== name),
    }));
  };

  const handleReleaseRoomCode = () => {
    setRoomCodeReleased(true);
  };

  const handleCompleteRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (wallet.gridCoins < selectedTournament.entryFeeCoins) {
      alert('Insufficient Grid Coins. Please top up your wallet.');
      onOpenWallet();
      return;
    }
    onJoinTournament(
      selectedTournament.id,
      inGameName,
      uidInput,
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&auto=format&fit=crop&q=80'
    );
    setRegisterSuccess(true);
    setTimeout(() => {
      setRegisterSuccess(false);
      setShowRegisterModal(false);
    }, 1600);
  };

  return (
    <div className="space-y-4 pb-24 pt-0">
      {/* 1. Header Banner: Esports Tournaments Hub */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#5003BD] via-[#350280] to-[#121212] p-5 sm:p-6 border border-[#7A22EC]/40 shadow-xl">
        <div className="relative z-10 max-w-xl space-y-2">
          <div className="flex items-center gap-2">
            {onBack && (
              <button
                onClick={onBack}
                className="p-1 rounded-lg bg-black/40 hover:bg-black/60 text-white transition-colors cursor-pointer border border-white/10"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-bold border border-amber-300/30">
              <Trophy className="w-3.5 h-3.5" />
              <span>Community Esports & Wagers</span>
            </div>
          </div>
          <h1 className="font-gaming text-2xl sm:text-3xl font-extrabold text-white tracking-wide uppercase">
            Official Tournament Engine
          </h1>
          <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed">
            Host or join zero-cheat tournaments with automated OCR lobby verification, bracket randomizer with power-of-2 byes, and prize pools paid in Grid Coins.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 font-mono-uid">
              <span className="text-[#999999]">Host Fee:</span>
              <span className="font-bold text-amber-400">500 Coins</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 font-mono-uid">
              <span className="text-[#999999]">Entry Fee:</span>
              <span className="font-bold text-cyan-400">100 Coins / Seat</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-[#999999]">Verification:</span>
              <span className="font-bold text-emerald-400">OCR Lobby AI</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tournament List Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {tournaments.map((t) => {
          const isSelected = selectedTournament.id === t.id;
          return (
            <div
              key={t.id}
              onClick={() => setSelectedTournament(t)}
              className={`rounded-2xl p-4 transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-[#282828] border-[#5003BD] shadow-lg shadow-[#5003BD]/20 ring-1 ring-[#7A22EC]'
                  : 'bg-[#232323] border-[#2A2A2E] hover:border-[#5003BD]/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A22EC] bg-[#121212] px-2 py-0.5 rounded border border-[#2A2A2E]">
                    {t.game} • {t.teamSize}
                  </span>
                  <h3 className="font-gaming text-lg font-bold text-white mt-1 leading-tight">
                    {t.title}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-400 font-bold font-mono-uid text-sm">
                    <Coins className="w-3.5 h-3.5" />
                    <span>{t.prizePoolCoins}</span>
                  </div>
                  <span className="text-[10px] text-[#888888]">Prize Pool</span>
                </div>
              </div>

              {/* Progress Bar of seats */}
              <div className="space-y-1 my-3">
                <div className="flex justify-between text-xs text-[#999999]">
                  <span>Seats: {t.registeredCount}/{t.maxSeats}</span>
                  <span className="text-emerald-400 font-semibold">{t.status}</span>
                </div>
                <div className="w-full h-1.5 bg-[#121212] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#5003BD] to-cyan-400 rounded-full"
                    style={{ width: `${(t.registeredCount / t.maxSeats) * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#CCCCCC] pt-2 border-t border-[#2A2A2E]">
                <span>Start: {t.startDate}</span>
                <span className="font-bold text-white">100 Coins Entry</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Detailed View for Selected Tournament */}
      <div className="bg-[#232323] rounded-2xl p-5 border border-[#5003BD]/50 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A2A2E]">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#5003BD] text-white">
                {selectedTournament.game}
              </span>
              <span className="text-xs text-[#999999]">
                Format: <strong className="text-white">{selectedTournament.format}</strong>
              </span>
            </div>
            <h2 className="font-gaming text-2xl font-black text-white mt-1">
              {selectedTournament.title}
            </h2>
            <p className="text-xs text-[#999999] mt-0.5">
              Host: <span className="text-purple-300 font-semibold">@{selectedTournament.host.username}</span> • Seats: {selectedTournament.registeredCount}/{selectedTournament.maxSeats} Paid & Evidence Locked
            </p>
          </div>

          {/* Action Buttons: Register, View Bracket, Run OCR */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowRegisterModal(true)}
              id="join-tournament-btn"
              className="px-4 py-2 rounded-xl bg-[#5003BD] hover:bg-[#7A22EC] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#5003BD]/30 cursor-pointer transition-all"
            >
              <Users className="w-4 h-4" />
              <span>Join Seat (100 Coins)</span>
            </button>

            <button
              onClick={() => generateBracket(selectedTournament.roster)}
              id="view-bracket-btn"
              className="px-3.5 py-2 rounded-xl bg-[#121212] hover:bg-[#282828] text-white border border-[#2A2A2E] font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Shuffle className="w-4 h-4 text-cyan-400" />
              <span>Randomize Bracket</span>
            </button>

            <button
              onClick={() => setShowOcrModal(true)}
              id="ocr-verify-btn"
              className="px-3.5 py-2 rounded-xl bg-[#121212] hover:bg-[#282828] text-emerald-400 border border-emerald-500/30 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Scan className="w-4 h-4" />
              <span>OCR Lobby Check</span>
            </button>
          </div>
        </div>

        {/* Locked Roster Table with Evidence status */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#7A22EC]" />
              <h3 className="font-gaming text-base font-bold uppercase tracking-wider text-white">
                Locked Roster & Evidence Verification
              </h3>
            </div>
            <span className="text-xs text-[#888888]">
              IGN + UID screenshot submitted before payment
            </span>
          </div>

          <div className="space-y-2">
            {selectedTournament.roster.map((player, idx) => (
              <div
                key={player.userId}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-[#121212] border border-[#2A2A2E] hover:border-[#5003BD]/40 transition-colors gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-bold text-xs text-[#777777] font-mono-uid">
                    #{idx + 1}
                  </span>
                  <img
                    src={player.avatar}
                    alt={player.username}
                    className="w-8 h-8 rounded-full object-cover border border-[#2A2A2E]"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">@{player.username}</span>
                      <span className="text-xs text-[#999999]">IGN: <strong className="text-purple-300">{player.inGameName}</strong></span>
                    </div>
                    <div className="text-[11px] text-[#777777] font-mono-uid">
                      UID: {player.uid}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono-uid font-bold">
                    100 Coins Paid
                  </span>

                  {player.status === 'verified' ? (
                    <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verified</span>
                    </div>
                  ) : player.status === 'mismatch' ? (
                    <div className="flex items-center gap-1 text-red-400 text-xs font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Flagged Mismatch</span>
                    </div>
                  ) : (
                    <span className="text-amber-400 text-xs">Pending OCR</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL 1: Registration with IGN/UID Timestamped Evidence (Roadmap Section 5) */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#232323] border border-[#5003BD] rounded-2xl w-full max-w-md p-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2E] mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#7A22EC]" />
                <h3 className="font-gaming text-lg font-bold text-white uppercase tracking-wider">
                  Tournament Registration
                </h3>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="text-[#999999] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {registerSuccess ? (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto animate-bounce" />
                <h4 className="font-gaming text-xl font-bold text-white">Seat Confirmed & Evidence Locked!</h4>
                <p className="text-xs text-[#CCCCCC]">
                  100 Grid Coins deducted. Your IGN & UID evidence has been timestamped for OCR pre-match verification.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCompleteRegistration} className="space-y-4 text-xs">
                <div className="p-3 bg-[#121212] rounded-xl border border-[#5003BD]/30 space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>{selectedTournament.title}</span>
                    <span className="text-amber-400 font-mono-uid">100 Grid Coins</span>
                  </div>
                  <p className="text-[11px] text-[#888888]">
                    Your wallet balance: <strong className="text-white">{wallet.gridCoins} Coins</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-[#CCCCCC] font-bold mb-1">
                    1. Exact In-Game Name (IGN)
                  </label>
                  <input
                    type="text"
                    required
                    value={inGameName}
                    onChange={(e) => setInGameName(e.target.value)}
                    placeholder="e.g. Viper_GG"
                    className="w-full bg-[#121212] text-white p-2.5 rounded-xl border border-[#2A2A2E] focus:border-[#5003BD] focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[#CCCCCC] font-bold mb-1">
                    2. In-Game UID (Copied from Game Profile)
                  </label>
                  <input
                    type="text"
                    required
                    value={uidInput}
                    onChange={(e) => setUidInput(e.target.value)}
                    placeholder="e.g. BS-884920194"
                    className="w-full bg-[#121212] text-white p-2.5 rounded-xl border border-[#2A2A2E] focus:border-[#5003BD] focus:outline-none font-mono-uid text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[#CCCCCC] font-bold mb-1">
                    3. Screenshot Evidence of In-Game Profile / UID
                  </label>
                  <div 
                    onClick={() => setScreenshotUploaded(true)}
                    className="border-2 border-dashed border-[#5003BD]/50 hover:border-[#5003BD] rounded-xl p-4 text-center bg-[#121212] cursor-pointer transition-colors"
                  >
                    <Upload className="w-6 h-6 text-[#7A22EC] mx-auto mb-1.5" />
                    {screenshotUploaded ? (
                      <div className="text-emerald-400 font-bold flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Screenshot attached: profile_bs_evidence.jpg</span>
                      </div>
                    ) : (
                      <>
                        <span className="text-white font-semibold block">Click to upload screenshot evidence</span>
                        <span className="text-[10px] text-[#777777]">Committed, timestamped proof prevents smurfing & false accounts</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-[10px] text-[#888888] bg-[#121212] p-2.5 rounded-lg border border-[#2A2A2E]">
                  ⚠️ <strong>Rules:</strong> Each seat is paid individually. Roster locks once all seats are verified. Mismatches during OCR lobby scanning result in forfeiture with no appeal.
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#5003BD] hover:bg-[#7A22EC] text-white font-bold rounded-xl transition-all shadow-lg shadow-[#5003BD]/40 text-sm cursor-pointer"
                >
                  Confirm & Pay 100 Grid Coins
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: Automated OCR Room Verification Pipeline Simulator (Roadmap Section 5) */}
      {showOcrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#232323] border border-emerald-500/50 rounded-2xl w-full max-w-lg p-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2E] mb-4">
              <div className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-gaming text-lg font-bold text-white uppercase tracking-wider">
                    OCR Lobby Verification Pipeline
                  </h3>
                  <span className="text-[10px] text-[#888888]">Google Cloud Vision / AWS Textract Engine Model</span>
                </div>
              </div>
              <button onClick={() => setShowOcrModal(false)} className="text-[#999999] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-[#121212] rounded-xl border border-[#2A2A2E]">
                <span className="text-white font-bold block mb-1">Host In-Game Lobby Screenshot:</span>
                <div className="relative rounded-lg overflow-hidden border border-[#5003BD]/50 aspect-[16/9] bg-black">
                  <img
                    src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80"
                    alt="In game lobby screenshot"
                    className="w-full h-full object-cover opacity-75"
                  />
                  {ocrStep === 'scanning' && (
                    <div className="absolute inset-0 bg-[#5003BD]/30 backdrop-blur-[2px] flex flex-col items-center justify-center space-y-2">
                      <div className="w-10 h-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-white font-mono-uid font-bold text-xs animate-pulse">
                        Scanning player text & parsing UIDs...
                      </span>
                    </div>
                  )}
                  {ocrStep === 'results' && (
                    <div className="absolute inset-0 p-2 pointer-events-none flex flex-col justify-between">
                      <div className="bg-black/80 backdrop-blur-md p-1.5 rounded text-[10px] text-emerald-400 font-mono-uid w-fit">
                        ✓ 7 UIDs Pattern Matched
                      </div>
                      <div className="bg-red-950/80 backdrop-blur-md p-1.5 rounded text-[10px] text-red-300 font-mono-uid w-fit">
                        ⚠️ 1 Mismatch Flagged: BS-999999999
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {ocrStep === 'idle' && (
                <button
                  onClick={startOcrScan}
                  className="w-full py-2.5 bg-[#5003BD] hover:bg-[#7A22EC] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Scan className="w-4 h-4" />
                  <span>Run Automated OCR Text Extraction</span>
                </button>
              )}

              {ocrStep === 'results' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-[#121212] border border-emerald-500/30">
                      <span className="text-[10px] text-[#888888] block">Verified Seats</span>
                      <span className="text-lg font-bold text-emerald-400 font-mono-uid">
                        {ocrResults.verifiedSeats} / 7
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#121212] border border-red-500/30">
                      <span className="text-[10px] text-[#888888] block">Flagged Discrepancies</span>
                      <span className="text-lg font-bold text-red-400 font-mono-uid">
                        {ocrResults.flaggedMismatches.length}
                      </span>
                    </div>
                  </div>

                  {ocrResults.flaggedMismatches.length > 0 ? (
                    <div className="p-3 bg-red-950/30 rounded-xl border border-red-500/40 space-y-2">
                      <div className="flex items-center gap-1 text-red-400 font-bold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Discrepancy Requiring Host Action</span>
                      </div>
                      {ocrResults.flaggedMismatches.map((m, idx) => (
                        <div key={idx} className="bg-[#121212] p-2.5 rounded-lg border border-red-500/30 space-y-2">
                          <p className="text-white font-bold">{m.name}</p>
                          <p className="text-[11px] text-[#CCCCCC]">{m.reason}</p>
                          <button
                            onClick={() => handleKickSeat(m.name, m.reason)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Enforce Room Kick & Log Reason</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-500/40 flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      <span>All lobby seats 100% verified against locked roster!</span>
                    </div>
                  )}

                  {/* Kick logs */}
                  {kickLogs.length > 0 && (
                    <div className="p-2.5 bg-[#121212] rounded-lg border border-[#2A2A2E] text-[10px] font-mono-uid text-[#AAAAAA] space-y-1">
                      <span className="text-[#888888] font-bold block uppercase">Host Audit Log:</span>
                      {kickLogs.map((log, i) => (
                        <div key={i} className="text-red-400">{log}</div>
                      ))}
                    </div>
                  )}

                  {/* Room code release trigger */}
                  <div className="pt-2 border-t border-[#2A2A2E]">
                    {roomCodeReleased ? (
                      <div className="p-3 bg-[#5003BD]/30 border border-[#7A22EC] rounded-xl text-center">
                        <div className="flex items-center justify-center gap-1 text-emerald-400 font-bold mb-1">
                          <Key className="w-4 h-4" />
                          <span>Room Code Released to Verified Players!</span>
                        </div>
                        <div className="font-mono-uid text-base font-bold text-white tracking-widest bg-black/60 py-1.5 px-3 rounded-lg inline-block border border-white/20">
                          {selectedTournament.roomCode} (Pass: {selectedTournament.roomPass})
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleReleaseRoomCode}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                      >
                        <Key className="w-4 h-4" />
                        <span>Authorize & Release Room Code to Roster</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Interactive Bracket Viewer with Power-of-2 Byes (Roadmap Section 5) */}
      {showBracketModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#232323] border border-[#5003BD] rounded-2xl w-full max-w-2xl p-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#2A2A2E] mb-4">
              <div className="flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-gaming text-lg font-bold text-white uppercase tracking-wider">
                    Bracket Randomizer with Power-of-2 Byes
                  </h3>
                  <span className="text-[10px] text-[#888888]">
                    Automatic seed shuffling & clean power-of-2 bye resolution
                  </span>
                </div>
              </div>
              <button onClick={() => setShowBracketModal(false)} className="text-[#999999] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3 bg-[#121212] rounded-xl border border-[#5003BD]/30 flex items-center justify-between text-xs">
                <span className="text-[#CCCCCC]">
                  Roster Count: <strong className="text-white">{selectedTournament.roster.length} Players</strong>
                </span>
                <span className="text-cyan-400 font-mono-uid font-bold">
                  Next Power of 2: 8 (1 Bye assigned)
                </span>
              </div>

              {/* Bracket Matches Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bracketMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-[#121212] rounded-xl border border-[#2A2A2E] space-y-2 relative"
                  >
                    <div className="flex justify-between text-[11px] text-[#777777] border-b border-[#2A2A2E] pb-1">
                      <span>Match #{m.matchNumber}</span>
                      {m.isBye ? (
                        <span className="text-amber-400 font-bold">AUTO-BYE (Round 1 Win)</span>
                      ) : (
                        <span className="text-cyan-400">Round 1</span>
                      )}
                    </div>

                    {/* Player 1 */}
                    <div className="flex items-center justify-between text-xs p-1.5 rounded bg-[#232323]">
                      <span className="font-bold text-white truncate max-w-[140px]">
                        {m.player1?.username || 'TBD'}
                      </span>
                      <span className="font-mono-uid text-xs font-bold text-purple-300">
                        {m.isBye ? 'BYE' : 'Seat A'}
                      </span>
                    </div>

                    {/* Player 2 */}
                    <div className="flex items-center justify-between text-xs p-1.5 rounded bg-[#232323]">
                      <span className="font-bold text-[#CCCCCC] truncate max-w-[140px]">
                        {m.player2?.username || (m.isBye ? '— [None: Bye Advancing] —' : 'TBD')}
                      </span>
                      <span className="font-mono-uid text-xs text-[#777777]">
                        {m.isBye ? '—' : 'Seat B'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-[#2A2A2E] flex justify-end">
                <button
                  onClick={() => generateBracket(selectedTournament.roster)}
                  className="px-4 py-2 bg-[#5003BD] hover:bg-[#7A22EC] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Re-Shuffle Seeds</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
