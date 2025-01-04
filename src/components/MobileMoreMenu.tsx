import { useNavigate } from 'react-router-dom';
import { MOBILE_MENU_ITEMS } from '../config/navigation';

interface MobileMoreMenuProps {
  theme: 'green' | 'og' | 'dog';
  showMenu: boolean;
  onClose: () => void;
}

export function MobileMoreMenu({ theme, showMenu, onClose }: MobileMoreMenuProps) {
  const navigate = useNavigate();

  if (!showMenu) return null;

  const handleClick = (item: typeof MOBILE_MENU_ITEMS[0]) => (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.external) {
      window.open(item.path, '_blank', 'noopener,noreferrer');
    } else {
      navigate(item.path);
    }
    onClose();
  };

  return (
    <div className={`
      absolute bottom-full left-0 mb-2 w-48 py-2
      border rounded-lg shadow-lg z-50
      ${theme === 'green'
        ? 'bg-black border-green-500/30 text-green-400'
        : theme === 'og'
        ? 'bg-white border-[#ff6600]/30 text-[#828282]'
        : 'bg-black border-[#828282]/30 text-[#828282]'
      }
    `}>
      {MOBILE_MENU_ITEMS.map((item) => (
        <button
          key={item.path}
          onClick={handleClick(item)}
          className={`w-full px-4 py-2 text-left font-normal
            ${theme === 'green'
              ? 'hover:bg-green-900 hover:text-green-400'
              : theme === 'og'
              ? 'hover:bg-gray-100 hover:text-[#828282]'
              : 'hover:bg-gray-900 hover:text-[#828282]'
            }
          `}
        >
          {item.label}
          {item.external && (
            <span className="ml-1 opacity-50">↗</span>
          )}
        </button>
      ))}
    </div>
  );
} 