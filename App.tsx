import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [defaultModelForNewChat, setDefaultModelForNewChat] = useState<string>(DEFAULT_MODEL_ID);
  const stopGenerationRef = useRef(false);

  // Load sessions from localStorage
  useEffect(() => {
    const storedSessions = localStorage.getItem('genieChatSessions');
    const storedDefaultModel = localStorage.getItem('genieDefaultModel');

    if (storedDefaultModel && MODELS_CONFIG.find(m => m.id === storedDefaultModel)) {
      setDefaultModelForNewChat(storedDefaultModel);
    }

    if (storedSessions) {
      const parsedSessions: ChatSession[] = JSON.parse(storedSessions).map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        messages: s.messages.map((m: Message) => ({ 
            ...m, 
            timestamp: new Date(m.timestamp),
            image: m.image ? { ...m.image } : undefined 
        })),
        isPinned: s.isPinned || false,
        modelId: s.modelId || defaultModelForNewChat, // Use potentially updated default
      }));
      setChatSessions(parsedSessions);
      if (parsedSessions.length > 0) {
        const sortedByDate = [...parsedSessions].sort((a,b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        });
        setActiveChatId(sortedByDate[0].id);
      } else {
        setActiveChatId(null); 
      }
    } else {
      setActiveChatId(null); 
    }
  }, []); // Removed defaultModelForNewChat from deps to avoid race condition on init

  // Save sessions to localStorage
  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('genieChatSessions', JSON.stringify(chatSessions));
    } else {
      const storedSessions = localStorage.getItem('genieChatSessions');
      if (storedSessions) { 
        localStorage.removeItem('genieChatSessions');
      }
    }
  }, [chatSessions]);

  // Save default model to localStorage
  useEffect(() => {
    localStorage.setItem('genieDefaultModel', defaultModelForNewChat);
  }, [defaultModelForNewChat]);


  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const addMessageToSession = useCallback((sessionId: string, message: Message) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, message] }
          : session
      )
    );
  }, []);

  const updateMessageInSession = useCallback((sessionId: string, messageId: string, newContent: string, role?: MessageRole) => {
     setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? {
              ...session,
              messages: session.messages.map(msg =>
                msg.id === messageId ? { ...msg, content: newContent, timestamp: new Date(), role: role || msg.role } : msg
              ),
            }
          : session
      )
    );
  }, []);
  
  const updateChatTitle = useCallback((sessionId: string, newTitle: string) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId && session.title !== newTitle
          ? { ...session, title: newTitle }
          : session
      )
    );
  }, []);

 const getOrCreateGeminiChatInstance = useCallback((session: ChatSession): Chat => {
    if (!session) {
        console.error("Session object is undefined for Gemini instance. Cannot proceed.");
        throw new Error("Session object is undefined for Gemini instance.");
    }

    if (session.geminiChatInstance) {
      return session.geminiChatInstance;
    }

    const geminiHistory: Content[] = session.messages
      .filter(m => m.role === MessageRole.USER || m.role === MessageRole.MODEL)
      .map(m => {
        const parts: Part[] = [];
        if (m.role === MessageRole.USER && m.image) {
          parts.push({
            inlineData: {
              mimeType: m.image.mimeType,
              data: m.image.base64Data.split(',')[1], 
            },
          });
        }
        if (m.content || (m.role === MessageRole.MODEL && parts.length === 0) ) { 
          parts.push({ text: m.content || "" });
        }
        
        return {
          role: m.role === MessageRole.USER ? 'user' : 'model',
          parts: parts.length > 0 ? parts : [{text: ''}], 
        };
      }).filter(content => content.parts.length > 0 && (content.parts[0].text !== '' || content.parts[0].inlineData));


    const newChatInstance = geminiService.createChatSession(session.modelId, geminiHistory);
    
    setChatSessions(prevSessions => 
        prevSessions.map(s => 
            s.id === session.id ? { ...s, geminiChatInstance: newChatInstance } : s
        )
    );
    return newChatInstance;
  }, []);


  const startNewChat = useCallback((): ChatSession => {
    const newChatId = generateId();
    
    const newSession: ChatSession = {
      id: newChatId,
      title: `New Chat`,
      messages: [],
      createdAt: new Date(),
      modelId: defaultModelForNewChat, // Use the current default model for new chats
      isPinned: false,
    };
    setChatSessions(prevSessions => [newSession, ...prevSessions]);
    setActiveChatId(newChatId);
    if (isSidebarOpen) setIsSidebarOpen(false);
    return newSession;
  }, [isSidebarOpen, defaultModelForNewChat]);


  const selectChatSession = useCallback((id: string) => {
    setActiveChatId(id);
    if (isSidebarOpen) setIsSidebarOpen(false); 
  }, [isSidebarOpen]);


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
              const sortedRemaining = updatedSessions.sort((a,b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              });
              setActiveChatId(sortedRemaining[0].id);
          } else {
              setActiveChatId(null); 
          }
        }
        return updatedSessions;
      });
    }
  }, [activeChatId]); 

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
        s.id === sessionId && s.modelId !== newModelId 
          ? { ...s, modelId: newModelId, geminiChatInstance: undefined } 
          : s
      )
    );
  }, []);

  const handleChangeDefaultModel = useCallback((newModelId: string) => {
    if (MODELS_CONFIG.find(m => m.id === newModelId)) {
        setDefaultModelForNewChat(newModelId);
    }
  }, []);

  const handleStopGenerating = useCallback(() => {
    stopGenerationRef.current = true;
  }, []);

  const handleSendMessage = useCallback(async (
    chatIdFromView: string | null,
    text: string,
    image?: { base64Data: string; mimeType: string; fileName: string }
  ) => {
    let sessionForMessage: ChatSession | undefined;
    let currentChatIdToUse: string;

    if (!chatIdFromView) {
        const newSession = startNewChat(); 
        sessionForMessage = newSession;
        currentChatIdToUse = newSession.id;
    } else {
        currentChatIdToUse = chatIdFromView;
        // Fetch the latest session state from chatSessions to ensure modelId is current
        sessionForMessage = chatSessions.find(s => s.id === currentChatIdToUse);
    }
    
    if (!sessionForMessage) {
        console.error("Error: Could not find or create a session to send the message to.");
         addMessageToSession(chatIdFromView || "error-temp-id" , {
            id: generateId(),
            role: MessageRole.ERROR,
            content: `Critical error: Session ${chatIdFromView} not found. Please try starting a new chat.`,
            timestamp: new Date(),
        });
        setIsLoading(false);
        return;
    }

    const modelConfig = getModelConfigById(sessionForMessage.modelId);
    if (image && !modelConfig?.supportsImage) {
      addMessageToSession(currentChatIdToUse, {
        id: generateId(),
        role: MessageRole.ERROR,
        content: `The current model (${modelConfig?.name || 'Unknown'}) does not support image uploads. Image was not sent.`,
        timestamp: new Date(),
      });
      return;
    }

    if (!text.trim() && !image) return; 

    setIsLoading(true);
    stopGenerationRef.current = false; 

    const userMessage: Message = {
      id: generateId(),
      role: MessageRole.USER,
      content: text,
      timestamp: new Date(),
      image: image ? { base64Data: image.base64Data, mimeType: image.mimeType, fileName: image.fileName } : undefined,
    };
    addMessageToSession(currentChatIdToUse, userMessage);
    
    sessionForMessage = {...sessionForMessage, messages: [...sessionForMessage.messages, userMessage]};


    const modelMessageId = generateId();
    const placeholderModelMessage: Message = {
      id: modelMessageId,
      role: MessageRole.MODEL,
      content: "", 
      timestamp: new Date(),
    };
    addMessageToSession(currentChatIdToUse, placeholderModelMessage);

    try {
      const currentChatInstance = getOrCreateGeminiChatInstance(sessionForMessage); 
      
      const messageParts: Part[] = [];
      if (image) {
        messageParts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.base64Data.split(',')[1], 
          },
        });
      }
      if (text.trim()) {
        messageParts.push({ text: text.trim() });
      }
      
      if (messageParts.length === 0 && image) {
        messageParts.push({ text: "" }); 
      }

      const stream = await geminiService.sendMessageStream(currentChatInstance, messageParts);
      
      let fullResponse = "";
      for await (const chunk of stream) {
        if (stopGenerationRef.current) {
            console.log("Generation stopped by user.");
            break; 
        }
        const chunkText = chunk.text;
        if (chunkText) {
            fullResponse += chunkText;
            updateMessageInSession(currentChatIdToUse, modelMessageId, fullResponse);
        }
      }
      
      const latestSessionState = chatSessions.find(s => s.id === currentChatIdToUse);
      if (latestSessionState && latestSessionState.title === "New Chat" && 
          latestSessionState.messages.filter(m => m.role === MessageRole.MODEL && m.content.trim() !== "").length === 1) {
         try {
           const titlePromptText = text || (image ? `Image: ${image.fileName}` : "Chat conversation");
           const titleGenPrompt = `Generate a very short, concise title (3-5 words max) for a chat that starts with this user query: "${titlePromptText.substring(0, 120)}". Respond with only the title itself, no extra text or quotes.`;
           
           const titleResponse = await geminiService.generateContent(latestSessionState.modelId, titleGenPrompt);
           let newTitle = titleResponse.text.trim().replace(/^["']|["']$/g, "");
           if (newTitle && newTitle.length > 0 && newTitle.length <= 60) { 
              updateChatTitle(currentChatIdToUse, newTitle);
           } else {
              updateChatTitle(currentChatIdToUse, titlePromptText.substring(0, 30) + (titlePromptText.length > 30 ? "..." : ""));
           }
         } catch (titleError) {
           console.error("Failed to generate chat title:", titleError);
           const fallbackTitleText = text || (image ? `Image: ${image.fileName}` : "Chat");
           updateChatTitle(currentChatIdToUse, fallbackTitleText.substring(0, 30) + (fallbackTitleText.length > 30 ? "..." : ""));
         }
      }

    } catch (error) {
      console.error('Error streaming message:', error);
      const errorMessageContent = error instanceof Error ? error.message : "An unknown error occurred with the AI service.";
      updateMessageInSession(currentChatIdToUse, modelMessageId, `Sorry, I encountered an error: ${errorMessageContent}`, MessageRole.ERROR);
    } finally {
      setIsLoading(false);
      stopGenerationRef.current = false; 
    }
  }, [
      chatSessions, 
      startNewChat, 
      getOrCreateGeminiChatInstance, 
      addMessageToSession, 
      updateMessageInSession, 
      updateChatTitle
    ]);
  
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
            onStopGenerating={handleStopGenerating}
            defaultModelForNewChat={defaultModelForNewChat}
            onChangeDefaultModel={handleChangeDefaultModel}
        />
      </div>
    </div>
  );
};

export default App;