import React, { useEffect, useState } from 'react';
import { startTracking } from '../registerServiceWorker';
import { useNavigate } from 'react-router-dom';

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
    showBackToTop: boolean;
    useAlgoliaApi: boolean;
  };
  onUpdateOptions: (options: any) => void;
  colorizeUsernames: boolean;
  onColorizeUsernamesChange: (value: boolean) => void;
  isMobile?: boolean;
  setStoredBackToTop: (value: boolean) => void;
  hnUsername: string | null;
  onUpdateHnUsername: (username: string | null) => void;
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
  isMobile = window.innerWidth < 640,
  setStoredBackToTop,
  hnUsername,
  onUpdateHnUsername
}) => {
  const navigate = useNavigate();

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

  // Add separate state variables for each setting's reload message
  const [showStoryContextReload, setShowStoryContextReload] = useState(false);
  const [showDirectLinksReload, setShowDirectLinksReload] = useState(false);

  // Add state for mobile notification
  const [showMobileReloadNotif, setShowMobileReloadNotif] = useState(false);

  // Add state for collapsed sections
  const [collapsedSections, setCollapsedSections] = useState({
    terminal: true,
    feedView: true,
    storyView: true,
    account: true
  });

  // Add state for HN username input
  const [usernameInput, setUsernameInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Toggle handler for sections
  const toggleSection = (section: 'terminal' | 'feedView' | 'storyView' | 'account') => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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
      setTimeout(() => setShowMobileReloadNotif(false), 3000);
    } else {
      setShowStoryContextReload(true);
      setTimeout(() => setShowStoryContextReload(false), 1000);
    }
  };

  // Create a handler for direct links change
  const handleDirectLinksChange = () => {
    const newOptions = {
      ...options,
      directLinks: !options.directLinks
    };
    onUpdateOptions(newOptions);

    // Show appropriate notification based on device
    if (isMobile) {
      setShowMobileReloadNotif(true);
      setTimeout(() => setShowMobileReloadNotif(false), 3000);
    } else {
      setShowDirectLinksReload(true);
      setTimeout(() => setShowDirectLinksReload(false), 1000);
    }
  };

  // Update the validateAndSaveUsername function
  const validateAndSaveUsername = async () => {
    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await fetch(`https://hacker-news.firebaseio.com/v0/user/${usernameInput}.json`);
      const userData = await response.json();

      if (!userData) {
        setValidationError('User not found');
      } else {
        localStorage.setItem('hn-username', usernameInput);
        startTracking(usernameInput);
        onUpdateHnUsername(usernameInput);
        setUsernameInput('');
        onClose();  // Close settings modal first
        navigate('/profile');  // Navigate to profile every time username is set
      }
    } catch (error) {
      setValidationError('Error validating username');
    } finally {
      setIsValidating(false);
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
              <div className="text-sm font-bold uppercase tracking-wider mb-2">THEME</div>
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
              <div className="text-sm font-bold uppercase tracking-wider mb-2">FONTS</div>
              
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
              <button 
                onClick={() => toggleSection('terminal')}
                className="w-full flex items-center justify-between text-sm font-bold uppercase tracking-wider mb-2"
              >
                <span>TERMINAL BEHAVIOR</span>
                <svg 
                  className={`w-4 h-4 transform transition-transform ${collapsedSections.terminal ? '' : 'rotate-180'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`space-y-2 transition-all duration-200 ${collapsedSections.terminal ? 'hidden' : ''}`}>
                <button
                  onClick={() => onUpdateOptions({ ...options, autoscroll: !options.autoscroll })}
                  className={`hover:opacity-75 transition-opacity block`}
                >
                  [{options.autoscroll ? 'x' : ' '}] Auto-scroll feed
                </button>
                <button
                  onClick={handleDirectLinksChange}
                  className={`hover:opacity-75 transition-opacity block w-full text-left`}
                >
                  <div className="flex items-center gap-2">
                    <span>[{options.directLinks ? 'x' : ' '}] Direct HN links</span>
                    {!isMobile && showDirectLinksReload && (
                      <span className="text-sm opacity-75">
                        [page reload may be required]
                      </span>
                    )}
                  </div>
                </button>
                <button
                  onClick={handleCommentParentsChange}
                  className={`hover:opacity-75 transition-opacity block w-full text-left`}
                >
                  <div className="flex items-center gap-2">
                    <span>[{options.showCommentParents ? 'x' : ' '}] Show story context</span>
                    {!isMobile && showStoryContextReload && (
                      <span className="text-sm opacity-75">
                        [page reload required]
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Feed View Options */}
            <div className="space-y-2">
              <button 
                onClick={() => toggleSection('feedView')}
                className="w-full flex items-center justify-between text-sm font-bold uppercase tracking-wider mb-2"
              >
                <span>FEED VIEW OPTIONS</span>
                <svg 
                  className={`w-4 h-4 transform transition-transform ${collapsedSections.feedView ? '' : 'rotate-180'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`space-y-2 transition-all duration-200 ${collapsedSections.feedView ? 'hidden' : ''}`}>
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

            {/* Story View Options */}
            <div className="space-y-2">
              <button 
                onClick={() => toggleSection('storyView')}
                className="w-full flex items-center justify-between text-sm font-bold uppercase tracking-wider mb-2"
              >
                <span>STORY VIEW OPTIONS</span>
                <svg 
                  className={`w-4 h-4 transform transition-transform ${collapsedSections.storyView ? '' : 'rotate-180'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`space-y-2 transition-all duration-200 ${collapsedSections.storyView ? 'hidden' : ''}`}>
                <button
                  onClick={() => onUpdateOptions({ ...options, useAlgoliaApi: !options.useAlgoliaApi })}
                  className={`hover:opacity-75 transition-opacity block text-left whitespace-normal leading-tight`}
                >
                  <div className="flex">
                    <span className="mr-2">[{options.useAlgoliaApi ? 'x' : ' '}]</span>
                    <span>Use Algolia API for stories (faster)</span>
                  </div>
                </button>
                <div className="text-xs opacity-60 ml-6 mt-1">
                  Note: If stories fail to load, try unchecking this option
                </div>
                <button
                  onClick={() => {
                    const newValue = !options.showBackToTop;
                    setStoredBackToTop(newValue);
                    onUpdateOptions({
                      ...options,
                      showBackToTop: newValue
                    });
                  }}
                  className="hover:opacity-75 transition-opacity block"
                >
                  [{options.showBackToTop ? 'x' : ' '}] Show scroll to top
                </button>
              </div>
            </div>

            {/* Account */}
            <div className="space-y-2">
              <button 
                onClick={() => toggleSection('account')}
                className="w-full flex items-center justify-between text-sm font-bold uppercase tracking-wider mb-2"
              >
                <span>ACCOUNT</span>
                <svg 
                  className={`w-4 h-4 transform transition-transform ${collapsedSections.account ? '' : 'rotate-180'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`space-y-4 transition-all duration-200 ${collapsedSections.account ? 'hidden' : ''}`}>
                {hnUsername ? (
                  // Show connected account
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="opacity-75">Connected as: {hnUsername}</div>
                      <button
                        onClick={() => {
                          // Clear only the keys we're actually using
                          localStorage.removeItem('hn-username');
                          localStorage.removeItem('hn-new-replies');
                          localStorage.removeItem('hn-unread-count');
                          localStorage.removeItem('hn-comment-tracker');
                          
                          onUpdateHnUsername(null);
                          setUsernameInput('');
                          setValidationError(null);
                        }}
                        className="text-sm hover:opacity-75"
                      >
                        [disconnect]
                      </button>
                    </div>
                  </div>
                ) : (
                  // Show connect form
                  <div className="space-y-2">
                    <div className="text-sm opacity-75">Connect your HN account (case-sensitive):</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => {
                          setUsernameInput(e.target.value);
                          setValidationError(null);
                        }}
                        placeholder="HN username (case-sensitive)"
                        className={`
                          bg-transparent border px-2 py-1 rounded w-full
                          ${theme === 'green' 
                            ? 'border-green-500/30 focus:border-green-500/50 placeholder-green-500/50' 
                            : theme === 'og'
                            ? 'border-[#ff6600]/30 focus:border-[#ff6600]/50 placeholder-[#828282]/75'
                            : 'border-[#828282]/30 focus:border-[#828282]/50 placeholder-[#828282]'
                          }
                          focus:outline-none
                        `}
                      />
                      <button
                        onClick={validateAndSaveUsername}
                        disabled={isValidating || !usernameInput.trim()}
                        className={`
                          px-3 py-1 rounded transition-opacity
                          ${isValidating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-75'}
                          ${theme === 'green'
                            ? 'bg-green-500/20 text-green-400'
                            : theme === 'og'
                            ? 'bg-[#ff6600]/20 text-[#ff6600]'
                            : 'bg-[#828282]/20'
                          }
                        `}
                      >
                        {isValidating ? 'Checking...' : 'Connect'}
                      </button>
                    </div>
                    {validationError && (
                      <div className="text-sm text-red-500">{validationError}</div>
                    )}
                  </div>
                )}
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