import React from 'react';
import { ThemeOption } from '../../types/common';

interface LoadingIndicatorProps {
  theme: ThemeOption;
  message?: string;
  isLoadingMore?: boolean;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  theme,
  message = 'Loading...',
  isLoadingMore = false
}) => {
  const themeColors = theme === 'green'
    ? 'text-green-400'
    : 'text-[#ff6600]';

  if (isLoadingMore) {
    return (
      <div className={`${themeColors} opacity-75 text-center py-2 flex items-center justify-center`}>
        <div className="flex space-x-1">
          <span className="animate-bounce delay-75 h-2 w-2 rounded-full bg-current inline-block"></span>
          <span className="animate-bounce delay-150 h-2 w-2 rounded-full bg-current inline-block"></span>
          <span className="animate-bounce delay-300 h-2 w-2 rounded-full bg-current inline-block"></span>
        </div>
        <span className="ml-2 text-sm">Loading more...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full">
      <div className={`${themeColors} opacity-75 flex items-center`}>
        <span className="animate-pulse mr-2">
          <span className={`inline-block w-2 h-2 rounded-full ${
            theme === 'green'
              ? 'bg-green-500'
              : 'bg-[#ff6600]'
          }`}></span>
        </span>
        {message}
      </div>
    </div>
  );
}; 