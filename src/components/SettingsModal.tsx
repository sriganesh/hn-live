import React, { useEffect, useState, useRef } from 'react';
import { startTracking } from '../registerServiceWorker';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../hooks/useSettings';

type FontOption = 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';

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
    useAlgoliaApi: boolean;
  };
  onUpdateOptions: (options: SettingsOptions) => void;
  colorizeUsernames: boolean;
  onColorizeUsernamesChange: (value: boolean) => void;
  isMobile?: boolean;
  hnUsername: string | null;
  onUpdateHnUsername: (username: string | null) => void;
}

// Define a type for the options to avoid using 'any'
type SettingsOptions = {
  theme: 'green' | 'og' | 'dog';
  autoscroll: boolean;
  directLinks: boolean;
  fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  classicLayout: boolean;
  showCommentParents: boolean;
  font: FontOption;
  useAlgoliaApi: boolean;
};

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
  hnUsername,
  onUpdateHnUsername
}) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, requestAuth, verifyAuth, logout, isAuthenticating } = useAuth();
  const { exportSettings } = useSettings();

  // Add state to track local changes before applying them
  const [localOptions, setLocalOptions] = useState(options);

  // Update local options when props change
  useEffect(() => {
    setLocalOptions(options);
  }, [options]);

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
    account: true,
    cloud: true,
    settings: true
  });

  // Add state for HN username input
  const [usernameInput, setUsernameInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Add state for authentication UI
  const [emailInput, setEmailInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [showVerifyCode, setShowVerifyCode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Add state for email validation
  const [debouncedEmailError, setDebouncedEmailError] = useState<string | null>(null);
  const emailValidationTimeout = useRef<NodeJS.Timeout>();

  // Add state for file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Debounced email validation
  const validateEmail = (email: string) => {
    // Clear any existing timeout
    if (emailValidationTimeout.current) {
      clearTimeout(emailValidationTimeout.current);
    }

    // Clear error if field is empty
    if (!email.trim()) {
      setDebouncedEmailError(null);
      return;
    }

    // Set new timeout for validation
    emailValidationTimeout.current = setTimeout(() => {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        setDebouncedEmailError('Please enter a valid email address');
      } else {
        setDebouncedEmailError(null);
      }
    }, 1500); // Wait 1.5s after user stops typing
  };

  // Toggle handler for sections
  const toggleSection = (section: 'terminal' | 'feedView' | 'storyView' | 'account' | 'cloud' | 'settings') => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle the setting change
  const handleCommentParentsChange = () => {
    const newOptions = {
      ...localOptions,
      showCommentParents: !localOptions.showCommentParents
    };
    setLocalOptions(newOptions);
    onUpdateOptions(newOptions);
    localStorage.setItem('hn-live-show-comment-parents', newOptions.showCommentParents.toString());

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
      ...localOptions,
      directLinks: !localOptions.directLinks
    };
    setLocalOptions(newOptions);
    onUpdateOptions(newOptions);
    localStorage.setItem('hn-live-direct-links', newOptions.directLinks.toString());

    // Show appropriate notification based on device
    if (isMobile) {
      setShowMobileReloadNotif(true);
      setTimeout(() => setShowMobileReloadNotif(false), 3000);
    } else {
      setShowDirectLinksReload(true);
      setTimeout(() => setShowDirectLinksReload(false), 1000);
    }
  };

  // Handle autoscroll change
  const handleAutoscrollChange = () => {
    const newOptions = {
      ...localOptions,
      autoscroll: !localOptions.autoscroll
    };
    setLocalOptions(newOptions);
    onUpdateOptions(newOptions);
    localStorage.setItem('hn-live-autoscroll', newOptions.autoscroll.toString());
  };

  // Handle classic layout change
  const handleClassicLayoutChange = () => {
    const newOptions = {
      ...localOptions,
      classicLayout: !localOptions.classicLayout
    };
    setLocalOptions(newOptions);
    onUpdateOptions(newOptions);
    localStorage.setItem('hn-live-classic-layout', newOptions.classicLayout.toString());
  };

  // Handle Algolia API change
  const handleAlgoliaApiChange = () => {
    const newOptions = {
      ...localOptions,
      useAlgoliaApi: !localOptions.useAlgoliaApi
    };
    setLocalOptions(newOptions);
    onUpdateOptions(newOptions);
    localStorage.setItem('hn-live-use-algolia-api', newOptions.useAlgoliaApi.toString());
  };

  // Handle colorize usernames change
  const handleColorizeUsernamesChange = () => {
    const newValue = !colorizeUsernames;
    onColorizeUsernamesChange(newValue);
    localStorage.setItem('hn-live-colorize-usernames', JSON.stringify(newValue));
  };

  // Handle theme change
  const handleThemeChange = (newTheme: 'green' | 'og' | 'dog') => {
    const newOptions = {
      ...localOptions,
      theme: newTheme
    };
    setLocalOptions(newOptions);
    onUpdateOptions(newOptions);
    
    // Update localStorage directly to ensure it's available to all components
    localStorage.setItem('hn-live-theme', newTheme);
    
    // Update document element's data-theme attribute
    document.documentElement.setAttribute('data-theme', newTheme);
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
        // Update localStorage
        localStorage.setItem('hn-username', usernameInput);
        // Start tracking for replies
        startTracking(usernameInput);
        // Update the username in the parent component
        onUpdateHnUsername(usernameInput);
        // Reset the input
        setUsernameInput('');
        // Close the modal
        onClose();
        // No need to navigate away from the dashboard
      }
    } catch (error) {
      console.error('Error validating username:', error);
      setValidationError('Error validating username');
    } finally {
      setIsValidating(false);
    }
  };

  // Add handlers for authentication
  const handleRequestCode = async () => {
    // Basic email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(emailInput)) {
      setAuthError('Please enter a valid email address');
      return;
    }

    try {
      setAuthError(null);
      await requestAuth(emailInput);
      setShowVerifyCode(true);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to send code');
    }
  };

  const handleVerifyCode = async () => {
    try {
      setAuthError(null);
      await verifyAuth(codeInput, emailInput);
      // Reset states after successful verification
      setEmailInput('');
      setCodeInput('');
      setShowVerifyCode(false);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Invalid code');
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Starting modal logout process');
      // Close the modal first to prevent any UI issues
      onClose();
      // Then perform the logout
      await logout();
      console.log('Modal logout completed successfully');
    } catch (error) {
      console.error('Error during modal logout:', error);
      // Show error message if needed
      if (error instanceof Error) {
        setAuthError(error.message);
      } else {
        setAuthError('An error occurred during logout');
      }
    }
  };

  // Add handlers for export and import
  const handleExportSettings = () => {
    // Export all relevant settings, not just from useSettings
    const settingsToExport = {
      theme: localOptions.theme,
      hnUsername: hnUsername,
      showCommentParents: localOptions.showCommentParents,
      fontSize: localOptions.fontSize,
      font: localOptions.font,
      directLinks: localOptions.directLinks,
      autoscroll: localOptions.autoscroll,
      classicLayout: localOptions.classicLayout,
      useAlgoliaApi: localOptions.useAlgoliaApi,
      colorizeUsernames: colorizeUsernames
    };
    
    // Create and download the settings file
    const timestamp = Math.floor(Date.now() / 1000);
    const content = JSON.stringify(settingsToExport, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `hn.live-settings-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setImportError(null);
        
        // Read the file content
        const content = await file.text();
        const importedSettings = JSON.parse(content);
        
        // Validate imported settings
        if (typeof importedSettings !== 'object' || importedSettings === null) {
          throw new Error('Invalid settings format');
        }
        
        // Update options with imported settings
        const newOptions = { ...localOptions };
        
        // Apply theme if present
        if (importedSettings.theme) {
          newOptions.theme = importedSettings.theme;
        }
        
        // Apply other settings if present
        if (importedSettings.fontSize) newOptions.fontSize = importedSettings.fontSize;
        if (importedSettings.font) newOptions.font = importedSettings.font;
        if (importedSettings.directLinks !== undefined) newOptions.directLinks = importedSettings.directLinks;
        if (importedSettings.autoscroll !== undefined) newOptions.autoscroll = importedSettings.autoscroll;
        if (importedSettings.classicLayout !== undefined) newOptions.classicLayout = importedSettings.classicLayout;
        if (importedSettings.useAlgoliaApi !== undefined) newOptions.useAlgoliaApi = importedSettings.useAlgoliaApi;
        if (importedSettings.showCommentParents !== undefined) newOptions.showCommentParents = importedSettings.showCommentParents;
        
        // Update options
        setLocalOptions(newOptions);
        onUpdateOptions(newOptions);
        
        // Update username if present
        if (importedSettings.hnUsername !== undefined) {
          onUpdateHnUsername(importedSettings.hnUsername);
        }
        
        // Update colorizeUsernames if present
        if (importedSettings.colorizeUsernames !== undefined) {
          onColorizeUsernamesChange(importedSettings.colorizeUsernames);
        }
        
        // Close the modal and reload the page to apply the imported settings
        onClose();
        window.location.reload();
      } catch (error) {
        console.error('Failed to import settings:', error);
        setImportError('Failed to import settings: Invalid format');
      }
      
      // Reset the input so the same file can be selected again
      e.target.value = '';
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
      
      <div className="relative z-[101] flex items-center justify-center h-full p-4">
        <div className={`w-full max-w-lg ${themeColors} border p-4 shadow-lg font-mono max-h-[85vh] overflow-y-auto mb-20 sm:mb-0 settings-modal-content text-base`}>
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
                  onClick={() => handleThemeChange('og')}
                  className={`hover:opacity-75 transition-opacity`}
                >
                  [{localOptions.theme === 'og' ? 'x' : ' '}] Classic
                </button>
                <button
                  onClick={() => handleThemeChange('dog')}
                  className={`hover:opacity-75 transition-opacity`}
                >
                  [{localOptions.theme === 'dog' ? 'x' : ' '}] Dark
                </button>
                <button
                  onClick={() => handleThemeChange('green')}
                  className={`hover:opacity-75 transition-opacity`}
                >
                  [{localOptions.theme === 'green' ? 'x' : ' '}] Terminal
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
                    <span className="text-sm">Size: {fontSizeOptions[localOptions.fontSize]}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="1"
                      value={Object.keys(fontSizeOptions).indexOf(localOptions.fontSize)}
                      onChange={(e) => {
                        const newSize = Object.keys(fontSizeOptions)[parseInt(e.target.value)] as keyof typeof fontSizeOptions;
                        // Update localStorage directly to ensure it's saved
                        localStorage.setItem('hn-live-font-size', newSize);
                        // Update local options
                        setLocalOptions({...localOptions, fontSize: newSize});
                        // Update parent options
                        onUpdateOptions({ ...localOptions, fontSize: newSize });
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
                      style={{ WebkitAppearance: 'none', appearance: 'none' }}
                    />
                    
                    <div className="flex justify-between text-xs mt-2 opacity-75">
                      {Object.keys(fontSizeOptions).map((size, index) => (
                        <span 
                          key={size}
                          className={`w-6 text-center ${
                            index === 0 ? 'text-left' : 
                            index === Object.keys(fontSizeOptions).length - 1 ? 'text-right' : ''
                          } cursor-pointer`}
                          onClick={() => {
                            // Update localStorage directly to ensure it's saved
                            localStorage.setItem('hn-live-font-size', size);
                            // Update local options
                            setLocalOptions({...localOptions, fontSize: size as keyof typeof fontSizeOptions});
                            // Update parent options
                            onUpdateOptions({ ...localOptions, fontSize: size as keyof typeof fontSizeOptions });
                          }}
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
                    value={localOptions.font}
                    onChange={(e) => {
                      const newFont = e.target.value as FontOption;
                      localStorage.setItem('hn-live-font', newFont);
                      setLocalOptions({...localOptions, font: newFont});
                      onUpdateOptions({...localOptions, font: newFont});
                    }}
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
                  onClick={handleAutoscrollChange}
                  className={`hover:opacity-75 transition-opacity block`}
                >
                  [{localOptions.autoscroll ? 'x' : ' '}] Auto-scroll feed
                </button>
                <button
                  onClick={handleDirectLinksChange}
                  className={`hover:opacity-75 transition-opacity block w-full text-left`}
                >
                  <div className="flex items-center gap-2">
                    <span>[{localOptions.directLinks ? 'x' : ' '}] Direct HN links</span>
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
                    <span>[{localOptions.showCommentParents ? 'x' : ' '}] Show story context</span>
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
                  onClick={handleColorizeUsernamesChange}
                  className={`hover:opacity-75 transition-opacity block`}
                >
                  [{colorizeUsernames ? 'x' : ' '}] Colorize usernames
                </button>
                <button
                  onClick={handleClassicLayoutChange}
                  className={`hover:opacity-75 transition-opacity block`}
                >
                  [{localOptions.classicLayout ? 'x' : ' '}] Standard HN layout
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
                  onClick={handleAlgoliaApiChange}
                  className={`hover:opacity-75 transition-opacity block text-left whitespace-normal leading-tight`}
                >
                  <div className="flex">
                    <span className="mr-2">[{localOptions.useAlgoliaApi ? 'x' : ' '}]</span>
                    <span>Use Algolia API for stories (faster)</span>
                  </div>
                </button>
                <div className="text-xs opacity-60 ml-6 mt-1">
                  Note: If stories fail to load, try unchecking this option
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <button 
                onClick={() => toggleSection('account')}
                className="w-full flex items-center justify-between text-sm font-bold uppercase tracking-wider mb-2"
              >
                <span>HN ACCOUNT (LOCAL)</span>
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
                    <div className="text-sm opacity-75">Track replies locally with just your HN username</div>
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
                          px-2 py-1 rounded transition-opacity whitespace-nowrap
                          ${isValidating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-75'}
                          ${theme === 'green'
                            ? 'bg-green-500/20 text-green-400'
                            : theme === 'og'
                            ? 'bg-[#ff6600]/20 text-[#ff6600]'
                            : 'bg-[#828282]/20'
                          }
                        `}
                      >
                        [{isValidating ? '...' : 'connect'}]
                      </button>
                    </div>
                    {validationError && (
                      <div className="text-sm text-red-500">{validationError}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Cloud Account section */}
            <div className="space-y-2">
              <button 
                onClick={() => toggleSection('cloud')}
                className="w-full flex items-center justify-between text-sm font-bold uppercase tracking-wider mb-2"
              >
                <span>HN LIVE ACCOUNT (CLOUD)</span>
                <svg 
                  className={`w-4 h-4 transform transition-transform ${collapsedSections.cloud ? '' : 'rotate-180'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`space-y-4 transition-all duration-200 ${collapsedSections.cloud ? 'hidden' : ''}`}>
                {/* Show authentication UI if not authenticated */}
                {!user ? (
                  <div className="space-y-4">
                    {showVerifyCode ? (
                      // Show verification code input
                      <div className="space-y-2">
                        <div className="text-sm opacity-75">Enter the verification code sent to {emailInput}:</div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={codeInput}
                            onChange={(e) => {
                              setCodeInput(e.target.value);
                              setAuthError(null);
                            }}
                            placeholder="6-digit code"
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
                            pattern="[0-9]{6}"
                            maxLength={6}
                          />
                          <button
                            onClick={() => handleVerifyCode()}
                            disabled={isAuthenticating || !codeInput.trim()}
                            className={`
                              px-2 py-1 rounded transition-opacity whitespace-nowrap
                              ${isAuthenticating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-75'}
                              ${theme === 'green'
                                ? 'bg-green-500/20 text-green-400'
                                : theme === 'og'
                                ? 'bg-[#ff6600]/20 text-[#ff6600]'
                                : 'bg-[#828282]/20'
                              }
                            `}
                          >
                            [{isAuthenticating ? '...' : 'verify'}]
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setShowVerifyCode(false);
                            setCodeInput('');
                            setAuthError(null);
                          }}
                          className="text-sm opacity-75 hover:opacity-100"
                        >
                          Use a different email
                        </button>
                      </div>
                    ) : (
                      // Show email input
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="text-sm opacity-75">Register for an HN Live account</div>
                          <div className="relative group">
                            <button className="opacity-50 hover:opacity-100">[?]</button>
                            <div className={`
                              absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded text-sm
                              opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                              ${theme === 'green' 
                                ? 'bg-black border border-green-500/30' 
                                : theme === 'og'
                                ? 'bg-white border border-[#ff6600]/30'
                                : 'bg-[#1a1a1a] border border-[#828282]/30'
                              }
                            `}>
                              <div className="space-y-1">
                                <div>• Cross-device sync (bookmarks, more coming soon)</div>
                                <div>• Enhanced HN features powered by custom APIs</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="email"
                            value={emailInput}
                            onChange={(e) => {
                              setEmailInput(e.target.value);
                              setAuthError(null);
                              validateEmail(e.target.value);
                            }}
                            placeholder="Enter your email"
                            className={`
                              bg-transparent border px-2 py-1 rounded w-full
                              ${theme === 'green' 
                                ? 'border-green-500/30 focus:border-green-500/50 placeholder-green-500/50' 
                                : theme === 'og'
                                ? 'border-[#ff6600]/30 focus:border-[#ff6600]/50 placeholder-[#828282]/75'
                                : 'border-[#828282]/30 focus:border-[#828282]/50 placeholder-[#828282]'
                              }
                              focus:outline-none
                              ${debouncedEmailError ? 'border-red-500/50' : ''}
                            `}
                          />
                          <button
                            onClick={handleRequestCode}
                            disabled={isAuthenticating || !emailInput.trim() || !!debouncedEmailError}
                            className={`
                              px-2 py-1 rounded transition-opacity whitespace-nowrap
                              ${(isAuthenticating || !!debouncedEmailError) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-75'}
                              ${theme === 'green'
                                ? 'bg-green-500/20 text-green-400'
                                : theme === 'og'
                                ? 'bg-[#ff6600]/20 text-[#ff6600]'
                                : 'bg-[#828282]/20'
                              }
                            `}
                          >
                            [{isAuthenticating ? '...' : 'register'}]
                          </button>
                        </div>
                        <div className="text-xs opacity-75">
                          By registering, you agree to our{' '}
                          <button 
                            onClick={() => {
                              onClose();
                              navigate('/terms');
                            }}
                            className="hover:opacity-100 underline"
                          >
                            Terms of Service
                          </button>
                          {' '}and{' '}
                          <button
                            onClick={() => {
                              onClose();
                              navigate('/privacy');
                            }}
                            className="hover:opacity-100 underline"
                          >
                            Privacy Policy
                          </button>
                        </div>
                        {debouncedEmailError && (
                          <div className="text-sm text-red-500">{debouncedEmailError}</div>
                        )}
                      </div>
                    )}
                    {authError && (
                      <div className="text-sm text-red-500">{authError}</div>
                    )}
                  </div>
                ) : (
                  // Show connected account status
                  <div className="space-y-4">
                    {/* Show connected account status */}
                    <div className="flex items-center justify-between">
                      <div className="opacity-75">Connected as: {user.email}</div>
                      <button
                        onClick={handleLogout}
                        className="text-sm hover:opacity-75"
                      >
                        [disconnect]
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Settings Backup section */}
            <div className="space-y-2">
              <button 
                onClick={() => toggleSection('settings')}
                className="w-full flex items-center justify-between text-sm font-bold uppercase tracking-wider mb-2"
              >
                <span>SETTINGS BACKUP</span>
                <svg 
                  className={`w-4 h-4 transform transition-transform ${collapsedSections.settings ? '' : 'rotate-180'}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`space-y-4 transition-all duration-200 ${collapsedSections.settings ? 'hidden' : ''}`}>
                <div className="text-sm opacity-75">Export your settings to a file or import from a previously exported file.</div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportSettings}
                    className={`
                      px-2 py-1 rounded transition-opacity
                      ${theme === 'green'
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : theme === 'og'
                        ? 'bg-[#ff6600]/20 text-[#ff6600] hover:bg-[#ff6600]/30'
                        : 'bg-[#828282]/20 hover:bg-[#828282]/30'
                      }
                    `}
                  >
                    [EXPORT SETTINGS]
                  </button>
                  <button
                    onClick={handleImportClick}
                    className={`
                      px-2 py-1 rounded transition-opacity
                      ${theme === 'green'
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : theme === 'og'
                        ? 'bg-[#ff6600]/20 text-[#ff6600] hover:bg-[#ff6600]/30'
                        : 'bg-[#828282]/20 hover:bg-[#828282]/30'
                      }
                    `}
                  >
                    [IMPORT SETTINGS]
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                {importError && (
                  <div className="text-sm text-red-500">{importError}</div>
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