import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { FeedTabContent } from '../components/tabs/FeedTabContent';
import { BookmarksTabContent } from '../components/tabs/BookmarksTabContent';
import { HistoryTabContent } from '../components/tabs/HistoryTabContent';
import { ProfileTabContent } from '../components/tabs/ProfileTabContent';
import { FollowingTabContent } from '../components/tabs/FollowingTabContent';
import SettingsModal from '../components/SettingsModal';

type TabType = 'feed' | 'bookmarks' | 'history' | 'profile' | 'following';

export function UserDashboardPage() {
  const navigate = useNavigate();
  const { settings, updateSetting } = useSettings();
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [colorizeUsernames, setColorizeUsernames] = useState(() => {
    const saved = localStorage.getItem('hn-live-colorize-usernames');
    return saved ? JSON.parse(saved) : false;
  });

  // Load settings from localStorage
  const [localSettings, setLocalSettings] = useState(() => {
    return {
      autoscroll: localStorage.getItem('hn-live-autoscroll') === 'true',
      directLinks: localStorage.getItem('hn-live-direct-links') === 'true',
      showCommentParents: localStorage.getItem('hn-live-show-comment-parents') !== 'false', // Default to true
      classicLayout: localStorage.getItem('hn-live-classic-layout') === 'true',
      useAlgoliaApi: localStorage.getItem('hn-live-use-algolia-api') !== 'false', // Default to true
    };
  });

  // Load unread count from localStorage on mount
  useEffect(() => {
    try {
      const count = parseInt(localStorage.getItem('hn-unread-count') || '0', 10);
      setUnreadCount(isNaN(count) ? 0 : count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, []);

  // Listen for unread count changes
  useEffect(() => {
    const handleUnreadCountChange = (event: CustomEvent<{ unreadCount: number }>) => {
      setUnreadCount(event.detail.unreadCount);
    };

    window.addEventListener('unreadCountChange', handleUnreadCountChange as EventListener);
    
    return () => {
      window.removeEventListener('unreadCountChange', handleUnreadCountChange as EventListener);
    };
  }, []);

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Handle username update
  const handleUpdateHnUsername = (username: string | null) => {
    updateSetting('hnUsername', username);
    // Also update localStorage directly to ensure it's available to all components
    if (username) {
      localStorage.setItem('hn-username', username);
    } else {
      localStorage.removeItem('hn-username');
    }
  };

  // Handle theme change
  const handleThemeChange = (theme: 'green' | 'og' | 'dog') => {
    updateSetting('theme', theme);
    // Update document element's data-theme attribute
    document.documentElement.setAttribute('data-theme', theme);
  };

  // Listen for theme changes in localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hn-live-theme' && e.newValue) {
        document.documentElement.setAttribute('data-theme', e.newValue);
      }
      
      // Update local settings when localStorage changes
      if (e.key?.startsWith('hn-live-')) {
        // Update specific setting based on the key
        switch (e.key) {
          case 'hn-live-autoscroll':
            setLocalSettings(prev => ({ ...prev, autoscroll: e.newValue === 'true' }));
            break;
          case 'hn-live-direct-links':
            setLocalSettings(prev => ({ ...prev, directLinks: e.newValue === 'true' }));
            break;
          case 'hn-live-show-comment-parents':
            setLocalSettings(prev => ({ ...prev, showCommentParents: e.newValue !== 'false' }));
            break;
          case 'hn-live-classic-layout':
            setLocalSettings(prev => ({ ...prev, classicLayout: e.newValue === 'true' }));
            break;
          case 'hn-live-use-algolia-api':
            setLocalSettings(prev => ({ ...prev, useAlgoliaApi: e.newValue !== 'false' }));
            break;
          case 'hn-live-colorize-usernames':
            if (e.newValue) {
              setColorizeUsernames(JSON.parse(e.newValue));
            }
            break;
          case 'hn-live-font-size':
            if (e.newValue) {
              const fontSizeClasses = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];
              document.body.classList.remove(...fontSizeClasses);
              document.body.classList.add(`text-${e.newValue}`);
            }
            break;
          case 'hn-live-font':
            if (e.newValue) {
              const fontClasses = [
                'font-mono', 'font-jetbrains', 'font-fira', 'font-source', 
                'font-sans', 'font-serif', 'font-system'
              ];
              document.body.classList.remove(...fontClasses);
              document.body.classList.add(`font-${e.newValue}`);
            }
            break;
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Set theme on document element when component mounts
  useEffect(() => {
    // Ensure the document element's data-theme attribute matches the settings theme
    document.documentElement.setAttribute('data-theme', settings.theme);
    
    // Apply theme-specific classes to body
    const body = document.body;
    
    // First remove any existing theme classes
    body.classList.remove('bg-black', 'text-green-400', 'bg-[#f6f6ef]', 'text-[#111]', 'bg-[#1a1a1a]', 'text-[#c9d1d9]');
    
    // Add new theme classes
    switch (settings.theme) {
      case 'green':
        body.classList.add('bg-black', 'text-green-400');
        break;
      case 'og':
        body.classList.add('bg-[#f6f6ef]', 'text-[#111]');
        break;
      case 'dog':
        body.classList.add('bg-[#1a1a1a]', 'text-[#c9d1d9]');
        break;
    }
    
    return () => {
      // Clean up theme classes when component unmounts
      body.classList.remove('bg-black', 'text-green-400', 'bg-[#f6f6ef]', 'text-[#111]', 'bg-[#1a1a1a]', 'text-[#c9d1d9]');
    };
  }, [settings.theme]);

  // Apply font size and font family when component mounts
  useEffect(() => {
    // Get font size and font family from localStorage or use defaults
    const fontSize = localStorage.getItem('hn-live-font-size') || 'base';
    const fontFamily = localStorage.getItem('hn-live-font') || 'system';
    
    // Apply font size
    const fontSizeClasses = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];
    document.body.classList.remove(...fontSizeClasses);
    document.body.classList.add(`text-${fontSize}`);
    
    // Apply font family
    const fontClasses = [
      'font-mono', 'font-jetbrains', 'font-fira', 'font-source', 
      'font-sans', 'font-serif', 'font-system'
    ];
    document.body.classList.remove(...fontClasses);
    document.body.classList.add(`font-${fontFamily}`);
    
    // Also update local settings to ensure they're in sync with localStorage
    setLocalSettings(prevSettings => ({
      ...prevSettings,
      autoscroll: localStorage.getItem('hn-live-autoscroll') === 'true',
      directLinks: localStorage.getItem('hn-live-direct-links') === 'true',
      showCommentParents: localStorage.getItem('hn-live-show-comment-parents') !== 'false',
      classicLayout: localStorage.getItem('hn-live-classic-layout') === 'true',
      useAlgoliaApi: localStorage.getItem('hn-live-use-algolia-api') !== 'false'
    }));
    
    return () => {
      // Clean up font classes when component unmounts
      document.body.classList.remove(...fontSizeClasses, ...fontClasses);
    };
  }, []);

  // Handle user click (for following)
  const handleUserClick = (username: string) => {
    navigate(`/user/${username}`);
  };

  // Handle settings modal options update
  const handleUpdateOptions = (newOptions: {
    theme: 'green' | 'og' | 'dog';
    autoscroll: boolean;
    directLinks: boolean;
    fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
    classicLayout: boolean;
    showCommentParents: boolean;
    font: 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';
    useAlgoliaApi: boolean;
  }) => {
    if (newOptions.theme !== settings.theme) {
      handleThemeChange(newOptions.theme);
    }
    
    // Update local settings
    setLocalSettings({
      ...localSettings,
      autoscroll: newOptions.autoscroll,
      directLinks: newOptions.directLinks,
      showCommentParents: newOptions.showCommentParents,
      classicLayout: newOptions.classicLayout,
      useAlgoliaApi: newOptions.useAlgoliaApi
    });
    
    // Apply font size changes directly to the document
    if (newOptions.fontSize) {
      const fontSizeClasses = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'];
      
      // Remove any existing font size classes from the body
      document.body.classList.remove(...fontSizeClasses);
      
      // Add the new font size class
      document.body.classList.add(`text-${newOptions.fontSize}`);
      
      // Save to localStorage
      localStorage.setItem('hn-live-font-size', newOptions.fontSize);
    }
    
    // Apply font family changes directly to the document
    if (newOptions.font) {
      const fontClasses = [
        'font-mono', 'font-jetbrains', 'font-fira', 'font-source', 
        'font-sans', 'font-serif', 'font-system'
      ];
      
      // Remove any existing font classes from the body
      document.body.classList.remove(...fontClasses);
      
      // Add the new font class
      document.body.classList.add(`font-${newOptions.font}`);
      
      // Save to localStorage
      localStorage.setItem('hn-live-font', newOptions.font);
    }
  };

  // Get the current username from localStorage
  const getCurrentUsername = () => {
    return localStorage.getItem('hn-username') || settings.hnUsername;
  };

  // Get the current font size from localStorage
  const getCurrentFontSize = (): 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' => {
    const fontSize = localStorage.getItem('hn-live-font-size');
    if (fontSize && ['xs', 'sm', 'base', 'lg', 'xl', '2xl'].includes(fontSize)) {
      return fontSize as 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
    }
    return 'base';
  };

  // Get the current font family from localStorage
  const getCurrentFontFamily = (): 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system' => {
    const fontFamily = localStorage.getItem('hn-live-font');
    if (fontFamily && ['mono', 'jetbrains', 'fira', 'source', 'sans', 'serif', 'system'].includes(fontFamily)) {
      return fontFamily as 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';
    }
    return 'system';
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed':
        return <FeedTabContent theme={settings.theme} onUserClick={handleUserClick} />;
      case 'bookmarks':
        return <BookmarksTabContent theme={settings.theme} onDeleteBookmark={() => {}} navigate={navigate} onUserClick={handleUserClick} />;
      case 'history':
        return <HistoryTabContent theme={settings.theme} navigate={navigate} onUserClick={handleUserClick} />;
      case 'profile':
        return (
          <ProfileTabContent
            theme={settings.theme}
            hnUsername={getCurrentUsername()}
            onShowSettings={() => setShowSettings(true)}
            onUpdateHnUsername={handleUpdateHnUsername}
            onUserClick={handleUserClick}
          />
        );
      case 'following':
        return <FollowingTabContent theme={settings.theme} onUserClick={handleUserClick} />;
      default:
        return <div>Invalid tab</div>;
    }
  };

  // Get theme-specific styles
  const getThemeStyles = () => {
    switch (settings.theme) {
      case 'green':
        return {
          background: 'bg-black',
          text: 'text-green-400',
          accent: 'text-green-500',
          tabActive: 'bg-green-500 text-white',
          tabInactive: 'text-green-400 hover:text-green-300',
          tabHighlight: 'text-green-500 font-bold',
          border: 'border-green-500/20',
          contentBg: 'bg-black'
        };
      case 'og':
        return {
          background: 'bg-[#f6f6ef]',
          text: 'text-[#111]',
          accent: 'text-[#ff6600]',
          tabActive: 'bg-[#ff6600] text-white',
          tabInactive: 'text-[#828282] hover:text-[#666]',
          tabHighlight: 'text-[#ff6600] font-bold',
          border: 'border-[#ff6600]/20',
          contentBg: 'bg-white'
        };
      case 'dog':
        return {
          background: 'bg-[#1a1a1a]',
          text: 'text-[#c9d1d9]',
          accent: 'text-[#ff6600]',
          tabActive: 'bg-[#ff6600] text-white',
          tabInactive: 'text-[#828282] hover:text-[#c9d1d9]',
          tabHighlight: 'text-[#ff6600] font-bold',
          border: 'border-[#828282]/20',
          contentBg: 'bg-[#1a1a1a]'
        };
      default:
        return {
          background: 'bg-black',
          text: 'text-green-400',
          accent: 'text-green-500',
          tabActive: 'bg-green-500 text-white',
          tabInactive: 'text-green-400 hover:text-green-300',
          tabHighlight: 'text-green-500 font-bold',
          border: 'border-green-500/20',
          contentBg: 'bg-black'
        };
    }
  };

  const themeStyles = getThemeStyles();

  // Update document title when unread count changes
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) HN Live Dashboard`;
    } else {
      document.title = 'HN Live Dashboard';
    }
    
    return () => {
      document.title = 'HN Live';
    };
  }, [unreadCount]);

  return (
    <div className={`min-h-screen ${themeStyles.background} ${themeStyles.text}`}>
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-6 flex justify-between items-center">
          <h1 className={`text-2xl font-bold ${themeStyles.accent}`}>
            HN Live Dashboard
            {unreadCount > 0 && (
              <span className={`ml-2 px-2 py-0.5 text-sm rounded-full ${
                settings.theme === 'green' 
                  ? 'bg-green-500 text-black' 
                  : 'bg-[#ff6600] text-white'
              }`}>
                {unreadCount}
              </span>
            )}
          </h1>
          <button 
            onClick={() => setShowSettings(true)}
            className={themeStyles.tabInactive}
          >
            [SETTINGS]
          </button>
        </div>

        {/* Tabs */}
        <div className={`flex flex-wrap gap-2 mb-6 border-b ${themeStyles.border} pb-2`}>
          <TabButton
            label="Feed"
            active={activeTab === 'feed'}
            onClick={() => handleTabChange('feed')}
            activeClass={themeStyles.tabActive}
            inactiveClass={themeStyles.tabInactive}
            highlightClass={themeStyles.tabHighlight}
          />
          <TabButton
            label="Bookmarks"
            active={activeTab === 'bookmarks'}
            onClick={() => handleTabChange('bookmarks')}
            activeClass={themeStyles.tabActive}
            inactiveClass={themeStyles.tabInactive}
            highlightClass={themeStyles.tabHighlight}
          />
          <TabButton
            label="History"
            active={activeTab === 'history'}
            onClick={() => handleTabChange('history')}
            activeClass={themeStyles.tabActive}
            inactiveClass={themeStyles.tabInactive}
            highlightClass={themeStyles.tabHighlight}
          />
          <TabButton
            label={`Profile ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
            active={activeTab === 'profile'}
            onClick={() => handleTabChange('profile')}
            activeClass={themeStyles.tabActive}
            inactiveClass={themeStyles.tabInactive}
            highlightClass={themeStyles.tabHighlight}
            highlight={unreadCount > 0}
          />
          <TabButton
            label="Following"
            active={activeTab === 'following'}
            onClick={() => handleTabChange('following')}
            activeClass={themeStyles.tabActive}
            inactiveClass={themeStyles.tabInactive}
            highlightClass={themeStyles.tabHighlight}
          />
        </div>

        {/* Tab Content */}
        <div className={`p-4 rounded ${themeStyles.contentBg}`}>
          {renderTabContent()}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        theme={settings.theme}
        options={{
          theme: settings.theme,
          autoscroll: localSettings.autoscroll,
          directLinks: localSettings.directLinks,
          fontSize: getCurrentFontSize(),
          classicLayout: localSettings.classicLayout,
          showCommentParents: localSettings.showCommentParents,
          font: getCurrentFontFamily(),
          useAlgoliaApi: localSettings.useAlgoliaApi
        }}
        onUpdateOptions={handleUpdateOptions}
        colorizeUsernames={colorizeUsernames}
        onColorizeUsernamesChange={setColorizeUsernames}
        hnUsername={getCurrentUsername()}
        onUpdateHnUsername={handleUpdateHnUsername}
      />
    </div>
  );
}

// Tab Button Component
interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  activeClass: string;
  inactiveClass: string;
  highlightClass: string;
  highlight?: boolean;
}

function TabButton({ 
  label, 
  active, 
  onClick, 
  activeClass, 
  inactiveClass, 
  highlightClass, 
  highlight = false 
}: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-t ${
        active
          ? activeClass
          : highlight
          ? highlightClass
          : inactiveClass
      }`}
    >
      {label}
    </button>
  );
} 