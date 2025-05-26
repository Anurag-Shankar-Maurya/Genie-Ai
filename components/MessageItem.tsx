
import React from 'react';
import { Message, MessageRole } from '../types';
import { IconUserCircle, IconSparkles } from '../constants'; // Assuming IconSparkles for Genie

interface MessageItemProps {
  message: Message;
}

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  return (
    <div className="my-2 bg-gray-900 rounded-md overflow-hidden">
      {language && (
        <div className="text-xs text-gray-400 px-4 py-1 bg-gray-800 border-b border-gray-700">
          {language}
        </div>
      )}
      <pre className="p-4 text-sm text-gray-200 overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  );
};


export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const isUser = message.role === MessageRole.USER;
  const isModel = message.role === MessageRole.MODEL;
  const isError = message.role === MessageRole.ERROR;
  const isSystem = message.role === MessageRole.SYSTEM;

  // Simple Markdown-like parsing for code blocks
  const renderContent = (content: string) => {
    const parts = content.split(/(```[\w]*\n[\s\S]*?\n```)/g);
    return parts.map((part, index) => {
      const codeBlockMatch = part.match(/```([\w]*)\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        const language = codeBlockMatch[1] || undefined;
        const code = codeBlockMatch[2];
        return <CodeBlock key={index} code={code} language={language} />;
      }
      // Preserve newlines for regular text parts
      return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
  };


  if (isSystem) {
    return (
      <div className="py-4 text-center text-sm text-gray-500">
        {message.content}
      </div>
    );
  }
  
  if (isError) {
    return (
       <div className="flex py-4 px-2 md:px-4 max-w-3xl mx-auto">
        <div className="mr-3 flex-shrink-0">
          <IconSparkles className="w-8 h-8 text-red-500" />
        </div>
        <div className="flex-grow bg-red-900 bg-opacity-30 p-3 rounded-lg">
          <p className="text-sm text-red-400 font-semibold">Error</p>
          <div className="text-sm text-red-300 mt-1 whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`py-4 px-2 md:px-4 ${isModel ? 'bg-gray-750' : ''}`}>
      <div className="flex max-w-3xl mx-auto">
        <div className="mr-3 flex-shrink-0">
          {isUser ? (
            <IconUserCircle className="w-8 h-8 text-gray-400" />
          ) : (
            <IconSparkles className="w-8 h-8 text-teal-400" /> // Genie icon
          )}
        </div>
        <div className="flex-grow">
          <p className="text-sm font-semibold text-gray-200 mb-1">
            {isUser ? 'You' : 'Genie'}
          </p>
          <div className="text-sm text-gray-300 leading-relaxed">
             {renderContent(message.content)}
          </div>
        </div>
      </div>
    </div>
  );
};
