import React, { useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'green' | 'og' | 'dog';
  options: {
    theme: 'green' | 'og' | 'dog';
    autoscroll: boolean;
    directLinks: boolean;
    fontSize: 'xs' | 'sm' | 'base';
    classicLayout: boolean;
  };
  onUpdateOptions: (newOptions: {
    theme: 'green' | 'og' | 'dog';
    autoscroll: boolean;
    directLinks: boolean;
    fontSize: 'xs' | 'sm' | 'base';
    classicLayout: boolean;
  }) => void;
  colorizeUsernames: boolean;
  onColorizeUsernamesChange: (value: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  theme,
  options,
  onUpdateOptions,
  colorizeUsernames,
  onColorizeUsernamesChange
}) => {
  // Add ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const themeColors = theme === 'green'
    ? 'text-green-400 bg-black border-green-500/30'
    : theme === 'og'
    ? 'text-[#828282] bg-[#f6f6ef] border-[#ff6600]/30'
    : 'text-[#828282] bg-[#1a1a1a] border-[#ff6600]/30';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className={`w-full max-w-lg ${themeColors} border p-4 shadow-lg font-mono`}>
        {/* Terminal-style header */}
        <div className="flex items-center justify-between mb-6 border-b border-current pb-2">
          <div className="flex items-center gap-2">
            <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'}`}>
              $
            </span>
            <span>settings.conf</span>
          </div>
          <button 
            onClick={onClose}
            className="hover:opacity-75"
          >
            [×]
          </button>
        </div>

        <div className="space-y-6">
          {/* Theme Selection */}
          <div className="space-y-2">
            <div className="text-sm opacity-75">THEME</div>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => onUpdateOptions({ ...options, theme: 'og' })}
                className={`hover:opacity-75 transition-opacity`}
              >
                [{options.theme === 'og' ? 'x' : ' '}] Classic
              </button>
              <button
                onClick={() => onUpdateOptions({ ...options, theme: 'dog' })}
                className={`hover:opacity-75 transition-opacity`}
              >
                [{options.theme === 'dog' ? 'x' : ' '}] Dark
              </button>
              <button
                onClick={() => onUpdateOptions({ ...options, theme: 'green' })}
                className={`hover:opacity-75 transition-opacity`}
              >
                [{options.theme === 'green' ? 'x' : ' '}] Terminal
              </button>
            </div>
          </div>

          {/* Font Size Selection */}
          <div className="space-y-2">
            <div className="text-sm opacity-75">FONT SIZE</div>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => onUpdateOptions({ ...options, fontSize: 'xs' })}
                className={`hover:opacity-75 transition-opacity`}
              >
                [{options.fontSize === 'xs' ? 'x' : ' '}] Small
              </button>
              <button
                onClick={() => onUpdateOptions({ ...options, fontSize: 'sm' })}
                className={`hover:opacity-75 transition-opacity`}
              >
                [{options.fontSize === 'sm' ? 'x' : ' '}] Medium
              </button>
              <button
                onClick={() => onUpdateOptions({ ...options, fontSize: 'base' })}
                className={`hover:opacity-75 transition-opacity`}
              >
                [{options.fontSize === 'base' ? 'x' : ' '}] Large
              </button>
            </div>
          </div>

          {/* Terminal Behavior Options */}
          <div className="space-y-2">
            <div className="text-sm opacity-75">TERMINAL BEHAVIOR</div>
            <div className="space-y-2">
              <button
                onClick={() => onUpdateOptions({ ...options, autoscroll: !options.autoscroll })}
                className={`hover:opacity-75 transition-opacity block`}
              >
                [{options.autoscroll ? 'x' : ' '}] Auto-scroll feed
              </button>
              <button
                onClick={() => onUpdateOptions({ ...options, directLinks: !options.directLinks })}
                className={`hover:opacity-75 transition-opacity block`}
              >
                [{options.directLinks ? 'x' : ' '}] Direct HN links
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm opacity-75">VIEW OPTIONS</div>
            <div className="space-y-2">
              <button
                onClick={() => onColorizeUsernamesChange(!colorizeUsernames)}
                className={`hover:opacity-75 transition-opacity block`}
              >
                [{colorizeUsernames ? 'x' : ' '}] Colorize usernames
              </button>
              <button
                onClick={() => onUpdateOptions({
                  ...options,
                  classicLayout: !options.classicLayout
                })}
                className={`hover:opacity-75 transition-opacity block`}
              >
                [{options.classicLayout ? 'x' : ' '}] Classic HN layout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 