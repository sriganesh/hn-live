import { useNavigate } from 'react-router-dom';
import { MobileMoreMenu } from './MobileMoreMenu';
import { useState, useEffect } from 'react';

interface MobileBottomBarProps {
  theme: 'green' | 'og' | 'dog';
  onShowSearch: () => void;
  onShowSettings: () => void;
}

export function MobileBottomBar({ theme, onShowSearch, onShowSettings }: MobileBottomBarProps) {
  const navigate = useNavigate();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreMenu && !(event.target as Element).closest('.more-menu-container')) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMoreMenu]);

  return (
    <div className="fixed sm:hidden bottom-0 left-0 right-0 mobile-bottom-bar border-t z-50">
      <div className={`
        ${theme === 'green'
          ? 'bg-black/90 border-green-500/30 text-green-400'
          : theme === 'og'
          ? 'bg-[#f6f6ef]/90 border-[#ff6600]/30 text-[#828282]'
          : 'bg-[#1a1a1a]/90 border-[#828282]/30 text-[#828282]'
        } grid grid-cols-5 divide-x ${
          theme === 'green'
            ? 'divide-green-500/30'
            : theme === 'og'
            ? 'divide-[#ff6600]/30'
            : 'divide-[#828282]/30'
        }`}
      >
        {/* Home Button */}
        <button
          onClick={() => navigate('/')}
          className="p-4 flex items-center justify-center relative"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        </button>

        {/* Stories/Front Page Button */}
        <button
          onClick={() => navigate('/front')}
          className="p-4 flex items-center justify-center relative"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
            <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
          </svg>
        </button>

        {/* More Menu Button */}
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className="p-4 flex items-center justify-center relative more-menu-container"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
          </svg>

          <MobileMoreMenu 
            theme={theme}
            showMenu={showMoreMenu}
            onClose={() => setShowMoreMenu(false)}
          />
        </button>

        {/* Search Button */}
        <button
          onClick={onShowSearch}
          className="p-4 flex items-center justify-center relative"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Settings Button */}
        <button
          onClick={onShowSettings}
          className="p-4 flex items-center justify-center relative"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
} 