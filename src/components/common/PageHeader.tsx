import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeOption } from '../../types/common';

interface PageHeaderProps {
  theme: ThemeOption;
  title: string;
  isRunning: boolean;
  onShowSearch: () => void;
  onShowGrep: () => void;
  onShowSettings: () => void;
  showGrep: boolean;
  grepFilter: string;
  onGrepFilterChange: (value: string) => void;
  currentPage?: string;
  unreadCount?: number;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  theme,
  title,
  isRunning,
  onShowSearch,
  onShowGrep,
  onShowSettings,
  showGrep,
  grepFilter,
  onGrepFilterChange,
  currentPage = '',
  unreadCount = 0
}) => {
  const navigate = useNavigate();

  const themeColors = theme === 'green'
    ? 'text-green-400'
    : theme === 'og'
    ? 'text-[#828282]'
    : 'text-[#828282]';

  const headerBg = theme === 'green'
    ? 'bg-black'
    : theme === 'og'
    ? 'bg-[#ff6600]/90'
    : 'bg-[#1a1a1a]';

  const headerTextColor = theme === 'og' 
    ? 'text-white' 
    : theme === 'dog'
    ? 'text-[#ff6600]'
    : '';

  const pages = [
    { id: 'front', label: 'FRONT PAGE', path: '/front' },
    { id: 'trending', label: 'TRENDING', path: '/trending' },
    { id: 'show', label: 'SHOW', path: '/show' },
    { id: 'ask', label: 'ASK', path: '/ask' },
    { id: 'best', label: 'BEST', path: '/best' },
    { id: 'jobs', label: 'JOBS', path: '/jobs' }
  ];

  return (
    <>
      {/* Desktop view */}
      <div className={`hidden sm:flex items-center justify-between py-3 px-6 ${headerBg} ${headerTextColor} fixed top-0 left-0 right-0 z-10`}>
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/')}
            className={`font-bold tracking-wider flex items-center gap-2 relative cursor-pointer hover:opacity-75 transition-opacity`}
          >
            HN
            <span className="animate-pulse">
              <span className={`inline-block w-2 h-2 rounded-full ${
                isRunning 
                  ? theme === 'green'
                    ? 'bg-green-500'
                    : 'bg-red-500'
                  : 'bg-gray-500'
              }`}></span>
            </span>
            LIVE
          </button>
          <span className={`font-bold ml-2`}>
            /
          </span>
          <span className={`font-bold ml-2`}>
            {title}
          </span>
          {title === 'FRONT PAGE' && (
            <button
              onClick={() => navigate('/frontpage-history')}
              className={`ml-4 hover:opacity-75`}
            >
              [VIEW HISTORY]
            </button>
          )}
        </div>

        {/* Desktop controls */}
        <div className="hidden sm:flex items-center gap-3">
          {pages.map(page => (
            <button 
              key={page.id}
              onClick={() => navigate(page.path)}
              className={`${currentPage === page.id ? 'opacity-30 hover:opacity-50' : ''}`}
            >
              [{page.label}]
            </button>
          ))}
          <button 
            onClick={onShowSearch}
            title="Ctrl/Cmd + K"
          >
            [SEARCH]
          </button>
          {showGrep ? (
            <div className="flex items-center gap-2">
              <span>grep:</span>
              <input
                type="text"
                value={grepFilter}
                onChange={(e) => onGrepFilterChange(e.target.value)}
                className={`bg-transparent border-b border-current outline-none w-32 px-1`}
                placeholder="filter..."
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={onShowGrep}
              title="Ctrl/Cmd + F"
            >
              [GREP]
            </button>
          )}
          <button 
            onClick={() => navigate('/dashboard')}
            className={`relative`}
          >
            [DASHBOARD]
            {unreadCount > 0 && (
              <span className={`absolute -top-2 -right-2 w-5 h-5 text-xs rounded-full inline-flex items-center justify-center ${
                theme === 'green' 
                  ? 'bg-green-500 text-black' 
                  : 'bg-white text-[#ff6600]'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={onShowSettings}
          >
            [SETTINGS]
          </button>
          <button 
            onClick={() => navigate(-1)}
            className="opacity-75 hover:opacity-100"
          >
            [ESC]
          </button>
        </div>
      </div>

      {/* Mobile view */}
      <div className={`sm:hidden py-2 px-4 ${headerBg} ${headerTextColor} fixed top-0 left-0 right-0 z-10`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/')}
              className={`font-bold tracking-wider flex items-center gap-2 relative cursor-pointer hover:opacity-75 transition-opacity`}
            >
              HN
              <span className="animate-pulse">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  isRunning 
                    ? theme === 'green'
                      ? 'bg-green-500'
                      : 'bg-red-500'
                    : 'bg-gray-500'
                }`}></span>
              </span>
              LIVE
            </button>
            <span className={`font-bold ml-2`}>
              / {title}
            </span>
            {title === 'FRONT PAGE' && (
              <button
                onClick={() => navigate('/frontpage-history')}
                className={`ml-2 text-sm hover:opacity-75`}
              >
                [HISTORY]
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}; 