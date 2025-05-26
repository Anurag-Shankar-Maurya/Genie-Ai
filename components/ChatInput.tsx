
import React, { useState, useRef, useEffect } from 'react';
import { IconButton } from './IconButton';
import { IconArrowUp } from '../constants';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(event.target.value);
  };

  const handleSubmit = () => {
    if (inputText.trim() && !isLoading) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to scroll height
      // Max height to prevent infinite growth
      if (textareaRef.current.scrollHeight > 200) { // approx 5 lines
        textareaRef.current.style.overflowY = 'auto';
        textareaRef.current.style.height = `200px`;
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [inputText]);
  
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }
  }, [isLoading]);


  return (
    <div className="px-4 pb-4 pt-2 bg-gray-800 border-t border-gray-700">
      <div className="relative flex items-end p-1 bg-gray-700 rounded-xl shadow-md max-w-3xl mx-auto">
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything..."
          rows={1}
          className="flex-grow p-3 bg-transparent text-gray-100 placeholder-gray-400 resize-none focus:outline-none overflow-y-hidden max-h-[200px]"
          disabled={isLoading}
        />
        <IconButton
          icon={<IconArrowUp className="w-5 h-5" />}
          onClick={handleSubmit}
          disabled={!inputText.trim() || isLoading}
          ariaLabel="Send message"
          className={`m-1 ${inputText.trim() && !isLoading ? 'bg-teal-500 hover:bg-teal-600 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
        />
      </div>
      <p className="text-xs text-gray-500 text-center mt-2 px-2">
        Genie can make mistakes. Consider checking important information.
      </p>
    </div>
  );
};
