import React, { useEffect, useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'green' | 'og' | 'dog';
  options: {
    theme: 'green' | 'og' | 'dog';
    autoscroll: boolean;
    directLinks: boolean;
    fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
    classicLayout: boolean;
    showCommentParents: boolean;
    font: FontOption;
  };
  onUpdateOptions: (options: any) => void;
  colorizeUsernames: boolean;
  onColorizeUsernamesChange: (value: boolean) => void;
  isMobile?: boolean;
}

const fontSizeOptions = {
  'xs': 'Extra Small',
  'sm': 'Small',
  'base': 'Medium',
  'lg': 'Large',
  'xl': 'Extra Large',
  '2xl': 'XXL'
} as const;

const sizeLabels = {
  'xs': 'XS',
  'sm': 'S',
  'base': 'M',
  'lg': 'L',
  'xl': 'XL',
  '2xl': 'XXL'
};

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  theme,
  options,
  onUpdateOptions,
  colorizeUsernames,
  onColorizeUsernamesChange,
  isMobile = window.innerWidth < 640
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

  // Add state for showing the reload message
  const [showReloadMessage, setShowReloadMessage] = useState(false);

  // Add state for mobile notification
  const [showMobileReloadNotif, setShowMobileReloadNotif] = useState(false);

  // Handle the setting change
  const handleCommentParentsChange = () => {
    const newOptions = {
      ...options,
      showCommentParents: !options.showCommentParents
    };
    onUpdateOptions(newOptions);

    // Show appropriate notification based on device
    if (isMobile) {
      setShowMobileReloadNotif(true);
      // Hide after 3 seconds
      setTimeout(() => setShowMobileReloadNotif(false), 3000);
    } else {
      // Show reload message for desktop
      setShowReloadMessage(true);
      setTimeout(() => setShowReloadMessage(false), 1000);
    }
  };

  if (!isOpen) return null;

  const themeColors = theme === 'green'
    ? 'text-green-400 bg-black border-green-500/30'
    : theme === 'og'
    ? 'text-[#828282] bg-[#f6f6ef] border-[#ff6600]/30'
    : 'text-[#828282] bg-[#1a1a1a] border-[#ff6600]/30';

  return (
    <div className="fixed inset-0 z-[100]">
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      <div className="relative z-[101] flex items-center justify-center h-full">
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
            <div className="space-y-4 mt-6">
              <div className="text-sm opacity-75">FONTS</div>
              
              <div className="space-y-4">
                {/* Font Size Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Size: {fontSizeOptions[options.fontSize]}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="1"
                      value={Object.keys(fontSizeOptions).indexOf(options.fontSize)}
                      onChange={(e) => {
                        const newSize = Object.keys(fontSizeOptions)[parseInt(e.target.value)] as keyof typeof fontSizeOptions;
                        onUpdateOptions({ ...options, fontSize: newSize });
                      }}
                      className={`
                        w-full h-2 rounded-lg appearance-none cursor-pointer
                        ${theme === 'green'
                          ? 'bg-green-500/30'
                          : theme === 'og'
                          ? 'bg-[#ff6600]/30'
                          : 'bg-[#828282]/30'
                        }
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-6
                        [&::-webkit-slider-thumb]:h-6
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:transition-all
                        [&::-webkit-slider-thumb]:-mt-2
                        ${theme === 'green'
                          ? '[&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:hover:bg-green-400'
                          : theme === 'og'
                          ? '[&::-webkit-slider-thumb]:bg-[#ff6600] [&::-webkit-slider-thumb]:hover:bg-[#ff6600]/80'
                          : '[&::-webkit-slider-thumb]:bg-[#828282] [&::-webkit-slider-thumb]:hover:bg-[#828282]/80'
                        }
                        [&::-moz-range-thumb]:w-6
                        [&::-moz-range-thumb]:h-6
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:border-0
                        [&::-moz-range-thumb]:cursor-pointer
                        [&::-moz-range-thumb]:transition-all
                        [&::-moz-range-thumb]:-mt-2
                        ${theme === 'green'
                          ? '[&::-moz-range-thumb]:bg-green-500 [&::-moz-range-thumb]:hover:bg-green-400'
                          : theme === 'og'
                          ? '[&::-moz-range-thumb]:bg-[#ff6600] [&::-moz-range-thumb]:hover:bg-[#ff6600]/80'
                          : '[&::-moz-range-thumb]:bg-[#828282] [&::-moz-range-thumb]:hover:bg-[#828282]/80'
                        }
                      `}
                    />
                    
                    <div className="flex justify-between text-xs mt-2 opacity-75">
                      {Object.keys(fontSizeOptions).map((size, index) => (
                        <span 
                          key={size}
                          className={`w-6 text-center ${
                            index === 0 ? 'text-left' : 
                            index === Object.keys(fontSizeOptions).length - 1 ? 'text-right' : ''
                          }`}
                        >
                          {sizeLabels[size as keyof typeof sizeLabels]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Font Family Selection */}
                <div className="relative">
                  <select
                    value={options.font}
                    onChange={(e) => onUpdateOptions({
                      ...options,
                      font: e.target.value
                    })}
                    className={`
                      w-full px-3 py-2 pr-8 rounded
                      ${theme === 'green' 
                        ? 'bg-black border border-green-500/30 text-green-400 focus:border-green-500/50' 
                        : theme === 'og'
                        ? 'bg-[#f6f6ef] border border-[#ff6600]/30 text-[#828282] focus:border-[#ff6600]/50'
                        : 'bg-[#1a1a1a] border border-[#828282]/30 text-[#828282] focus:border-[#828282]/50'
                      }
                      appearance-none cursor-pointer hover:opacity-80 transition-opacity
                      focus:outline-none
                    `}
                  >
                    <option value="mono">System Monospace</option>
                    <option value="jetbrains">JetBrains Mono</option>
                    <option value="fira">Fira Code</option>
                    <option value="source">Source Code Pro</option>
                    <option value="sans">Sans Serif</option>
                    <option value="serif">Serif</option>
                    <option value="system">System Default</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                    <svg className="h-4 w-4 fill-current opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Terminal Behavior */}
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
                <button
                  onClick={handleCommentParentsChange}
                  className={`hover:opacity-75 transition-opacity block w-full text-left`}
                >
                  <div className="flex items-center gap-2">
                    <span>[{options.showCommentParents ? 'x' : ' '}] Show story context</span>
                    {!isMobile && showReloadMessage && (
                      <span className="text-sm opacity-75">
                        [page reload required]
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* View Options */}
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

      {/* Add mobile notification overlay */}
      {showMobileReloadNotif && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] pointer-events-none">
          <div className={`
            text-sm animate-fade-out px-4 py-2 rounded-lg border
            ${theme === 'og'
              ? 'bg-[#1a1a1a] text-[#f6f6ef] border-[#ff6600]/30'
              : theme === 'dog'
              ? 'bg-[#f6f6ef] text-[#1a1a1a] border-[#ff6600]/30'
              : theme === 'green'
              ? 'bg-black/90 text-green-400 border-green-500/30'
              : ''
            }
          `}>
            Tap the Live button twice to apply changes
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsModal; 