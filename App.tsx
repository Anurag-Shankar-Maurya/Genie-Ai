import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { Message, MessageRole, ChatSession } from './types';
import { generateId, DEFAULT_MODEL_ID, getModelConfigById, MODELS_CONFIG } from './constants';
import geminiService from './services/geminiService';
import { Chat, Part, Content } from '@google/genai';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load sessions from localStorage
  useEffect(() => {
    const storedSessions = localStorage.getItem('genieChatSessions');
    if (storedSessions) {
      const parsedSessions: ChatSession[] = JSON.parse(storedSessions).map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        messages: s.messages.map((m: Message) => ({ 
            ...m, 
            timestamp: new Date(m.timestamp),
            // Ensure image data is loaded if it exists
            image: m.image ? { ...m.image } : undefined 
        })),
        isPinned: s.isPinned || false,
        modelId: s.modelId || DEFAULT_MODEL_ID, // Ensure modelId exists
      }));
      setChatSessions(parsedSessions);
      if (parsedSessions.length > 0) {
        const sortedByDate = [...parsedSessions].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const lastActiveOrDefault = sortedByDate[0];
        setActiveChatId(lastActiveOrDefault.id);
      } else {
        startNewChat();
      }
    } else {
      startNewChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save sessions to localStorage
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('genieChatSessions', JSON.stringify(chatSessions));
    } else {
      localStorage.removeItem('genieChatSessions');
    }
  }, [chatSessions]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const getOrCreateGeminiChatInstance = useCallback((sessionId: string): Chat => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (!session) throw new Error("Session not found for Gemini instance: " + sessionId);

    if (session.geminiChatInstance) {
      return session.geminiChatInstance;
    }

    const geminiHistory: Content[] = session.messages
      .filter(m => m.role === MessageRole.USER || m.role === MessageRole.MODEL)
      .map(m => {
        const parts: Part[] = [];
        // Add image part first if it exists for user messages
        if (m.role === MessageRole.USER && m.image) {
          parts.push({
            inlineData: {
              mimeType: m.image.mimeType,
              data: m.image.base64Data.split(',')[1], // Remove data URL prefix
            },
          });
        }
        // Then add text part if content exists
        if (m.content) {
          parts.push({ text: m.content });
        }
        // Ensure parts array is not empty for valid Content object
        if (parts.length === 0 && m.role === MessageRole.MODEL && !m.content) {
            parts.push({text: ""}); // Model can send empty message if it's just thinking and stream ends.
        }


        return {
          role: m.role === MessageRole.USER ? 'user' : 'model',
          parts: parts.length > 0 ? parts : [{text: ''}], // Fallback for safety, though should be handled by above
        };
      }).filter(content => content.parts.length > 0); // Filter out any potentially empty content objects

    const newChatInstance = geminiService.createChatSession(session.modelId, geminiHistory);
    
    setChatSessions(prevSessions => 
        prevSessions.map(s => 
            s.id === sessionId ? { ...s, geminiChatInstance: newChatInstance } : s
        )
    );
    return newChatInstance;
  }, [chatSessions]);


  const startNewChat = useCallback(() => {
    const newChatId = generateId();
    const currentModelIdForNewChat = DEFAULT_MODEL_ID; // Could be a state if we want to pick model before starting new chat

    const newSession: ChatSession = {
      id: newChatId,
      title: `New Chat`,
      messages: [], // Start with no system message, or add one if preferred
      createdAt: new Date(),
      modelId: currentModelIdForNewChat,
      isPinned: false,
      // geminiChatInstance will be created on first message or selection by getOrCreateGeminiChatInstance
    };
    setChatSessions(prevSessions => [newSession, ...prevSessions]);
    setActiveChatId(newChatId);
    setIsSidebarOpen(false);
    return newSession;
  }, []);


  const selectChatSession = useCallback((id: string) => {
    setActiveChatId(id);
    // Ensure instance is ready for the selected chat, especially if model might have changed
    // getOrCreateGeminiChatInstance(id); // This will be called on send or if model changes
    setIsSidebarOpen(false); 
  }, []);

  const addMessageToSession = (sessionId: string, message: Message) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, message], geminiChatInstance: session.geminiChatInstance } // Preserve instance
          : session
      )
    );
  };

  const updateMessageInSession = (sessionId: string, messageId: string, newContent: string) => {
     setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map(msg =>
                msg.id === messageId ? { ...msg, content: newContent, timestamp: new Date() } : msg
              ),
            }
          : session
      )
    );
  };
  
  const updateChatTitle = useCallback((sessionId: string, newTitle: string) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? { ...session, title: newTitle }
          : session
      )
    );
  }, []);

  const handleRenameChat = useCallback((sessionId: string, newTitle: string) => {
    if(newTitle.trim()){
        updateChatTitle(sessionId, newTitle.trim());
    }
  }, [updateChatTitle]);

  const handleDeleteChat = useCallback((sessionId: string) => {
    if (window.confirm("Are you sure you want to delete this chat?")) {
      setChatSessions(prevSessions => {
        const updatedSessions = prevSessions.filter(s => s.id !== sessionId);
        if (activeChatId === sessionId) {
          if (updatedSessions.length > 0) {
              const sortedRemaining = updatedSessions.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              setActiveChatId(sortedRemaining[0].id);
          } else {
              startNewChat(); // This will set a new activeChatId
          }
        }
        return updatedSessions;
      });
    }
  }, [activeChatId, startNewChat]); // Removed chatSessions from deps as it's read via setChatSessions updater

  const handleTogglePinChat = useCallback((sessionId: string) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? { ...session, isPinned: !session.isPinned }
          : session
      )
    );
  }, []);

  const handleModelChangeForSession = useCallback((sessionId: string, newModelId: string) => {
    setChatSessions(prevSessions =>
      prevSessions.map(s =>
        s.id === sessionId
          ? { ...s, modelId: newModelId, geminiChatInstance: undefined } // Reset instance
          : s
      )
    );
    // If the active chat's model changed, its instance will be recreated on next message.
  }, []);


  const handleSendMessage = async (
    chatId: string,
    text: string,
    image?: { base64Data: string; mimeType: string; fileName: string }
  ) => {
    const currentSessionForSend = chatSessions.find(s => s.id === chatId);
    if (!currentSessionForSend) return;

    const modelConfig = getModelConfigById(currentSessionForSend.modelId);
    if (image && !modelConfig?.supportsImage) {
      // This should ideally be prevented by the UI, but as a safeguard:
      addMessageToSession(chatId, {
        id: generateId(),
        role: MessageRole.ERROR,
        content: `The current model (${modelConfig?.name || 'Unknown'}) does not support image uploads. Image was not sent.`,
        timestamp: new Date(),
      });
      // Optionally, still send the text part or do nothing. Here, we just show an error.
      return;
    }

    if (!text.trim() && !image) return; // Don't send if both are empty

    setIsLoading(true);

    const userMessage: Message = {
      id: generateId(),
      role: MessageRole.USER,
      content: text,
      timestamp: new Date(),
      image: image ? { base64Data: image.base64Data, mimeType: image.mimeType, fileName: image.fileName } : undefined,
    };
    addMessageToSession(chatId, userMessage);

    const modelMessageId = generateId();
    const placeholderModelMessage: Message = {
      id: modelMessageId,
      role: MessageRole.MODEL,
      content: "", 
      timestamp: new Date(),
    };
    addMessageToSession(chatId, placeholderModelMessage);

    try {
      const currentChatInstance = getOrCreateGeminiChatInstance(chatId);
      
      const messageParts: Part[] = [];
      if (image) {
        messageParts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.base64Data.split(',')[1], // Remove "data:mime/type;base64," prefix
          },
        });
      }
      if (text.trim()) {
        messageParts.push({ text: text.trim() });
      }
      
      // Ensure parts is not empty if user only uploaded an image with no text
      if (messageParts.length === 0 && image) {
        messageParts.push({ text: "" }); // Send empty text if only image, model might need some text part.
      }


      const stream = await geminiService.sendMessageStream(currentChatInstance, messageParts);
      
      let fullResponse = "";
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
            fullResponse += chunkText;
            updateMessageInSession(chatId, modelMessageId, fullResponse);
        }
      }
      
      // Auto-title generation logic (only if title is default "New Chat" and after first model response)
      const sessionAfterSend = chatSessions.find(s => s.id === chatId); // Re-fetch session to get latest messages
      if (sessionAfterSend && sessionAfterSend.title === "New Chat" && 
          sessionAfterSend.messages.filter(m => m.role === MessageRole.MODEL && m.content.trim() !== "").length === 1) {
         try {
           const titlePromptText = text || (image ? `Image: ${image.fileName}` : "Chat conversation");
           const titleGenPrompt = `Generate a very short, concise title (3-5 words max) for a chat that starts with this user query: "${titlePromptText.substring(0, 120)}". Respond with only the title itself, no extra text or quotes.`;
           // Use the session's model for title generation, or a default fast one
           const titleResponse = await geminiService.generateContent(currentSessionForSend.modelId, titleGenPrompt);
           let newTitle = titleResponse.text.trim().replace(/^["']|["']$/g, "");
           if (newTitle && newTitle.length > 0 && newTitle.length <= 60) { 
              updateChatTitle(chatId, newTitle);
           } else {
              updateChatTitle(chatId, titlePromptText.substring(0, 30) + (titlePromptText.length > 30 ? "..." : ""));
           }
         } catch (titleError) {
           console.error("Failed to generate chat title:", titleError);
           const fallbackTitleText = text || (image ? `Image: ${image.fileName}` : "Chat");
           updateChatTitle(chatId, fallbackTitleText.substring(0, 30) + (fallbackTitleText.length > 30 ? "..." : ""));
         }
      }

    } catch (error) {
      console.error('Error streaming message:', error);
      const errorMessageContent = error instanceof Error ? error.message : "An unknown error occurred with the AI service.";
      updateMessageInSession(chatId, modelMessageId, `Sorry, I encountered an error: ${errorMessageContent}`);
       setChatSessions(prevSessions =>
        prevSessions.map(session =>
          session.id === chatId
            ? {
                ...session,
                messages: session.messages.map(msg =>
                  msg.id === modelMessageId ? { ...msg, role: MessageRole.ERROR, content: `Failed to get response: ${errorMessageContent}` } : msg
                ),
              }
            : session
        )
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  const activeSessionDetails = chatSessions.find(session => session.id === activeChatId) || null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onSelectChat={selectChatSession}
        onNewChat={startNewChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onTogglePinChat={handleTogglePinChat}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatView
            activeSession={activeSessionDetails}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            toggleSidebar={toggleSidebar}
            onNewChat={startNewChat}
            onModelChange={handleModelChangeForSession}
        />
      </div>
    </div>
  );
};

export default App;
