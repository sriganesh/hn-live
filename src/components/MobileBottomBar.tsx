import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { navigationItems } from '../config/navigation';

interface MobileBottomBarProps {
  theme: 'green' | 'og' | 'dog';
  onShowSearch: () => void;
  onCloseSearch: () => void;
  onShowSettings: () => void;
  isRunning?: boolean;
}

export function MobileBottomBar({ theme, onShowSearch, onCloseSearch, onShowSettings, isRunning }: MobileBottomBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Handle clicking outside the more menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMoreMenu && !(e.target as Element).closest('.more-menu-container')) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMoreMenu]);

  const isActive = (path: string) => location.pathname === path;

  const iconClass = `w-6 h-6 ${
    theme === 'green' 
      ? 'text-green-500' 
      : 'text-[#ff6600]'
  }`;

  const labelClass = `text-xs mt-1 ${
    theme === 'green'
      ? 'text-green-400'
      : theme === 'og'
      ? 'text-[#828282]'
      : 'text-[#828282]'
  }`;

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 border-t bg-inherit z-50">
      <div className={`flex items-center justify-around py-2 px-4 ${
        theme === 'green'
          ? 'border-green-500/20 bg-black'
          : theme === 'og'
          ? 'border-[#ff6600]/10 bg-[#f6f6ef]'
          : 'border-[#828282]/20 bg-[#1a1a1a]'
      }`}>
        {/* Live Feed */}
        <button 
          onClick={() => {
            onCloseSearch();
            navigate('/');
          }}
          className="flex flex-col items-center"
        >
          <div className={`${iconClass} ${isActive('/') ? 'opacity-100' : 'opacity-50'}`}>
            {isRunning ? (
              <span className="relative flex h-6 w-6">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  theme === 'green' ? 'bg-green-500' : 'bg-[#ff6600]'
                } opacity-20`}></span>
                <span className={`relative inline-flex rounded-full h-6 w-6 ${
                  theme === 'green' ? 'bg-green-500' : 'bg-[#ff6600]'
                } opacity-50`}></span>
              </span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            )}
          </div>
          <span className={labelClass}>Live</span>
        </button>

        {/* Front Page */}
        <button 
          onClick={() => {
            onCloseSearch();
            navigate('/front');
          }}
          className="flex flex-col items-center"
        >
          <div className={`${iconClass} ${isActive('/front') ? 'opacity-100' : 'opacity-50'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
          <span className={labelClass}>Front</span>
        </button>

        {/* Search */}
        <button 
          onClick={onShowSearch}
          className="flex flex-col items-center"
        >
          <div className={`${iconClass} opacity-50 hover:opacity-75`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <span className={labelClass}>Search</span>
        </button>

        {/* Settings */}
        <button 
          onClick={onShowSettings}
          className="flex flex-col items-center"
        >
          <div className={`${iconClass} opacity-50 hover:opacity-75`}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className={labelClass}>Settings</span>
        </button>

        {/* More Menu */}
        <div className="flex flex-col items-center more-menu-container">
          <button 
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="flex flex-col items-center"
          >
            <div className={`${iconClass} opacity-50 hover:opacity-75`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className={labelClass}>More</span>
          </button>

          {/* More Menu Dropdown */}
          {showMoreMenu && (
            <div className={`absolute bottom-full right-0 mb-2 py-2 w-48 rounded-lg shadow-lg z-50 border ${
              theme === 'green'
                ? 'bg-black border-green-500/30 text-green-400'
                : theme === 'og'
                ? 'bg-[#f6f6ef] border-[#ff6600]/30 text-[#828282]'
                : 'bg-[#1a1a1a] border-[#828282]/30 text-[#828282]'
            }`}>
              {navigationItems.map((item) => (
                item.path === 'separator' ? (
                  <div key="separator" className="border-t border-current/10 my-2" />
                ) : item.external ? (
                  <a
                    key={item.path}
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-2 hover:opacity-75"
                    onClick={() => setShowMoreMenu(false)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <button
                    key={item.path}
                    onClick={() => {
                      onCloseSearch();
                      navigate(item.path);
                      setShowMoreMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:opacity-75"
                  >
                    {item.label}
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 