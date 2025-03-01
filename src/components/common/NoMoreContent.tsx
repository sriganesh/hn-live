import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeOption } from '../../types/common';

interface NoMoreContentProps {
  theme: ThemeOption;
  message?: string;
  onShowSearch?: () => void;
  searchMessage?: string;
  backMessage?: string;
}

export const NoMoreContent: React.FC<NoMoreContentProps> = ({
  theme,
  message = "That's all for now!",
  onShowSearch,
  searchMessage = "Search all posts in history",
  backMessage = "Head back to the live feed to see real-time stories and discussions"
}) => {
  const navigate = useNavigate();
  
  const themeColors = theme === 'green'
    ? 'text-green-500/50'
    : 'text-[#ff6600]/50';
  
  const linkColors = theme === 'green'
    ? 'text-green-400'
    : 'text-[#ff6600]';

  return (
    <div className="space-y-3 text-center py-8">
      <div className={`${themeColors} text-sm`}>
        {message}
      </div>
      
      {onShowSearch && (
        <div className="text-sm space-y-2">
          <div>
            <button
              onClick={onShowSearch}
              className={`${linkColors} hover:opacity-75`}
            >
              → {searchMessage}
            </button>
          </div>
          <div>
            <span className="opacity-50">or</span>
          </div>
          <div>
            <button
              onClick={() => navigate('/')}
              className={`${linkColors} hover:opacity-75`}
            >
              → {backMessage}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 