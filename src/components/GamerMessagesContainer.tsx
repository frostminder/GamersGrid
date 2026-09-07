import React, { useState } from 'react';
import { ChatListScreen } from './ChatListScreen';
import { ChatScreen } from './ChatScreen';

interface GamerMessagesContainerProps {
  onChatActiveChange?: (active: boolean) => void;
}

export const GamerMessagesContainer: React.FC<GamerMessagesContainerProps> = ({ 
  onChatActiveChange 
}) => {
  const [activeConversation, setActiveConversation] = useState<{
    id: string;
    partnerName: string;
    partnerAvatar?: string;
    partnerId?: string;
  } | null>(null);

  const handleSelectConversation = (
    conversationId: string, 
    partnerName: string, 
    partnerAvatar?: string, 
    partnerId?: string
  ) => {
    setActiveConversation({
      id: conversationId,
      partnerName,
      partnerAvatar,
      partnerId,
    });
    onChatActiveChange?.(true);
  };

  const handleBackToInbox = () => {
    setActiveConversation(null);
    onChatActiveChange?.(false);
  };

  if (activeConversation) {
    return (
      <ChatScreen
        conversationId={activeConversation.id}
        partnerName={activeConversation.partnerName}
        partnerAvatar={activeConversation.partnerAvatar}
        partnerId={activeConversation.partnerId}
        onBack={handleBackToInbox}
      />
    );
  }

  return (
    <ChatListScreen onSelectConversation={handleSelectConversation} />
  );
};
