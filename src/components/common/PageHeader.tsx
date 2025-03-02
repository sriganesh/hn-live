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
      <div className="hidden sm:flex items-center justify-between mb-4">
        <div className="flex items-center">
          <button 
            onClick={() => navigate('/')}
            className={`${
              theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
            } font-bold tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity`}
          >
            <span>HN</span>
            <span className="animate-pulse">
              <span className={`inline-block w-2 h-2 rounded-full ${
                isRunning 
                  ? theme === 'green'
                    ? 'bg-green-500'
                    : 'bg-[#ff6600]'
                  : 'bg-gray-500'
              }`}></span>
            </span>
            <span>LIVE</span>
          </button>
          <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
            /
          </span>
          <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
            {title}
          </span>
          {title === 'FRONT PAGE' && (
            <button
              onClick={() => navigate('/frontpage-history')}
              className={`ml-4 ${themeColors} hover:opacity-75`}
            >
              [VIEW HISTORY]
            </button>
          )}
        </div>

        {/* Desktop controls */}
        <div className="hidden sm:flex items-center gap-4">
          {pages.map(page => (
            <button 
              key={page.id}
              onClick={() => navigate(page.path)}
              className={`${themeColors} ${currentPage === page.id ? 'opacity-30 hover:opacity-50' : ''}`}
            >
              [{page.label}]
            </button>
          ))}
          <button 
            onClick={onShowSearch}
            className={themeColors}
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
                className={`bg-transparent border-b border-current outline-none w-32 px-1 ${themeColors}`}
                placeholder="filter..."
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={onShowGrep}
              className={themeColors}
              title="Ctrl/Cmd + F"
            >
              [GREP]
            </button>
          )}
          <button 
            onClick={() => navigate('/dashboard')}
            className={`${themeColors} relative`}
          >
            [DASHBOARD]
            {unreadCount > 0 && (
              <span className={`absolute -top-2 -right-2 w-5 h-5 text-xs rounded-full inline-flex items-center justify-center ${
                theme === 'green' 
                  ? 'bg-green-500 text-black' 
                  : 'bg-[#ff6600] text-white'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={onShowSettings}
            className={themeColors}
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
      <div className="sm:hidden mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/')}
              className={`${
                theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
              } font-bold tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity`}
            >
              <span>HN</span>
              <span className="animate-pulse">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  isRunning 
                    ? theme === 'green'
                      ? 'bg-green-500'
                      : 'bg-[#ff6600]'
                    : 'bg-gray-500'
                }`}></span>
              </span>
              <span>LIVE</span>
            </button>
            <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
              / {title}
            </span>
            {title === 'FRONT PAGE' && (
              <button
                onClick={() => navigate('/frontpage-history')}
                className={`ml-2 text-sm ${themeColors} hover:opacity-75`}
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