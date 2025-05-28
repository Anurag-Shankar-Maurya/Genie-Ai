
import React, { useEffect, useRef, useState } from 'react';
import { Message, MessageRole, ChatSession } from '../types';
import { MessageItem } from './MessageItem';
import { ChatInput } from './ChatInput';
import { IconButton } from './IconButton';
import { 
  IconMenu, IconUserCircle, IconChevronDown, IconArrowPath, 
  IconGenie, MODELS_CONFIG, getModelConfigById, IconPhoto, DEFAULT_MODEL_ID,
  IconPencilSquare
} from '../constants';

interface ChatViewProps {
  activeSession: ChatSession | null;
  onSendMessage: (
    chatId: string | null,
    message: string,
    image?: { base64Data: string; mimeType: string; fileName: string }
  ) => void;
  isLoading: boolean;
  toggleSidebar: () => void;
  onNewChat: () => void;
  onModelChange: (sessionId: string, newModelId: string) => void;
  onStopGenerating?: () => void;
  defaultModelForNewChat: string;
  onChangeDefaultModel: (newModelId: string) => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  activeSession,
  onSendMessage,
  isLoading,
  toggleSidebar,
  onNewChat,
  onModelChange,
  onStopGenerating,
  defaultModelForNewChat,
  onChangeDefaultModel,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLElement>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  
  const userHasScrolledUpRef = useRef(false);
  const lastActiveSessionIdRef = useRef<string | null | undefined>(null);

  // Effect to handle chat session changes (reset scroll state, initial scroll)
  useEffect(() => {
    const isNewSessionOrMessagesLoaded = activeSession?.id !== lastActiveSessionIdRef.current || 
                                        (activeSession?.id === lastActiveSessionIdRef.current && activeSession?.messages?.length > 0 && scrollContainerRef.current?.scrollTop === 0);

    if (isNewSessionOrMessagesLoaded) {
        userHasScrolledUpRef.current = false;
        lastActiveSessionIdRef.current = activeSession?.id;
        
        setTimeout(() => { 
            if (scrollContainerRef.current) {
                if (activeSession?.messages && activeSession.messages.length > 0) {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
                } else {
                    scrollContainerRef.current.scrollTop = 0; 
                }
            }
        }, 0);
    }
  }, [activeSession?.id, activeSession?.messages?.length]);


  // Scroll handler attachment
  useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const handleScroll = () => {
          const { scrollTop, scrollHeight, clientHeight } = container;
          if (scrollHeight - scrollTop - clientHeight > 150) { 
              userHasScrolledUpRef.current = true;
          } else if (scrollHeight - scrollTop - clientHeight < 10) {
              userHasScrolledUpRef.current = false;
          }
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
  }, []); 

  // Effect for auto-scrolling based on messages and loading state
  useEffect(() => {
    if (!activeSession?.messages || activeSession.messages.length === 0) {
        return;
    }

    const messages = activeSession.messages;
    const lastMessage = messages[messages.length - 1];

    const userMessageIsLatestAndProcessing =
        lastMessage.role === MessageRole.USER && isLoading;
    
    const modelPlaceholderIsLatestAndProcessing =
        lastMessage.role === MessageRole.MODEL &&
        lastMessage.content === "" && 
        isLoading &&
        messages.length > 1 && 
        messages[messages.length - 2]?.role === MessageRole.USER;

    if (userMessageIsLatestAndProcessing || modelPlaceholderIsLatestAndProcessing) {
        userHasScrolledUpRef.current = false;
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (!userHasScrolledUpRef.current) {
        const behavior = isLoading ? 'smooth' : 'auto'; 
        messagesEndRef.current?.scrollIntoView({ behavior });
    }
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
    userHasScrolledUpRef.current = false; 
    onSendMessage(activeSession?.id || null, text, image);
  };
  
  const messages = activeSession?.messages ?? [];
  const currentModelIdToUse = activeSession ? activeSession.modelId : defaultModelForNewChat;
  const currentModelConfig = getModelConfigById(currentModelIdToUse);

  const handleModelSelect = (modelId: string) => {
    if (activeSession) {
      // If there's an active session, change its model
      if (activeSession.modelId !== modelId) {
        onModelChange(activeSession.id, modelId);
      }
    } else {
      // No active session, change the default model for new chats
      if (defaultModelForNewChat !== modelId) {
          onChangeDefaultModel(modelId);
      }
    }
    setIsModelDropdownOpen(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-800">
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
              aria-label={`Current model: ${currentModelConfig?.name || "Select Model"}. Change model.`}
              disabled={MODELS_CONFIG.length <= 1}
            >
              <IconGenie className="w-5 h-5 mr-1.5 text-teal-400" />
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
                                ${currentModelIdToUse === model.id ? 'text-teal-400 font-semibold' : 'text-gray-200'}`}
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
            icon={<IconPencilSquare className="w-5 h-5" />}
            onClick={() => {
              userHasScrolledUpRef.current = false; 
              onNewChat();
            }}
            ariaLabel="New Chat"
            className="hidden sm:flex" 
          />
          <IconUserCircle className="w-8 h-8 text-gray-400 cursor-pointer" />
        </div>
      </header>

      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto">
        {!activeSession && !isLoading ? (
           <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <IconGenie className="w-16 h-16 mb-4 text-teal-500" />
            <h2 className="text-2xl font-semibold text-gray-200">How can I help you today?</h2>
            <p className="text-sm mt-1">Start by typing a message below or <button onClick={onNewChat} className="text-teal-400 hover:underline">start a new chat</button>.</p>
             <p className="text-sm mt-1">Using model: {currentModelConfig?.name || 'Unknown Model'}</p>
          </div>
        ) : messages.length === 0 && !isLoading && activeSession ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <IconGenie className="w-16 h-16 mb-4 text-teal-500" />
            <h2 className="text-2xl font-semibold text-gray-200">What can I help with?</h2>
            <p className="text-sm mt-1">Using model: {currentModelConfig?.name || 'Unknown Model'}</p>
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

      <ChatInput 
        onSendMessage={handleSendMessageUI} 
        isLoading={isLoading} 
        modelSupportsImage={currentModelConfig?.supportsImage ?? false}
        onStopGenerating={onStopGenerating}
      />
    </div>
  );
};