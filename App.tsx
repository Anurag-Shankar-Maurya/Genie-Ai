
import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { Message, MessageRole, ChatSession } from './types';
import { generateId } from './constants';
import geminiService from './services/geminiService';
import { Chat, Part } from '@google/genai';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const storedSessions = localStorage.getItem('genieChatSessions');
    if (storedSessions) {
      const parsedSessions: ChatSession[] = JSON.parse(storedSessions).map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        messages: s.messages.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) })),
        isPinned: s.isPinned || false, 
      }));
      setChatSessions(parsedSessions);
      if (parsedSessions.length > 0) {
        const sortedByDate = [...parsedSessions].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const lastActiveOrDefault = sortedByDate[0]; // Default to most recent
        setActiveChatId(lastActiveOrDefault.id);
      } else {
        startNewChat();
      }
    } else {
      startNewChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chatSessions.length > 0) {
      localStorage.setItem('genieChatSessions', JSON.stringify(chatSessions));
    } else {
      // If all chats are deleted, clear from local storage too
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

    const geminiHistory: { role: 'user' | 'model'; parts: Part[] }[] = session.messages
      .filter(m => m.role === MessageRole.USER || m.role === MessageRole.MODEL)
      .map(m => ({
        role: m.role === MessageRole.USER ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

    const newChatInstance = geminiService.createChatSession(geminiHistory);
    
    setChatSessions(prevSessions => 
        prevSessions.map(s => 
            s.id === sessionId ? { ...s, geminiChatInstance: newChatInstance } : s
        )
    );
    return newChatInstance;
  }, [chatSessions]);


  const startNewChat = useCallback(() => {
    const newChatId = generateId();
    const welcomeMessage: Message = {
      id: generateId(),
      role: MessageRole.SYSTEM,
      content: "Hello! I'm Genie. How can I assist you today?",
      timestamp: new Date(),
    };
    const newSession: ChatSession = {
      id: newChatId,
      title: `New Chat`, // Simplified initial title
      messages: [welcomeMessage],
      createdAt: new Date(),
      isPinned: false,
      geminiChatInstance: geminiService.createChatSession(),
    };
    // Add to top, but sorting will handle final placement if mixed with pinned
    setChatSessions(prevSessions => [newSession, ...prevSessions]);
    setActiveChatId(newChatId);
    setIsSidebarOpen(false);
    return newSession; // Return new session for potential immediate use
  }, []);


  const selectChatSession = useCallback((id: string) => {
    setActiveChatId(id);
    getOrCreateGeminiChatInstance(id); // Ensure instance is ready
    setIsSidebarOpen(false); 
  }, [getOrCreateGeminiChatInstance]);


  const addMessageToSession = (sessionId: string, message: Message) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? { ...session, messages: [...session.messages, message] }
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
      setChatSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
      if (activeChatId === sessionId) {
        // Find next available or start new
        const remainingSessions = chatSessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
            const sortedRemaining = remainingSessions.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setActiveChatId(sortedRemaining[0].id);
        } else {
            startNewChat();
        }
      }
    }
  }, [activeChatId, chatSessions, startNewChat]);

  const handleTogglePinChat = useCallback((sessionId: string) => {
    setChatSessions(prevSessions =>
      prevSessions.map(session =>
        session.id === sessionId
          ? { ...session, isPinned: !session.isPinned }
          : session
      )
    );
  }, []);


  const handleSendMessage = async (text: string, chatId: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: generateId(),
      role: MessageRole.USER,
      content: text,
      timestamp: new Date(),
    };
    addMessageToSession(chatId, userMessage);

    setIsLoading(true);
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
      const stream = await geminiService.sendMessageStream(currentChatInstance, text);
      
      let fullResponse = "";
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if (chunkText) {
            fullResponse += chunkText;
            updateMessageInSession(chatId, modelMessageId, fullResponse);
        }
      }
      
      const currentSession = chatSessions.find(s => s.id === chatId);
      if (currentSession && currentSession.title === "New Chat" && currentSession.messages.filter(m => m.role === MessageRole.MODEL && m.content.trim() !== "").length === 1) {
         try {
           const titlePrompt = `Generate a very short, concise title (3-5 words max) for a chat that starts with this user query: "${text.substring(0, 120)}". Respond with only the title itself, no extra text or quotes.`;
           const titleResponse = await geminiService.generateContent(titlePrompt);
           let newTitle = titleResponse.text.trim().replace(/^["']|["']$/g, ""); // Remove surrounding quotes
           if (newTitle && newTitle.length > 0 && newTitle.length <= 60) { 
              updateChatTitle(chatId, newTitle);
           } else {
              updateChatTitle(chatId, text.substring(0, 30) + (text.length > 30 ? "..." : ""));
           }
         } catch (titleError) {
           console.error("Failed to generate chat title:", titleError);
           updateChatTitle(chatId, text.substring(0, 30) + (text.length > 30 ? "..." : ""));
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
        />
      </div>
    </div>
  );
};

export default App;
