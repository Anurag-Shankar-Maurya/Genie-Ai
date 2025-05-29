import React, { useState } from 'react';
import { marked, Marked } from 'marked';
import { Message, MessageRole } from '../types';
import { IconUserCircle, IconGenie, IconClipboard, IconCheck } from '../constants';
import { IconButton } from './IconButton';

// Configure marked
const markedInstance = new Marked({
  gfm: true, // Enable GitHub Flavored Markdown
  breaks: false, // Default GFM behavior for line breaks
  pedantic: false,
  // IMPORTANT: If content can be user-input from untrusted sources, use DOMPurify or similar after marked
  mangle: false,
  headerIds: false,
});

interface MessageItemProps {
  message: Message;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === MessageRole.USER;
  const isModel = message.role === MessageRole.MODEL;
  const isError = message.role === MessageRole.ERROR;
  const isSystem = message.role === MessageRole.SYSTEM;

  const renderedHtmlContent = React.useMemo(() => {
    if (message.content && (isModel || isUser)) { // Only parse markdown for user and model messages with content
      return markedInstance.parse(message.content) as string;
    }
    return message.content; // For system/error messages, or if no content, return as is.
  }, [message.content, isModel, isUser]);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        })
        .catch(err => console.error('Failed to copy text: ', err));
    }
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
          <IconGenie className="w-8 h-8 text-red-500" />
        </div>
        <div className="flex-grow bg-red-900 bg-opacity-30 p-3 rounded-lg">
          <p className="text-sm text-red-400 font-semibold">Error</p>
          <div className="text-sm text-red-300 mt-1 whitespace-pre-wrap overflow-x-auto">
            {message.content}
          </div>
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
            <IconGenie className="w-8 h-8 text-teal-400" />
          )}
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-center mb-1">
            <p className="text-sm font-semibold text-gray-200">
              {isUser ? 'You' : 'Genie'}
            </p>
            {(isUser || isModel) && message.content && (
              <IconButton
                icon={copied ? <IconCheck className="w-5 h-5 text-green-400" /> : <IconClipboard className="w-5 h-5" />}
                onClick={handleCopy}
                ariaLabel={copied ? "Content copied" : "Copy message content"}
                className="text-gray-400 hover:text-gray-200"
              />
            )}
          </div>
          {isUser && message.image && (
            <div className="mb-2 border border-gray-600 rounded-lg overflow-hidden max-w-xs">
              <img
                src={message.image.base64Data}
                alt={message.image.fileName || 'Uploaded image'}
                className="max-w-full h-auto object-contain"
              />
            </div>
          )}
          {message.content && (
            <div
              className="text-sm text-gray-300 leading-relaxed message-content overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: renderedHtmlContent }}
            />
          )}
           {!message.content && isModel && ( // Handle case where model might send an empty content
             <div className="text-sm text-gray-400 italic">Genie is processing...</div>
           )}
        </div>
      </div>
    </div>
  );
};