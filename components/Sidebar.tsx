import React, { useState, useRef, useEffect } from 'react';
import { ChatSession } from '../types';
import {
  IconPencilSquare, IconChatBubble, IconUserCircle, IconSparkles, IconXMark,
  USER_NAME, GENIE_VERSION_NAME, IconMenu, IconEllipsisVertical, IconPin, IconTrash, IconPencilAlt
} from '../constants';
import { IconButton } from './IconButton';


interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onTogglePinChat: (id: string) => void;
}

interface ChatListItemProps {
  session: ChatSession;
  isActive: boolean;
  isRenaming: boolean;
  renameValue: string;
  onSelect: () => void;
  onStartRename: () => void;
  onRenameInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRenameSubmit: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  session, isActive, isRenaming, renameValue, onSelect,
  onStartRename, onRenameInputChange, onRenameSubmit,
  onDelete, onTogglePin, onMenuToggle, isMenuOpen
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
         if (isMenuOpen) onMenuToggle(); // Close if open
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen, onMenuToggle]);


  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onRenameSubmit();
    } else if (e.key === 'Escape') {
      onRenameSubmit(); 
    }
  };

  return (
    <div
      className={`relative group flex items-center px-3 py-2.5 text-sm rounded-md hover:bg-gray-700 ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:text-white'}`}
    >
      <IconChatBubble className={`w-5 h-5 mr-3 ${session.isPinned ? 'text-teal-400' : 'text-gray-400 group-hover:text-white'}`} />
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={renameValue}
          onChange={onRenameInputChange}
          onBlur={onRenameSubmit}
          onKeyDown={handleRenameKeyDown}
          className="flex-1 bg-transparent border border-gray-600 rounded px-1 py-0.5 text-white focus:ring-1 focus:ring-teal-500 outline-none"
        />
      ) : (
        <span onClick={onSelect} className="flex-1 truncate cursor-pointer">{session.title}</span>
      )}
      {session.isPinned && <IconPin className="w-4 h-4 text-teal-400 ml-2 flex-shrink-0" />}
      
      <div className="relative ml-auto opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <IconButton
          icon={<IconEllipsisVertical className="w-5 h-5" />}
          ariaLabel="Chat options"
          onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
          className="text-gray-400 hover:text-white p-1"
        />
        {isMenuOpen && (
          <div ref={menuRef} className="absolute right-0 mt-1 w-40 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-10 py-1">
            <button
              onClick={() => { onStartRename(); onMenuToggle(); }}
              className="flex items-center w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <IconPencilAlt className="w-4 h-4 mr-2" /> Rename
            </button>
            <button
              onClick={() => { onTogglePin(); onMenuToggle(); }}
              className="flex items-center w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              <IconPin className="w-4 h-4 mr-2" /> {session.isPinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              onClick={() => { onDelete(); onMenuToggle(); }}
              className="flex items-center w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-gray-700 hover:text-red-300"
            >
              <IconTrash className="w-4 h-4 mr-2" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  toggleSidebar,
  chatSessions,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
  onTogglePinChat,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [menuOpenForSessionId, setMenuOpenForSessionId] = useState<string | null>(null);

  const handleStartRename = (session: ChatSession) => {
    setRenamingId(session.id);
    setRenameInput(session.title);
    setMenuOpenForSessionId(null); 
  };

  const handleRenameSubmit = () => {
    if (renamingId && renameInput.trim()) {
      onRenameChat(renamingId, renameInput.trim());
    }
    setRenamingId(null);
    setRenameInput('');
  };
  
  const sortedSessions = chatSessions.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pinnedSessions = sortedSessions.filter(s => s.isPinned);
  const unpinnedSessions = sortedSessions.filter(s => !s.isPinned);

  const renderSessionList = (sessions: ChatSession[], title?: string) => (
    <>
      {sessions.length > 0 && title && <h3 className="px-3 pt-3 pb-1 text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</h3>}
      {sessions.map((session) => (
        <ChatListItem
          key={session.id}
          session={session}
          isActive={session.id === activeChatId && !renamingId}
          isRenaming={session.id === renamingId}
          renameValue={renameInput}
          onSelect={() => onSelectChat(session.id)}
          onStartRename={() => handleStartRename(session)}
          onRenameInputChange={(e) => setRenameInput(e.target.value)}
          onRenameSubmit={handleRenameSubmit}
          onDelete={() => onDeleteChat(session.id)}
          onTogglePin={() => onTogglePinChat(session.id)}
          onMenuToggle={() => setMenuOpenForSessionId(menuOpenForSessionId === session.id ? null : session.id)}
          isMenuOpen={menuOpenForSessionId === session.id}
        />
      ))}
    </>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
      <div
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-gray-900 transition-transform duration-300 ease-in-out transform 
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                    lg:translate-x-0 lg:static lg:inset-0 w-72 border-r border-gray-800`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <div className="flex items-center">
            <IconSparkles className="h-7 w-7 text-teal-400" />
            <span className="ml-2 text-lg font-semibold text-white">{GENIE_VERSION_NAME}</span>
          </div>
          <IconButton
            icon={<IconPencilSquare className="w-5 h-5" />}
            onClick={onNewChat}
            ariaLabel="New Chat"
            className="text-gray-300 hover:text-white"
          />
          <button
            onClick={toggleSidebar}
            className="text-gray-400 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <IconXMark className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-3 space-y-1">
          {renderSessionList(pinnedSessions, pinnedSessions.length > 0 ? "Pinned" : undefined)}
          {renderSessionList(unpinnedSessions, "Recent Chats")}
          
          {chatSessions.length === 0 && (
             <p className="px-3 py-2 text-sm text-gray-500">No chats yet. Start a new one!</p>
           )}
        </div>

        <div className="p-3 border-t border-gray-800 space-y-2">
          <div className="flex items-center p-2 rounded-md hover:bg-gray-700 cursor-pointer group">
            <IconUserCircle className="w-7 h-7 text-gray-400 group-hover:text-white" />
            <div className="ml-3">
              <p className="text-sm font-medium text-white truncate">{USER_NAME}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
