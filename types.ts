
import { Chat } from '@google/genai';

export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  ERROR = 'error', // For displaying API errors or critical system messages in chat
  SYSTEM = 'system', // For initial welcome messages or system notifications
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  geminiChatInstance?: Chat; 
  isPinned?: boolean; // Added for pinning functionality
}
