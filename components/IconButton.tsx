
import React from 'react';

interface IconButtonProps {
  icon: React.ReactNode;
  onClick?: () => void;
  className?: string;
  ariaLabel: string;
  disabled?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({ icon, onClick, className, ariaLabel, disabled }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`p-2 rounded-md text-gray-400 hover:text-gray-200 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon}
    </button>
  );
};
