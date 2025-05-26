

import React, { useEffect, useRef, useState } from 'react';
import { Message, MessageRole, ChatSession, ModelConfig } from '../types';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';
import { IconButton } from './IconButton';
import { 
  IconMenu, IconUserCircle, IconChevronDown, IconArrowPath, 
  IconSparkles, MODELS_CONFIG, getModelConfigById, IconPhoto, DEFAULT_MODEL_ID
} from '../constants';

interface ChatViewProps {
  activeSession: ChatSession | null;
  onSendMessage: (
    chatId: string | null, // Allow null for starting new chat
    message: string,
    image?: { base64Data: string; mimeType: string; fileName: string }
  ) => void;
  isLoading: boolean;
  toggleSidebar: () => void;
  onNewChat: () => void;
  onModelChange: (sessionId: string, newModelId: string) => void;
  onStopGenerating?: () => void; // New prop
}

export const ChatView: React.FC<ChatViewProps> = ({
  activeSession,
  onSendMessage,
  isLoading,
  toggleSidebar,
  onNewChat,
  onModelChange,
  onStopGenerating, // Destructure new prop
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSendMessageUI = (
    text: string,
    image?: { base64Data: string; mimeType: string; fileName: string }
  ) => {
    // Pass activeSession?.id (which can be null) to onSendMessage
    onSendMessage(activeSession?.id || null, text, image);
  };
  
  const messages = activeSession?.messages ?? [];
  const currentModelConfig = activeSession ? getModelConfigById(activeSession.modelId) : getModelConfigById(DEFAULT_MODEL_ID);

  const handleModelSelect = (modelId: string) => {
    if (activeSession && activeSession.modelId !== modelId) {
      onModelChange(activeSession.id, modelId);
    } else if (!activeSession) {
      // If no active session, user might want to set a model for the *next* new chat.
      // This requires more complex state management (e.g., a `defaultNextModelId` state).
      // For now, model selection primarily works for an active chat.
      // Or, we could trigger a new chat with this model selected.
      // console.log("No active session to change model for. Model selection will apply to the next new chat if implemented.");
    }
    setIsModelDropdownOpen(false);
  };

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
          <div className="relative" ref={modelDropdownRef}>
            <button 
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center text-lg font-semibold hover:bg-gray-700 p-1.5 rounded-md"
              aria-haspopup="true"
              aria-expanded={isModelDropdownOpen}
              aria-label={`Current model: ${currentModelConfig?.name}. Change model.`}
              disabled={!activeSession && MODELS_CONFIG.length <=1} // Disable if no active session and only one model (or no models)
            >
              <IconSparkles className="w-5 h-5 mr-1.5 text-teal-400" />
              {currentModelConfig?.name || "Select Model"}
              <IconChevronDown className="w-4 h-4 ml-1 text-gray-400" />
            </button>
            {isModelDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-60 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-20 py-1">
                {MODELS_CONFIG.map(model => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model.id)}
                    className={`flex items-center w-full px-3 py-2 text-left text-sm hover:bg-gray-750
                                ${activeSession?.modelId === model.id ? 'text-teal-400 font-semibold' : 'text-gray-200'}`}
                    // Disable if trying to select for non-existent session, unless we implement "select for next chat"
                     disabled={!activeSession && model.id !== currentModelConfig?.id}
                  >
                    {model.name}
                    {model.supportsImage && <IconPhoto className="w-4 h-4 ml-auto text-gray-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
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
        {!activeSession && !isLoading ? (
           <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <IconSparkles className="w-16 h-16 mb-4 text-teal-500" />
            <h2 className="text-2xl font-semibold text-gray-200">How can I help you today?</h2>
            <p className="text-sm mt-1">Start by typing a message below or <button onClick={onNewChat} className="text-teal-400 hover:underline">start a new chat</button>.</p>
             <p className="text-sm mt-1">Using model: {getModelConfigById(DEFAULT_MODEL_ID)?.name}</p>
          </div>
        ) : messages.length === 0 && !isLoading && activeSession ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <IconSparkles className="w-16 h-16 mb-4 text-teal-500" />
            <h2 className="text-2xl font-semibold text-gray-200">What can I help with?</h2>
            <p className="text-sm mt-1">Using model: {currentModelConfig?.name}</p>
          </div>
        ) : (
          <div className="pb-4">
            {messages.map((msg) => (
              <MessageItem key={msg.id} message={msg} />
            ))}
            {isLoading && activeSession && messages[messages.length -1]?.role === MessageRole.USER && (
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
      <ChatInput 
        onSendMessage={handleSendMessageUI} 
        isLoading={isLoading} 
        modelSupportsImage={currentModelConfig?.supportsImage ?? false}
        onStopGenerating={onStopGenerating} // Pass down the handler
      />
    </div>
  );
};