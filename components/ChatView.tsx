
import React, { useEffect, useRef } from 'react';
import { Message, MessageRole, ChatSession } from '../types';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';
import { IconButton } from './IconButton';
import { IconMenu, IconUserCircle, IconChevronDown, IconInfo, IconArrowPath, GENIE_VERSION, IconSparkles } from '../constants';

interface ChatViewProps {
  activeSession: ChatSession | null;
  onSendMessage: (message: string, chatId: string) => void;
  isLoading: boolean;
  toggleSidebar: () => void;
  onNewChat: () => void; // For the refresh button in header
}

export const ChatView: React.FC<ChatViewProps> = ({
  activeSession,
  onSendMessage,
  isLoading,
  toggleSidebar,
  onNewChat
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isLoading]);


  const handleSendMessage = (message: string) => {
    if (activeSession) {
      onSendMessage(message, activeSession.id);
    } else {
      // This case should ideally not happen if a session is always created/selected
      console.warn("Attempted to send message without an active session.");
      // Potentially create a new chat here then send.
      onNewChat(); // Create a new chat, then user has to resend. Or handle differently.
    }
  };
  
  const messages = activeSession?.messages ?? [];

  return (
    <div className="flex flex-col h-screen bg-gray-800">
      {/* Header */}
      <header className="flex items-center justify-between h-16 px-4 border-b border-gray-700 bg-gray-800 text-gray-100 flex-shrink-0">
        <div className="flex items-center">
          <IconButton
            icon={<IconMenu className="w-6 h-6" />}
            onClick={toggleSidebar}
            ariaLabel="Toggle sidebar"
            className="lg:hidden mr-2"
          />
          <button className="flex items-center text-lg font-semibold hover:bg-gray-700 p-1.5 rounded-md">
            <IconSparkles className="w-5 h-5 mr-1.5 text-teal-400" />
            {GENIE_VERSION.split(' ')[0]}
            <IconChevronDown className="w-4 h-4 ml-1 text-gray-400" />
          </button>
        </div>
        <div className="flex items-center space-x-2">
          {/* <div className="text-sm text-gray-400 flex items-center">
            <span className="hidden sm:inline">Saved memory full</span> 
            <IconInfo className="w-4 h-4 ml-1.5 text-gray-500 cursor-pointer" />
          </div> */}
          <IconButton
            icon={<IconArrowPath className="w-5 h-5" />}
            onClick={onNewChat}
            ariaLabel="New Chat"
            className="hidden sm:flex"
          />
          <IconUserCircle className="w-8 h-8 text-gray-400 cursor-pointer" />
        </div>
      </header>

      {/* Message List */}
      <main className="flex-1 overflow-y-auto">
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <IconSparkles className="w-16 h-16 mb-4 text-teal-500" />
            <h2 className="text-2xl font-semibold text-gray-200">What can I help with?</h2>
          </div>
        ) : (
          <div className="pb-4">
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}
            {isLoading && messages[messages.length -1]?.role === MessageRole.USER && (
              // Show a subtle loading indicator if the last message is user and we are waiting for model
              <div className="flex justify-center py-4">
                <div className="animate-pulse flex space-x-2 items-center">
                  <div className="w-2 h-2 bg-teal-400 rounded-full"></div>
                  <div className="w-2 h-2 bg-teal-400 rounded-full animation-delay-200"></div>
                  <div className="w-2 h-2 bg-teal-400 rounded-full animation-delay-400"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* Chat Input */}
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};
