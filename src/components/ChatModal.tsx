import React, { useState } from 'react';
import { 
  MessageSquare, Send, Shield, Sparkles, Trophy, Users, Search, 
  ChevronRight, Circle, CheckCheck, X 
} from 'lucide-react';
import { ChatChannel, CURRENT_USER, User } from '../types/mockData';

interface ChatModalProps {
  channels: ChatChannel[];
  onSendMessage: (channelId: string, text: string) => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  channels,
  onSendMessage,
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string>(channels[0]?.id || '');
  const [inputText, setInputText] = useState('');
  const [channelSearch, setChannelSearch] = useState('');

  const activeChannel = channels.find((c) => c.id === selectedChannelId) || channels[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChannel) return;
    onSendMessage(activeChannel.id, inputText.trim());
    setInputText('');
  };

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(channelSearch.toLowerCase()) ||
    c.game.toLowerCase().includes(channelSearch.toLowerCase())
  );

  return (
    <div className="bg-[#232323] rounded-2xl border border-[#2A2A2E] overflow-hidden flex flex-col md:flex-row h-[75vh] shadow-2xl mb-24">
      {/* Left Sidebar: Channel List */}
      <div className="w-full md:w-72 bg-[#181818] border-r border-[#2A2A2E] flex flex-col">
        <div className="p-3.5 border-b border-[#2A2A2E]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-gaming text-base font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-[#7A22EC]" />
              <span>Zero-Cost Realtime Chat</span>
            </h3>
            <span className="text-[10px] bg-[#5003BD]/50 text-purple-200 px-1.5 py-0.5 rounded font-mono-uid">
              v1 Realtime
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#777777]" />
            <input
              type="text"
              value={channelSearch}
              onChange={(e) => setChannelSearch(e.target.value)}
              placeholder="Search rooms & gamers..."
              className="w-full bg-[#121212] text-xs text-white pl-8 pr-3 py-1.5 rounded-lg border border-[#2A2A2E] focus:outline-none focus:border-[#5003BD]"
            />
          </div>
        </div>

        {/* Channels List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#2A2A2E]/50">
          {filteredChannels.map((channel) => {
            const isSelected = channel.id === activeChannel?.id;
            return (
              <div
                key={channel.id}
                onClick={() => setSelectedChannelId(channel.id)}
                className={`p-3 transition-colors cursor-pointer flex items-center gap-3 ${
                  isSelected ? 'bg-[#232323] border-l-2 border-[#5003BD]' : 'hover:bg-[#202020]'
                }`}
              >
                <div className="relative">
                  {channel.type === 'tournament_room' ? (
                    <div className="w-10 h-10 rounded-full bg-[#5003BD]/40 border border-[#7A22EC] flex items-center justify-center text-white">
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </div>
                  ) : (
                    <img
                      src={channel.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                      alt={channel.name}
                      className="w-10 h-10 rounded-full object-cover border border-[#2A2A2E]"
                    />
                  )}
                  {channel.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#5003BD] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {channel.unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-white truncate max-w-[130px]">
                      {channel.name}
                    </span>
                    <span className="text-[10px] text-[#777777] font-mono-uid">{channel.lastTimestamp}</span>
                  </div>
                  <p className="text-[11px] text-[#888888] truncate">{channel.lastMessage}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Side: Active Chat View */}
      {activeChannel ? (
        <div className="flex-1 flex flex-col bg-[#232323]">
          {/* Header */}
          <div className="p-3.5 border-b border-[#2A2A2E] bg-[#1a1a1a] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#5003BD]/30 border border-[#5003BD] flex items-center justify-center">
                {activeChannel.type === 'tournament_room' ? (
                  <Trophy className="w-4 h-4 text-amber-400" />
                ) : (
                  <Users className="w-4 h-4 text-cyan-400" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">{activeChannel.name}</h4>
                <span className="text-[10px] text-[#999999]">{activeChannel.game}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Socket</span>
              </span>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#121212]/70">
            {activeChannel.messages.map((msg) => {
              const isMe = msg.sender.id === CURRENT_USER.id;
              if (msg.isSystem) {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#5003BD]/20 border border-[#5003BD]/40 text-[#CCCCCC] text-[11px] font-medium">
                      📢 {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : ''}`}
                >
                  <img
                    src={msg.sender.avatar}
                    alt={msg.sender.username}
                    className="w-7 h-7 rounded-full object-cover border border-[#2A2A2E] mt-1"
                  />
                  <div
                    className={`max-w-[75%] p-3 rounded-2xl text-xs space-y-1 ${
                      isMe
                        ? 'bg-[#5003BD] text-white rounded-tr-none shadow-md shadow-[#5003BD]/30'
                        : 'bg-[#232323] text-[#CCCCCC] rounded-tl-none border border-[#2A2A2E]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] opacity-80">
                      <span className="font-bold">@{msg.sender.username}</span>
                      <span className="font-mono-uid">{msg.timestamp}</span>
                    </div>
                    <p className="leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="p-3 bg-[#181818] border-t border-[#2A2A2E] flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${activeChannel.name}...`}
              className="flex-1 bg-[#121212] text-white text-xs px-4 py-2.5 rounded-full border border-[#2A2A2E] focus:border-[#5003BD] focus:outline-none"
            />
            <button
              type="submit"
              className="p-2.5 rounded-full bg-[#5003BD] hover:bg-[#7A22EC] text-white transition-colors cursor-pointer shadow-md shadow-[#5003BD]/40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-xs text-[#777777]">
          Select a channel to chat.
        </div>
      )}
    </div>
  );
};
