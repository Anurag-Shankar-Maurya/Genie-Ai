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
  image?: { // For user-uploaded images
    base64Data: string;
    mimeType: string;
    fileName?: string;
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  modelId: string; // ID of the model used for this session
  geminiChatInstance?: Chat;
  isPinned?: boolean;
}

// Represents the structure of model configuration
export interface ModelConfig {
  id: string;
  name: string;
  supportsImage: boolean;
}
