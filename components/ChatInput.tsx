import React, { useState, useRef, useEffect } from 'react';
import { IconButton } from './IconButton';
import { IconArrowUp, IconPaperClip, IconXMark, IconPhoto, IconStop } from '../constants';

interface ChatInputProps {
  onSendMessage: (
    message: string,
    image?: { base64Data: string; mimeType: string; fileName: string }
  ) => void;
  isLoading: boolean;
  modelSupportsImage: boolean;
  onStopGenerating?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, modelSupportsImage, onStopGenerating }) => {
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ base64Data: string; mimeType: string; fileName: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(event.target.value);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        alert('Unsupported file type. Please upload JPG, PNG, or WebP images.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('File size exceeds 5MB limit.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage({
          base64Data: reader.result as string,
          mimeType: file.type,
          fileName: file.name,
        });
      };
      reader.readAsDataURL(file);
    }
    // Reset file input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
  };

  const handleSubmit = () => {
    if ((inputText.trim() || selectedImage) && !isLoading) {
      onSendMessage(inputText.trim(), selectedImage ?? undefined);
      setInputText('');
      setSelectedImage(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isLoading) {
      event.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      if (textareaRef.current.scrollHeight > 200) {
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
     if (!modelSupportsImage && selectedImage) {
      setSelectedImage(null); // Clear image if model switched to non-image one
    }
  }, [isLoading, modelSupportsImage, selectedImage]);


  return (
    <div className="px-4 pb-4 pt-2 bg-gray-800 border-t border-gray-700">
      <div className="max-w-3xl mx-auto">
        {selectedImage && (
          <div className="mb-2 p-2 border border-gray-600 rounded-lg bg-gray-700 relative max-w-xs w-fit">
            <img 
              src={selectedImage.base64Data} 
              alt={selectedImage.fileName} 
              className="max-h-32 max-w-full rounded object-contain" 
            />
            <IconButton
              icon={<IconXMark className="w-4 h-4" />}
              onClick={clearImage}
              ariaLabel="Clear image"
              className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 hover:bg-opacity-90 p-1 rounded-full"
            />
             <p className="text-xs text-gray-400 mt-1 truncate">{selectedImage.fileName}</p>
          </div>
        )}
        <div className="relative flex items-end p-1 bg-gray-700 rounded-xl shadow-md">
          {modelSupportsImage && (
            <>
              <IconButton
                icon={<IconPaperClip className="w-5 h-5" />}
                onClick={() => fileInputRef.current?.click()}
                ariaLabel="Upload image"
                className="m-1 text-gray-400 hover:text-teal-400"
                disabled={isLoading}
              />
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isLoading}
              />
            </>
          )}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={modelSupportsImage ? "Ask anything or describe image..." : "Ask anything..."}
            rows={1}
            className="flex-grow p-3 bg-transparent text-gray-100 placeholder-gray-400 resize-none focus:outline-none overflow-y-hidden max-h-[200px]"
            disabled={isLoading}
          />
          {isLoading ? (
            <IconButton
              icon={<IconStop className="w-5 h-5" />}
              onClick={onStopGenerating}
              ariaLabel="Stop generating"
              className="m-1 bg-red-500 hover:bg-red-600 text-white"
              disabled={!onStopGenerating} // Should always be enabled if isLoading is true
            />
          ) : (
            <IconButton
              icon={<IconArrowUp className="w-5 h-5" />}
              onClick={handleSubmit}
              disabled={(!inputText.trim() && !selectedImage)}
              ariaLabel="Send message"
              className={`m-1 ${ (inputText.trim() || selectedImage) ? 'bg-teal-500 hover:bg-teal-600 text-white' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
            />
          )}
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center mt-2 px-2">
        Genie can make mistakes. Consider checking important information.
      </p>
    </div>
  );
};