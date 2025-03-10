import { useState, useEffect, useRef } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { StoryView } from '../components/StoryView';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useLocation, useParams, Outlet } from 'react-router-dom';
import SearchModal from '../components/SearchModal';
import { FrontPage } from '../pages/feed/FrontPage';
import { ShowPage } from '../pages/feed/ShowPage';
import { AskPage } from '../pages/feed/AskPage';
import { JobsPage } from '../pages/feed/JobsPage';
import { BestPage } from '../pages/feed/BestPage';
import { BestCommentsPage } from '../pages/feed/BestCommentsPage';
import { useTopUsers } from '../hooks/useTopUsers';
import SettingsModal from '../components/SettingsModal';
import { MobileBottomBar } from '../components/navigation/MobileBottomBar';
import UserPage from '../pages/user/UserPage';
import { UserModal } from '../components/user/UserModal';
import { AboutOverlay } from '../content/about';
import { navigationItems } from '../config/navigation';
import ReplayView from '../pages/content/ReplayView';
import { UpdateNotifier } from '../components/UpdateNotifier';
import { LinksView } from '../pages/content/LinksView';
import { useAuth } from '../contexts/AuthContext';
import { useSwipeable } from 'react-swipeable';
import { TermsPage } from './Terms';
import { PrivacyPage } from './Privacy';
import HistoricalFrontPage from '../pages/feed/HistoricalFrontPage';
import { ActivePage } from '../pages/feed/ActivePage';
import { UserDashboardPage } from './UserDashboardPage';
import { addToHistory } from '../services/history';
import { useRunningStatus } from '../contexts/RunningStatusContext';
import { STORAGE_KEYS } from '../config/constants';
import { showConsoleGreeting } from '../utils/consoleGreeting';
import {
  getBooleanValue,
  getStringValue,
  getFontSize,
  getFont,
  getTheme
} from '../utils/localStorage';

interface HNItem {
  id: number;
  title?: string;
  text?: string;
  by: string;
  time: number;
  url?: string;
  score?: number;
  kids?: number[];
  type: 'story' | 'comment' | 'job' | 'poll' | 'pollopt';
  parent?: number;
  dead?: boolean;
  formatted?: {
    timestamp: {
      time: string;
      fullDate: string;
    };
    text: string;
    links: {
      main: string;
      comments: string;
    };
  };
}

type FontOption = 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';

interface TerminalOptions {
  theme: 'green' | 'og' | 'dog';
  autoscroll: boolean;
  directLinks: boolean;
  fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  classicLayout: boolean;
  showCommentParents: boolean;
  font: FontOption;
  useAlgoliaApi: boolean;
}

interface SearchFilters {
  text: string;
}

const INITIAL_BUFFER_SIZE = 60;  // Number of items to fetch initially
const UPDATE_INTERVAL = 30000;   // How often to fetch new items (30 seconds)
const MIN_DISPLAY_INTERVAL = 800;  // Minimum time between displaying items
const MAX_DISPLAY_INTERVAL = 2000; // Maximum time between displaying items

const getStoredSettings = () => {
  try {
    // Determine default font size based on screen width and PWA mode
    const defaultSize = (() => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      const isMobile = window.innerWidth < 640; // 640px is Tailwind's 'sm' breakpoint
      if (isPWA) {
        return 'sm' as const;
      }
      return isMobile ? 'sm' as const : 'base' as const;
    })();

    return {
      theme: getTheme(),
      autoscroll: getBooleanValue(STORAGE_KEYS.AUTOSCROLL, false),
      directLinks: getBooleanValue(STORAGE_KEYS.DIRECT_LINKS, false),
      fontSize: getFontSize(),
      classicLayout: getBooleanValue(STORAGE_KEYS.CLASSIC_LAYOUT, false),
      showCommentParents: getBooleanValue(STORAGE_KEYS.SHOW_COMMENT_PARENTS, true),
      font: getFont(),
      useAlgoliaApi: getBooleanValue(STORAGE_KEYS.USE_ALGOLIA_API, true)
    };
  } catch (e) {
    console.warn('Could not access localStorage');
    // Still handle mobile default even in error case
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const isMobile = window.innerWidth < 640;
    return {
      theme: 'og' as const,
      autoscroll: false,
      directLinks: false,
      fontSize: isPWA ? 'base' as const : (isMobile ? 'sm' as const : 'base' as const),
      classicLayout: false,
      showCommentParents: true,
      font: 'mono' as FontOption,
      useAlgoliaApi: true
    };
  }
};

// Define theme-specific styles
const themeStyles = `
  [data-theme='og'] .hn-username,
  [data-theme='dog'] .hn-username,
  [data-theme='dog'] .front-page-link {
    color: #ff6600 !important;
  }

  [data-theme='green'] .hn-username,
  [data-theme='green'] .front-page-link {
    color: rgb(74 222 128) !important;
  }

  [data-theme='dog'] ::selection {
    background: rgba(255, 255, 0, 0.1);
    color: inherit;
  }
  
  [data-theme='og'] ::selection {
    background: rgba(255, 255, 0, 0.2);
    color: inherit;
  }
  
  [data-theme='green'] ::selection {
    background: rgba(255, 255, 0, 0.1);
    color: inherit;
  }
`;

// Define mobile navigation styles
const mobileNavStyles = `
  @supports (padding: env(safe-area-inset-top)) {
    .pt-safe {
      padding-top: env(safe-area-inset-top);
    }
    .pb-safe {
      padding-bottom: env(safe-area-inset-bottom);
    }
  }

  .pt-safe {
    padding-top: max(env(safe-area-inset-top), 16px);
  }
  .pb-safe {
    padding-bottom: max(env(safe-area-inset-bottom), 16px);
  }
`;

export default function HNLiveTerminal() {
  useDocumentTitle('Hacker News Live');
  
  const [items, setItems] = useState<HNItem[]>([]);
  const [options, setOptions] = useState(getStoredSettings());
  const { isRunning, setIsRunning } = useRunningStatus();
  
  const [filters, setFilters] = useState<SearchFilters>({
    text: ''
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const processedIds = useRef<Set<number>>(new Set());
  const maxItemRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout>();
  const itemQueueRef = useRef<HNItem[]>([]);

  // Add a continuous processing flag
  const isProcessingRef = useRef(false);

  // Add abort controller ref
  const abortControllerRef = useRef<AbortController>();

  // Add a ref to track the current timeout
  const timeoutRef = useRef<NodeJS.Timeout>();

  const navigate = useNavigate();
  const location = useLocation();
  const { itemId, commentId } = useParams();

  // Remove unused destructured elements
  const { /* isTopUser, getTopUserClass */ } = useTopUsers();
  const { /* user, isAuthenticated */ } = useAuth();

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return {
      time: date.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      fullDate: date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    };
  };

  // Format item for display
  const formatItem = async (item: HNItem) => {
    // Create a new AbortController for this format operation
    const abortController = new AbortController();
    
    if (!item.by || 
        (item.type === 'comment' && !item.text) || 
        item.text === '[delayed]') {
      return null;
    }

    let text = '';
    let links = {
      main: '',
      comments: ''
    };
    let parentStory = null;
    
    // Update the user link to use our modal instead of direct HN link
    const userLink = `<a 
      href="#"
      class="hn-username hover:underline"
      data-username="${item.by}"
      onclick="event.preventDefault(); event.stopPropagation(); window.dispatchEvent(new CustomEvent('viewUser', { detail: '${item.by}' }))"
    >${item.by}</a>`;
    
    if (item.type === 'comment') {
      // Fetch parent story if needed
      if (options.showCommentParents && item.parent) {
        try {
          let currentParent = await fetch(
            `https://hacker-news.firebaseio.com/v0/item/${item.parent}.json`,
            { signal: abortController.signal }
          ).then(r => r.json());
          
          // Keep going up until we find the root story
          while (currentParent.type === 'comment' && currentParent.parent) {
            currentParent = await fetch(
              `https://hacker-news.firebaseio.com/v0/item/${currentParent.parent}.json`,
              { signal: abortController.signal }
            ).then(r => r.json());
          }
          
          if (currentParent.type === 'story') {
            parentStory = currentParent;
          }
        } catch (error: any) {
          // Only log error if it's not an abort error
          if (error.name !== 'AbortError') {
            console.error('Error fetching parent story:', error);
          }
        }
      }

      // First show the comment with the username
      text = `${userLink}: ${item.text?.replace(/<[^>]*>/g, '')}`;
      
      // Then add the parent story info if available, respecting directLinks setting
      if (parentStory) {
        text += ` <span class="opacity-50">| re: </span><a href="${
          options.directLinks 
            ? `https://news.ycombinator.com/item?id=${parentStory.id}`
            : `#`
        }" 
          class="opacity-75 hover:opacity-100"
          ${!options.directLinks ? `onclick="event.preventDefault(); event.stopPropagation(); window.dispatchEvent(new CustomEvent('navigateToParentStory', { detail: ${parentStory.id} }))"` : ''}
          ${options.directLinks ? 'target="_blank" rel="noopener noreferrer"' : ''}
        >${parentStory.title}</a>`;
      }
      
      links.main = `https://news.ycombinator.com/item?id=${item.id}`;
      links.comments = ''; 
    } else if (item.type === 'story') {
      text = `${userLink}: ${item.title || '[untitled]'}`;
      links.main = item.url || `https://news.ycombinator.com/item?id=${item.id}`;
      links.comments = `https://news.ycombinator.com/item?id=${item.id}`;
    }
    
    return {
      timestamp: formatTimestamp(item.time),
      text,
      links
    };
  };

  // Add new item
  const addItem = async (item: HNItem) => {
    if (!processedIds.current.has(item.id)) {
      processedIds.current.add(item.id);
      const formattedItem = await formatItem(item);
      if (formattedItem) {
        setItems(prev => [...prev, { ...item, formatted: formattedItem }]);
      }
    }
  };

  // Start/stop feed
  const toggleFeed = () => {
    if (isRunning) {
      // If we're stopping, just stop processing and network calls
      isProcessingRef.current = false;
      
      // Abort any ongoing fetches
      abortControllerRef.current?.abort();
      
      // Clear the polling interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }

      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    }
    setIsRunning(!isRunning);
  };

  // Clear screen
  const clearScreen = () => {
    setItems([]);
    processedIds.current.clear();
  };

  // Add queue size state for UI updates
  const [queueSize, setQueueSize] = useState(0);

  // Simplify addToQueue
  const addToQueue = (item: HNItem) => {
    itemQueueRef.current.push(item);
    setQueueSize(itemQueueRef.current.length);
    if (!isProcessingRef.current) {
      processQueue();
    }
  };

  // Simplify processQueue
  const processQueue = () => {
    // Exit immediately if not running or already processing
    if (!isRunning || isProcessingRef.current || !itemQueueRef.current.length) return;
    
    isProcessingRef.current = true;
    
    const processNext = () => {
      // Exit the processing loop if stopped
      if (!isRunning) {
        isProcessingRef.current = false;
        // Clear any pending timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = undefined;
        }
        return;
      }

      if (!itemQueueRef.current.length) {
        isProcessingRef.current = false;
        setQueueSize(itemQueueRef.current.length);
        return;
      }

      const nextItem = itemQueueRef.current.shift();
      if (nextItem) {
        addItem(nextItem);
      }
      setQueueSize(itemQueueRef.current.length);

      // Only schedule next processing if still running
      if (isRunning) {
        const queueSize = itemQueueRef.current.length;
        let interval;
        
        if (queueSize > 20) {
          interval = MIN_DISPLAY_INTERVAL;
        } else if (queueSize > 10) {
          interval = MIN_DISPLAY_INTERVAL + Math.random() * 500;
        } else {
          interval = MIN_DISPLAY_INTERVAL + Math.random() * (MAX_DISPLAY_INTERVAL - MIN_DISPLAY_INTERVAL);
        }

        // Store the timeout reference
        timeoutRef.current = setTimeout(processNext, interval);
      }
    };

    processNext();
  };

  // Update the effect to not trigger processQueue when stopping
  useEffect(() => {
    // Only start processing when running is true
    if (isRunning && itemQueueRef.current.length > 0 && !isProcessingRef.current) {
      processQueue();
    }
  }, [isRunning]);

  // Separate effect for cleaning up interval when stopped
  useEffect(() => {
    if (!isRunning && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, [isRunning]);

  // Update polling logic
  useEffect(() => {
    const fetchMaxItem = async () => {
      abortControllerRef.current = new AbortController();
      
      try {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
        }

        // Initial fetch with larger buffer
        const response = await fetch('https://hacker-news.firebaseio.com/v0/maxitem.json', {
          signal: abortControllerRef.current.signal
        });
        const maxItem = await response.json();
        maxItemRef.current = maxItem;
        
        // Fetch more items initially to build a buffer
        const itemIds = Array.from(
          {length: INITIAL_BUFFER_SIZE}, 
          (_, i) => (maxItem - INITIAL_BUFFER_SIZE + 1) + i
        );
        
        for (const id of itemIds) {
          if (!isRunning) return;
          const itemResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
            signal: abortControllerRef.current.signal
          });
          const item = await itemResponse.json();
          if (item && 
              (item.type === 'story' || item.type === 'comment') && 
              item.by && 
              item.text !== '[deleted]' && 
              item.text !== '[dead]' &&
              !item.dead) {
            addToQueue(item);
          }
        }
        
        // Regular polling interval
        if (isRunning) {
          intervalRef.current = setInterval(async () => {
            try {
              const response = await fetch('https://hacker-news.firebaseio.com/v0/maxitem.json', {
                signal: abortControllerRef.current?.signal
              });
              const newMaxItem = await response.json();
              
              if (newMaxItem > maxItemRef.current) {
                const itemIds = Array.from(
                  {length: newMaxItem - maxItemRef.current}, 
                  (_, i) => maxItemRef.current + 1 + i
                );
                
                for (const id of itemIds) {
                  if (!isRunning) return;
                  const itemResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
                    signal: abortControllerRef.current?.signal
                  });
                  const item = await itemResponse.json();
                  if (item && 
                      (item.type === 'story' || item.type === 'comment') && 
                      item.by && 
                      item.text !== '[deleted]' && 
                      item.text !== '[dead]' &&
                      !item.dead) {
                    addToQueue(item);
                  }
                }
                maxItemRef.current = newMaxItem;
              }
            } catch (error: unknown) {
              if (error instanceof Error && error.name === 'AbortError') return;
              console.error('Error in interval:', error);
            }
          }, UPDATE_INTERVAL);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Error fetching items:', error);
      }
    };

    if (isRunning) {
      fetchMaxItem();
    } else {
      abortControllerRef.current?.abort();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    }

    return () => {
      abortControllerRef.current?.abort();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [isRunning]);

  // Update the auto-scroll effect
  useEffect(() => {
    if (options.autoscroll && containerRef.current) {
      // For mobile, add extra padding to ensure visibility
      const extraPadding = window.innerWidth < 640 ? 100 : 0;
      containerRef.current.scrollTop = containerRef.current.scrollHeight + extraPadding;
    }
  }, [items, options.autoscroll]);

  // Define theme variables
  const theme = options.theme;
  const themeColors = theme === 'green'
    ? 'text-green-400'
    : theme === 'og'
    ? 'text-[#828282]'
    : 'text-[#828282]';

  const themeBg = theme === 'green'
    ? 'bg-black'
    : theme === 'og'
    ? 'bg-[#f6f6ef]'
    : 'bg-[#1a1a1a]';

  const themeHeaderBg = theme === 'green'
    ? 'bg-black/90'
    : theme === 'og'
    ? 'bg-[#ff6600]'
    : 'bg-[#1a1a1a]/90';

  // New variable for header text color when using orange background
  const headerTextColor = theme === 'green'
    ? 'text-green-400'
    : theme === 'og'
    ? 'text-white'
    : 'text-[#828282]';

  const headerColor = theme === 'green'
    ? 'text-green-500'
    : 'text-[#ff6600]';

  // Filter items based on search text only
  const filteredItems = items.filter(item => {
    if (filters.text && !item.formatted?.text.toLowerCase().includes(filters.text.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Add state for showing grep input
  const [showGrep, setShowGrep] = useState(false);

  // Add state for about overlay
  const [showAbout, setShowAbout] = useState(false);

  // Add state for showing shortcuts
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Add new state for story view
  const [viewingStory, setViewingStory] = useState<{
    itemId: number;
    scrollToId?: number;
  } | null>(null);

  // Add loading state for initial story load
  const [isLoadingStory, setIsLoadingStory] = useState(false);

  // Add keydown/keyup handlers for Cmd/Ctrl
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        setShowShortcuts(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) {
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update the keydown handler to include About overlay escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle ESC for grep and about overlay
      if (e.key === 'Escape') {
        if (showGrep) {
          setShowGrep(false);
          setFilters(prev => ({ ...prev, text: '' }));
          return;
        }
        if (showAbout) {
          setShowAbout(false);
          return;
        }
      }

      // Handle other shortcuts
      if (e.metaKey || e.ctrlKey) {  // Check for Cmd/Ctrl
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            toggleFeed();
            break;
          case 'l':
            e.preventDefault();
            clearScreen();
            break;
          case 'f':
            e.preventDefault();
            setShowGrep(true);
            break;
          case 'k':
            e.preventDefault();
            setShowSearch(true);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGrep, showAbout]); // Add showAbout to dependencies

  // Add back the TimeStamp component
  const TimeStamp = ({ time, fullDate }: { time: string; fullDate: string }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
      <div className="relative">
        <span 
          className="opacity-50 shrink-0"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {time}
        </span>
        {showTooltip && (
          <div className="absolute left-0 bottom-full mb-1 z-50 animate-fade-in">
            <div className="bg-black border border-current px-2 py-1 rounded whitespace-nowrap text-xs">
              {fullDate}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Update the useEffect that handles theme changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, options.theme);
      // Add this line to set the data-theme attribute on the HTML element
      document.documentElement.setAttribute('data-theme', options.theme);
    } catch (e) {
      console.warn('Could not save theme preference');
    }
  }, [options.theme]);

  // Also add this effect to set the initial theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', options.theme);
  }, []); // Run once on mount

  // Add an effect to save directLinks preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.DIRECT_LINKS, options.directLinks.toString());
    } catch (e) {
      console.warn('Could not save direct links preference');
    }
  }, [options.directLinks]);

  // Add a new effect to save autoscroll changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTOSCROLL, options.autoscroll.toString());
    } catch (e) {
      console.warn('Could not save autoscroll preference');
    }
  }, [options.autoscroll]);

  // Add effect to save font size changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FONT_SIZE, options.fontSize);
    } catch (e) {
      console.warn('Could not save font size preference');
    }
  }, [options.fontSize]);

  const reloadSite = () => {
    // Clear existing items and queue
    setItems([]);
    processedIds.current.clear();
    itemQueueRef.current = [];
    setQueueSize(0);
    maxItemRef.current = 0;
    
    // Reset running state to trigger reload
    setIsRunning(false);
    setTimeout(() => setIsRunning(true), 0);
  };

  // Add this near the top of the file with other state declarations
  const [headerText] = useState<string>(
    import.meta.env.VITE_HEADER_TEXT || ''
  );
  const [headerLink] = useState<string>(
    import.meta.env.VITE_HEADER_LINK || ''
  );

  // Update the viewingStory state to use URL params
  useEffect(() => {
    if (itemId) {
      const id = parseInt(itemId);
      if (isNaN(id)) {
        // Invalid ID in URL, redirect to home
        navigate('/');
        return;
      }
      setIsLoadingStory(true);
      // Verify the item exists before setting viewingStory
      fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
        .then(res => res.json())
        .then(item => {
          if (!item) {
            navigate('/');
            return;
          }
          setViewingStory({
            itemId: id,
            scrollToId: commentId ? parseInt(commentId) : undefined
          });
        })
        .catch(() => {
          navigate('/');
        })
        .finally(() => {
          setIsLoadingStory(false);
        });
    } else {
      setViewingStory(null);
    }
  }, [itemId, commentId, navigate]);

  // Update the story click handler
  const handleStoryClick = (item: HNItem) => {
    // Add to history if it's a story
    if (item.type === 'story') {
      addToHistory(item.id, {
        title: item.title,
        by: item.by,
        url: item.url
      });
    }

    if (options.directLinks) {
      // If direct links enabled, always use external links
      window.open(item.formatted?.links.main, '_blank');
    } else {
      // Otherwise follow HN pattern
      if (item.type === 'story' && item.url) {
        // External link for stories with URLs
        window.open(item.url, '_blank');
      } else {
        // Internal view for comments and text posts
        if (item.type === 'comment') {
          navigate(`/item/${item.parent}/comment/${item.id}`);
        } else {
          navigate(`/item/${item.id}`);
        }
      }
    }
  };

  // Update the StoryView close handler
  const handleStoryClose = () => {
    navigate('/');
  };

  // Add this near other state declarations in the HNLiveTerminal component
  const [showSearch, setShowSearch] = useState(false);

  // Add these state variables at the top of the component
  const [showAutoScrollNotif, setShowAutoScrollNotif] = useState(false);
  const [showDirectLinkNotif, setShowDirectLinkNotif] = useState(false);

  // Add this helper function
  const showTemporaryNotif = (setNotif: (show: boolean) => void) => {
    setNotif(true);
    setTimeout(() => setNotif(false), 1500); // Reduced to 1.5 seconds for snappier feedback
  };

  // First add a new state for the settings menu
  const [showSettings, setShowSettings] = useState(false);

  // Add page order array
  const PAGE_ORDER = ['front', 'trending', 'show', 'ask', 'best', 'jobs'] as const;

  // Add swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const currentPath = location.pathname.slice(1);
      const currentIndex = PAGE_ORDER.indexOf(currentPath as typeof PAGE_ORDER[number]);
      if (currentIndex >= 0) {
        // If we're at the last page, go to the first page
        const nextIndex = currentIndex === PAGE_ORDER.length - 1 ? 0 : currentIndex + 1;
        navigate(`/${PAGE_ORDER[nextIndex]}`);
      }
    },
    onSwipedRight: () => {
      const currentPath = location.pathname.slice(1);
      const currentIndex = PAGE_ORDER.indexOf(currentPath as typeof PAGE_ORDER[number]);
      if (currentIndex >= 0) {
        // If we're at the first page, go to the last page
        const nextIndex = currentIndex === 0 ? PAGE_ORDER.length - 1 : currentIndex - 1;
        navigate(`/${PAGE_ORDER[nextIndex]}`);
      }
    },
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: false,
    delta: 50, // minimum swipe distance
    swipeDuration: 500, // maximum time for swipe motion
    touchEventOptions: { passive: false } // important for preventing default touch behavior
  });

  // In the terminal view section where new stories are rendered
  const renderNewItem = (item: HNItem) => {
    if (item.type === 'story') {
      return (
        <div className="opacity-75">
          <span className="font-bold">
            {item.title || 'Untitled'}
          </span>
          {' • '}
          <span className="text-[#ff6600]">{item.by}</span>
          {item.score !== undefined && (
            <>
              {' • '}
              {item.score} points
            </>
          )}
        </div>
      );
    }

    // Keep existing comment rendering
    if (item.type === 'comment') {
      return (
        <div className="opacity-75">
          Comment by {item.by}: {item.text?.replace(/<[^>]*>/g, '').slice(0, 100)}...
        </div>
      );
    }

    // Fallback for other types
    return (
      <div className="opacity-75">
        <pre className="font-mono text-xs whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
      </div>
    );
  };

  // Add state for username colorization
  const [colorizeUsernames, setColorizeUsernames] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COLORIZE_USERNAMES);
    return saved ? JSON.parse(saved) : false; // Default to false - usernames not colorized
  });

  // Add effect to save setting
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.COLORIZE_USERNAMES, JSON.stringify(colorizeUsernames));
  }, [colorizeUsernames]);

  // Update the settings handler to store the layout preference
  const handleSettingsUpdate = (newOptions: TerminalOptions) => {
    setOptions(newOptions);
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, newOptions.theme);
      localStorage.setItem(STORAGE_KEYS.AUTOSCROLL, String(newOptions.autoscroll));
      localStorage.setItem(STORAGE_KEYS.DIRECT_LINKS, String(newOptions.directLinks));
      localStorage.setItem(STORAGE_KEYS.CLASSIC_LAYOUT, String(newOptions.classicLayout));
      localStorage.setItem(STORAGE_KEYS.SHOW_COMMENT_PARENTS, String(newOptions.showCommentParents));
      localStorage.setItem(STORAGE_KEYS.FONT, newOptions.font);
      localStorage.setItem(STORAGE_KEYS.USE_ALGOLIA_API, String(newOptions.useAlgoliaApi));
    } catch (e) {
      console.warn('Could not save settings to localStorage');
    }
  };

  // Add effect to save comment parent preference
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SHOW_COMMENT_PARENTS, String(options.showCommentParents));
    } catch (e) {
      console.warn('Could not save comment parent preference');
    }
  }, [options.showCommentParents]);

  // Add state for user modal
  const [viewingUser, setViewingUser] = useState<string | null>(null);

  // Add event listener for the custom viewUser event
  useEffect(() => {
    const handleViewUser = (e: CustomEvent) => {
      setViewingUser(e.detail);
    };

    window.addEventListener('viewUser', handleViewUser as EventListener);
    return () => {
      window.removeEventListener('viewUser', handleViewUser as EventListener);
    };
  }, []);

  // Add a click handler to the container
  useEffect(() => {
    const handleContainerClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Check if the clicked element is a username link
      if (target.matches('a[data-username]')) {
        e.preventDefault();
        e.stopPropagation();
        
        const username = target.getAttribute('data-username');
        if (username) {
          setViewingUser(username);
        }
      }
    };

    // Add the event listener to the container
    const container = document.getElementById('terminal-container');
    if (container) {
      container.addEventListener('click', handleContainerClick);
    }

    return () => {
      if (container) {
        container.removeEventListener('click', handleContainerClick);
      }
    };
  }, []);

  // Add state for showing more menu
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Add ESC key handler for the MORE dropdown
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showMoreMenu) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showMoreMenu]);

  // Add click outside handler for the MORE dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.more-dropdown') && showMoreMenu) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMoreMenu]);

  const hasLoggedRef = useRef(false);

  useEffect(() => {
    // Only log if we haven't logged before
    if (hasLoggedRef.current) return;
    hasLoggedRef.current = true;
    
    showConsoleGreeting();
  }, []);

  // Add this effect to update theme-color meta tag when theme changes
  useEffect(() => {
    const themeColor = {
      'og': '#ff6600',    // Keep orange for OG theme
      'dog': '#1a1a1a',   // Dark for dog theme
      'green': '#000000'  // Black for green theme
    }[options.theme];

    // Update theme-color meta tag
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', themeColor);
    }
  }, [options.theme]);

  // Add near other state declarations
  const [hnUsername, setHnUsername] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.USERNAME);
    } catch (e) {
      console.warn('Could not access localStorage');
      return null;
    }
  });

  // Add handler for username updates
  const handleUpdateHnUsername = (username: string | null) => {
    try {
      if (username) {
        localStorage.setItem(STORAGE_KEYS.USERNAME, username);
      } else {
        localStorage.removeItem(STORAGE_KEYS.USERNAME);
      }
      setHnUsername(username);
    } catch (e) {
      console.warn('Could not save username to localStorage');
    }
  };

  // Add handler for user clicks
  const handleUserClick = (username: string) => {
    setViewingUser(username);  // This will trigger the UserModal to open
  };

  // Add state for unread replies
  const [unreadReplies, setUnreadReplies] = useState<number>(() => {
    try {
      const count = localStorage.getItem('hn-unread-count');
      return count ? parseInt(count, 10) : 0;
    } catch (e) {
      console.warn('Could not access localStorage');
      return 0;
    }
  });

  // Check for unread replies and listen for changes
  useEffect(() => {
    // Initial load is now handled by useState initializer above
    
    // Listen for changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hn-unread-count' && e.newValue !== null) {
        setUnreadReplies(parseInt(e.newValue, 10));
      }
    };

    // Listen for custom event from same window
    const handleUnreadChange = (e: CustomEvent) => {
      setUnreadReplies(e.detail.unreadCount);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('unreadCountChange', handleUnreadChange as EventListener);

    // Also listen for custom event from service worker updates
    const handleUnreadUpdate = (e: MessageEvent) => {
      if (e.data.type === 'updateCommentTracker' && !e.data.data.isFirstLoad) {
        const { unreadCount } = e.data.data;
        setUnreadReplies(unreadCount);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleUnreadUpdate);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('unreadCountChange', handleUnreadChange as EventListener);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleUnreadUpdate);
      }
    };
  }, []);

  // Add back the event listener for navigation
  useEffect(() => {
    const handleNavigateToParentStory = (e: CustomEvent) => {
      navigate(`/item/${e.detail}`);
    };

    window.addEventListener('navigateToParentStory', handleNavigateToParentStory as EventListener);
    return () => {
      window.removeEventListener('navigateToParentStory', handleNavigateToParentStory as EventListener);
    };
  }, [navigate]);

  // Add options as a dependency to the formatItem function
  useEffect(() => {
    // Re-format all items when directLinks setting changes
    const reformatItems = async () => {
      const updatedItems = await Promise.all(
        items.map(async (item) => {
          const formatted = await formatItem(item);
          return formatted ? { ...item, formatted } : item;
        })
      );
      setItems(updatedItems);
    };

    reformatItems();
  }, [options.directLinks]); // Only re-run when directLinks changes

  // Add effect to handle abort requests
  useEffect(() => {
    const handleAbortRequests = (e: CustomEvent) => {
      const controller = e.detail;
      if (controller && controller.abort) {
        controller.abort();
      }
    };

    window.addEventListener('abortRequests', handleAbortRequests as EventListener);
    return () => {
      window.removeEventListener('abortRequests', handleAbortRequests as EventListener);
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>HN Live - Real-time Hacker News Client</title>
        <meta name="description" content="Live, real-time feed of Hacker News stories and discussions as they happen. Watch new posts and comments appear instantly from the HN community." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "HN Live",
            "description": "Real-time Hacker News Client",
            "url": "https://hn.live",
            "applicationCategory": "News",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "availability": "https://schema.org/InStock",
              "price": "0"
            },
            "featureList": [
              "Real-time updates",
              "Live comment feed",
              "Instant story notifications"
            ]
          })}
        </script>
        <style>{themeStyles}</style>
        <style>{mobileNavStyles}</style>
        <style>
          {`
            .terminal-container::before {
              content: '';
              position: absolute;
              top: -1px;
              left: 0;
              right: 0;
              height: 2px;
              background-color: ${theme === 'og' ? 'rgba(255, 102, 0, 0.9)' : 'transparent'};
              z-index: 10;
            }
          `}
        </style>
      </Helmet>
      <div {...swipeHandlers} className={`
        min-h-screen flex flex-col
        ${theme === 'green'
          ? 'bg-black text-green-400'
          : theme === 'og'
          ? 'bg-[#f6f6ef] text-[#111]'
          : 'bg-[#1a1a1a] text-[#c9d1d9]'}
        mt-[env(safe-area-inset-top)]
        pb-[env(safe-area-inset-bottom)]
        ${options.font === 'mono' ? 'font-mono' : 
          options.font === 'jetbrains' ? 'font-jetbrains' :
          options.font === 'fira' ? 'font-fira' :
          options.font === 'source' ? 'font-source' :
          options.font === 'sans' ? 'font-sans' :
          options.font === 'serif' ? 'font-serif' :
          'font-system'}
        ${options.fontSize}
      `}>
        <noscript>
          <div className="p-4">
            <h1>HN Live - Real-time Hacker News Client</h1>
            <p>This is a real-time feed of Hacker News content. JavaScript is required to view the live updates.</p>
          </div>
        </noscript>
        {showAbout && (
          <AboutOverlay 
            theme={theme}
            themeColors={themeColors}
            themeBg={themeBg}
            headerColor={headerColor}
            onClose={() => setShowAbout(false)}
          />
        )}
        <UpdateNotifier 
          className={
            theme === 'green'
              ? 'bg-green-900/80 text-green-400 border border-green-500/20'
              : theme === 'og'
              ? 'bg-[#f6f6ef]/80 text-[#828282] border-[#ff6600]/20'
              : 'bg-[#1a1a1a]/80 text-[#828282] border-[#828282]/20'
          }
          buttonClassName={
            theme === 'green'
              ? 'bg-green-500 text-black hover:bg-green-400'
              : 'bg-[#ff6600] text-white hover:bg-[#ff6600]/80'
          }
        />
        <div className={`
          fixed top-0 left-0 right-0 z-50 
          ${themeHeaderBg} ${theme === 'og' ? headerTextColor : themeColors}
          px-4 sm:px-6
          py-2
          border-b-0
        `}>
          {/* Mobile Layout - Top Bar */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between">
              {/* Left side with logo and about */}
              <div className="flex items-center gap-2">
                <span 
                  onClick={reloadSite}
                  className={`${theme === 'og' ? headerTextColor : headerColor} font-bold tracking-wider flex items-center gap-2 relative cursor-pointer hover:opacity-75 transition-opacity`}
                >
                  HN
                  <span className="animate-pulse">
                    <span className={`inline-block w-2 h-2 rounded-full ${isRunning ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                  </span>
                  LIVE
                  {queueSize > 99 && (
                    <span className={`absolute -top-1 -right-4 min-w-[1.2rem] h-[1.2rem] 
                      ${options.theme === 'green' ? 'bg-green-500 text-black' : 'bg-white text-[#ff6600]'} 
                      rounded text-xs flex items-center justify-center font-bold`}
                    >
                      {queueSize}
                    </span>
                  )}
                </span>
                <button 
                  onClick={() => setShowAbout(true)}
                  className={`${theme === 'og' ? headerTextColor : headerColor} mr-2`}
                >
                  [?]
                </button>
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-1">
                {/* Grep control */}
                {showGrep ? (
                  <div className="flex items-center gap-2">
                    <span>grep:</span>
                    <input
                      type="text"
                      value={filters.text}
                      onChange={(e) => setFilters(prev => ({...prev, text: e.target.value}))}
                      className={`bg-transparent border-b border-current outline-none w-32 px-1 ${theme === 'og' ? headerTextColor : themeColors}`}
                      placeholder="search..."
                      autoFocus
                      onBlur={() => {
                        if (!filters.text) {
                          setShowGrep(false);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowGrep(true)}
                    className={theme === 'og' ? headerTextColor : themeColors}
                    title="Ctrl/Cmd + F"
                  >
                    [GREP]
                  </button>
                )}

                {/* Start/Stop Button */}
                <button
                  onClick={toggleFeed}
                  className={`${
                    isRunning 
                      ? options.theme === 'og'
                        ? 'text-white'
                        : 'text-red-500' 
                      : options.theme === 'green'
                        ? 'text-green-400'
                        : options.theme === 'og'
                          ? 'text-white'
                          : 'text-green-600'
                  }`}
                >
                  [{isRunning ? 'STOP' : 'START'}]
                </button>

                {/* Clear Button */}
                <button
                  onClick={clearScreen}
                  className={`${
                    options.theme === 'green'
                      ? 'text-yellow-400'
                      : options.theme === 'dog'
                        ? 'text-yellow-500'
                        : options.theme === 'og'
                          ? 'text-white'
                          : 'text-yellow-600'
                  }`}
                >
                  [CLEAR]
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span 
                onClick={reloadSite}
                className={`${theme === 'og' ? headerTextColor : headerColor} font-bold tracking-wider flex items-center gap-2 relative cursor-pointer hover:opacity-75 transition-opacity`}
              >
                HN
                <span className="animate-pulse">
                  <span className={`inline-block w-2 h-2 rounded-full ${isRunning ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                </span>
                LIVE
                {queueSize > 99 && (
                  <span className={`absolute -top-1 -right-4 min-w-[1.2rem] h-[1.2rem] 
                    ${options.theme === 'green' ? 'bg-green-500 text-black' : 'bg-white text-[#ff6600]'} 
                    rounded text-xs flex items-center justify-center font-bold`}
                  >
                    {queueSize}
                  </span>
                )}
              </span>
              <button 
                onClick={() => setShowAbout(true)}
                className={`${theme === 'og' ? headerTextColor : headerColor} opacity-75 hover:opacity-100 transition-opacity`}
                title="About"
              >
                [?]
              </button>
              
              {headerText && (
                headerLink ? (
                  <a 
                    href={headerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${theme === 'og' ? headerTextColor : headerColor} text-sm font-bold opacity-75 hover:opacity-100 transition-opacity`}
                  >
                    {headerText}
                  </a>
                ) : (
                  <span className={`${theme === 'og' ? headerTextColor : headerColor} text-sm font-bold opacity-75`}>
                    {headerText}
                  </span>
                )
              )}


            </div>
            <div className="flex items-center gap-3">
              {/* Main navigation */}
              <a 
                href="/front" 
                className={`front-page-link hover:opacity-75 ${theme === 'og' ? 'text-white' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate('/front');
                }}
              >
                [VIEW FRONT PAGE]
              </a>

              {/* More dropdown */}
              <div className="relative hidden sm:inline-block more-dropdown">
                <button 
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={theme === 'og' ? headerTextColor : themeColors}
                >
                  [MORE]
                </button>
                
                {showMoreMenu && (
                  <div className={`absolute left-0 mt-2 py-2 w-48 rounded-lg shadow-lg z-50 border ${
                    theme === 'green'
                      ? 'bg-black border-green-500/30'
                      : theme === 'og'
                      ? 'bg-white border-[#ff6600]/30 text-[#828282]'
                      : 'bg-[#1a1a1a] border-[#828282]/30'
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
                          className={`block px-4 py-2 hover:opacity-75 ${theme === 'og' ? 'text-[#ff6600] hover:bg-gray-100' : ''}`}
                        >
                          [{typeof item.label === 'string' ? item.label : item.label(hnUsername)}]
                        </a>
                      ) : (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setShowMoreMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:opacity-75 ${theme === 'og' ? 'text-[#ff6600] hover:bg-gray-100' : ''}`}
                        >
                          [{typeof item.label === 'string' ? item.label : item.label(hnUsername)}]
                        </button>
                      )
                    ))}
                  </div>
                )}
              </div>

              {/* Search and other controls */}
              <button 
                onClick={() => setShowSearch(true)}
                className={theme === 'og' ? headerTextColor : themeColors}
                title="Ctrl/Cmd + K"
              >
                [SEARCH]
              </button>

              {/* GREP control */}
              <div className="hidden sm:block">
                {showGrep ? (
                  <div className="flex items-center gap-2">
                    <span>grep:</span>
                    <input
                      type="text"
                      value={filters.text}
                      onChange={(e) => setFilters(prev => ({...prev, text: e.target.value}))}
                      className={`bg-transparent border-b border-current outline-none w-32 px-1 ${theme === 'og' ? headerTextColor : themeColors}`}
                      placeholder="search..."
                      autoFocus
                      onBlur={() => {
                        if (!filters.text) {
                          setShowGrep(false);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowGrep(true)}
                    className={theme === 'og' ? headerTextColor : themeColors}
                    title="Ctrl/Cmd + F"
                  >
                    [GREP]
                  </button>
                )}
              </div>

              {/* Profile button with badge - now available to all users */}
              <div className="relative">
                <button
                  onClick={() => navigate('/dashboard')}
                  className={theme === 'og' ? headerTextColor : themeColors}
                >
                  [DASHBOARD]
                </button>
                {unreadReplies > 0 && (
                  <span className={`
                    absolute -top-1 -right-1 
                    min-w-[18px] h-[18px] 
                    rounded-full 
                    flex items-center justify-center
                    text-xs
                    ${theme === 'green' 
                      ? 'bg-green-500 text-black' 
                      : 'bg-white text-[#ff6600]'
                    }
                  `}>
                    {unreadReplies}
                  </span>
                )}
              </div>

              <button 
                onClick={() => setShowSettings(true)}
                className={theme === 'og' ? headerTextColor : themeColors}
              >
                [SETTINGS]
              </button>

              {/* Start/Stop control */}
              <button 
                onClick={toggleFeed}
                className={`${
                  isRunning 
                    ? options.theme === 'og'
                      ? 'text-white'
                      : 'text-red-500' 
                    : options.theme === 'green'
                      ? 'text-green-400'
                      : options.theme === 'og'
                        ? 'text-white'
                        : 'text-green-600'
                }`}
                title="Ctrl/Cmd + S"
              >
                [{isRunning ? 'STOP' : 'START'}]
              </button>

              {/* Clear screen */}
              <button 
                onClick={clearScreen}
                className={`${
                  options.theme === 'green'
                    ? 'text-yellow-400'
                    : options.theme === 'dog'
                      ? 'text-yellow-500'
                      : options.theme === 'og'
                        ? 'text-white'
                        : 'text-yellow-600'
                }`}
                title="Ctrl/Cmd + L"
              >
                [CLEAR]
              </button>
            </div>
          </div>
        </div>

        <div 
          ref={containerRef}
          className={`
            terminal-container
            fixed top-[40px] bottom-0 left-0 right-0 
            -mt-[1px]
            overflow-y-auto overflow-x-hidden 
            px-3 sm:px-4 pb-20 sm:pb-4
            ${options.theme === 'og' ? 'border-t border-[#ff6600]/90' : ''}
            ${options.font === 'mono' ? 'font-mono' : 
              options.font === 'jetbrains' ? 'font-jetbrains' :
              options.font === 'fira' ? 'font-fira' :
              options.font === 'source' ? 'font-source' :
              options.font === 'sans' ? 'font-sans' :
              options.font === 'serif' ? 'font-serif' :
              'font-system'}
            scrollbar-thin scrollbar-track-transparent
            ${options.theme === 'green'
              ? 'text-green-400 bg-black scrollbar-thumb-green-500/30'
              : options.theme === 'og'
              ? 'text-[#828282] bg-[#f6f6ef] scrollbar-thumb-[#ff6600]/30'
              : 'text-[#828282] bg-[#1a1a1a] scrollbar-thumb-[#ff6600]/30'
            }
            text-${options.fontSize}
          `}
        >
          {filteredItems.map((item, index) => (
            <div key={`${item.id}-${index}`} className="break-words">
              <div className="py-1">
                {/* Desktop view */}
                <div className="hidden sm:flex items-start gap-4">
                  <TimeStamp 
                    time={item.formatted?.timestamp.time || formatTimestamp(item.time).time}
                    fullDate={item.formatted?.timestamp.fullDate || formatTimestamp(item.time).fullDate}
                  />
                  <div className="flex-1">
                    <a 
                      onClick={(e) => {
                        e.preventDefault();
                        handleStoryClick(item);
                      }}
                      href={item.formatted?.links.main}
                      className={`${themeColors} transition-colors cursor-pointer`}
                      dangerouslySetInnerHTML={{ 
                        __html: item.type === 'story' && item.formatted?.text
                          ? item.formatted.text.replace(
                              item.title || '',
                              `<span class="font-bold">${item.title || ''}</span>`
                            ) 
                          : item.formatted?.text || '' 
                      }}
                    />
                    {/* Add discuss/comments link for all stories */}
                    {item.type === 'story' && (
                      <span className="ml-2">
                        <a 
                          href={item.formatted?.links.comments}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/item/${item.id}`);
                          }}
                          className={`${themeColors} opacity-50 hover:opacity-100 transition-colors cursor-pointer`}
                        >
                          [{item.kids?.length ? `${item.kids.length} comments` : 'discuss'}]
                        </a>
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile view */}
                <div className="sm:hidden space-y-1">
                  <TimeStamp 
                    time={item.formatted?.timestamp.time || formatTimestamp(item.time).time}
                    fullDate={item.formatted?.timestamp.fullDate || formatTimestamp(item.time).fullDate}
                  />
                  <div>
                    <a 
                      onClick={(e) => {
                        e.preventDefault();
                        handleStoryClick(item);
                      }}
                      href={item.formatted?.links.main}
                      className={`${themeColors} transition-colors cursor-pointer`}
                      dangerouslySetInnerHTML={{ 
                        __html: item.type === 'story' && item.formatted?.text
                          ? item.formatted.text.replace(
                              item.title || '',
                              `<span class="font-bold">${item.title || ''}</span>`
                            ) 
                          : item.formatted?.text || '' 
                      }}
                    />
                    {/* Add discuss/comments link for mobile view too */}
                    {item.type === 'story' && (
                      <span className="ml-2">
                        <a 
                          href={item.formatted?.links.comments}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/item/${item.id}`);
                          }}
                          className={`${themeColors} opacity-50 hover:opacity-100 transition-colors cursor-pointer`}
                        >
                          [{item.kids?.length ? `${item.kids.length} comments` : 'discuss'}]
                        </a>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="border-b border-current opacity-5 my-2"></div>
            </div>
          ))}
          
          {/* Update the cursor line for mobile too */}
          <div className="py-1">
            <div className="hidden sm:flex items-center gap-4">
              <TimeStamp 
                time={formatTimestamp(Date.now() / 1000).time}
                fullDate={formatTimestamp(Date.now() / 1000).fullDate}
              />
              <span>{'>'}</span>
              <span className="animate-pulse">█</span>
            </div>
            <div className="sm:hidden flex items-center gap-2 text-sm">
              <span className="opacity-50">{formatTimestamp(Date.now() / 1000).time}</span>
              <span>{'>'}</span>
              <span className="animate-pulse">█</span>
            </div>
          </div>
        </div>

        {location.pathname === '/front' && (
          <FrontPage 
            theme={options.theme}
            fontSize={options.fontSize}
            font={options.font}
            colorizeUsernames={colorizeUsernames}
            classicLayout={options.classicLayout}
            onShowSearch={() => setShowSearch(true)}
            onCloseSearch={() => setShowSearch(false)}
            onShowGrep={() => setShowGrep(true)}
            onShowSettings={() => setShowSettings(true)}
            isSettingsOpen={showSettings}
            isSearchOpen={showSearch}
            onViewUser={(userId) => setViewingUser(userId)}
            isRunning={isRunning}
            username={hnUsername}
            unreadCount={unreadReplies}
          />
        )}

        {/* Add the StoryView component to the render */}
        {location.pathname.startsWith('/item/') && (
          <StoryView
            itemId={Number(itemId)}
            scrollToId={Number(commentId)}
            onClose={() => navigate('/')}
            theme={theme}
            fontSize={options.fontSize}
            font={options.font}
            onShowSettings={() => setShowSettings(true)}
            isSettingsOpen={showSettings}
            isRunning={isRunning}
            useAlgoliaApi={options.useAlgoliaApi}
          />
        )}

        {/* Add loading indicator to the UI if needed */}
        {isLoadingStory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="text-white">Loading story...</div>
          </div>
        )}

        {/* Add SearchModal */}
        <SearchModal 
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          theme={options.theme}
        />

        {/* Add the ShowPage component to the render */}
        {location.pathname === '/show' && (
          <>
            <ShowPage 
              theme={options.theme} 
              fontSize={options.fontSize}
              font={options.font}
              colorizeUsernames={colorizeUsernames}
              classicLayout={options.classicLayout}
              onShowSearch={() => setShowSearch(true)}
              onCloseSearch={() => setShowSearch(false)}
              onShowGrep={() => setShowGrep(true)}
              onShowSettings={() => setShowSettings(true)}
              isSettingsOpen={showSettings}
              isSearchOpen={showSearch}
              onViewUser={(userId) => setViewingUser(userId)}
              isRunning={isRunning}
              username={hnUsername}
              unreadCount={unreadReplies}
            />
            <SearchModal 
              isOpen={showSearch}
              onClose={() => setShowSearch(false)}
              theme={options.theme}
              initialQuery="Show HN"
            />
          </>
        )}

        {/* Add the AskPage component to the render */}
        {location.pathname === '/ask' && (
          <>
            <AskPage 
              theme={options.theme}
              fontSize={options.fontSize}
              font={options.font}
              colorizeUsernames={colorizeUsernames}
              classicLayout={options.classicLayout}
              onShowSearch={() => setShowSearch(true)}
              onCloseSearch={() => setShowSearch(false)}
              onShowGrep={() => setShowGrep(true)}
              onShowSettings={() => setShowSettings(true)}
              isSettingsOpen={showSettings}
              isSearchOpen={showSearch}
              onViewUser={(userId) => setViewingUser(userId)}
              isRunning={isRunning}
              username={hnUsername}
              unreadCount={unreadReplies}
            />
            <SearchModal 
              isOpen={showSearch}
              onClose={() => setShowSearch(false)}
              theme={options.theme}
              initialQuery="Ask HN"
            />
          </>
        )}

        {/* Add the JobsPage component to the render */}
        {location.pathname === '/jobs' && (
          <JobsPage 
            theme={options.theme}
            fontSize={options.fontSize}
            font={options.font}
            colorizeUsernames={colorizeUsernames}
            classicLayout={options.classicLayout}
            onShowSearch={() => setShowSearch(true)}
            onCloseSearch={() => setShowSearch(false)}
            onShowGrep={() => setShowGrep(true)}
            onShowSettings={() => setShowSettings(true)}
            isSettingsOpen={showSettings}
            isSearchOpen={showSearch}
            onViewUser={(userId) => setViewingUser(userId)}
            isRunning={isRunning}
            username={hnUsername}
            unreadCount={unreadReplies}
          />
        )}

        {/* Add the BestPage component to the render */}
        {location.pathname === '/best' && (
          <BestPage 
            theme={options.theme}
            fontSize={options.fontSize}
            font={options.font}
            colorizeUsernames={colorizeUsernames}
            classicLayout={options.classicLayout}
            onShowSearch={() => setShowSearch(true)}
            onCloseSearch={() => setShowSearch(false)}
            onShowGrep={() => setShowGrep(true)}
            onShowSettings={() => setShowSettings(true)}
            isSettingsOpen={showSettings}
            isSearchOpen={showSearch}
            onViewUser={(userId) => setViewingUser(userId)}
            isRunning={isRunning}
            username={hnUsername}
            unreadCount={unreadReplies}
          />
        )}

        {/* Add the Terms page component to the render */}
        {location.pathname === '/terms' && (
          <TermsPage 
            theme={options.theme}
            isRunning={isRunning}
          />
        )}

        {/* Add the Privacy page component to the render */}
        {location.pathname === '/privacy' && (
          <PrivacyPage 
            theme={options.theme}
            isRunning={isRunning}
          />
        )}

        {/* Center notification overlay */}
        {(showAutoScrollNotif || showDirectLinkNotif) && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className={`
              text-lg animate-fade-out px-6 py-3 rounded-lg border
              ${options.theme === 'og'
                ? 'bg-[#1a1a1a] text-[#f6f6ef] border-[#ff6600]/30'
                : options.theme === 'dog'
                ? 'bg-[#f6f6ef] text-[#1a1a1a] border-[#ff6600]/30'
                : options.theme === 'green'
                ? 'bg-black/90 text-green-400 border-green-500/30'
                : ''
              }
            `}>
              {showAutoScrollNotif && (
                <div className="flex items-center gap-2">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-5 h-5"
                  >
                    <path d="M17 13l-5 5-5-5M17 7l-5 5-5-5" />
                  </svg>
                  Auto-scroll {options.autoscroll ? 'enabled' : 'disabled'}
                </div>
              )}
              {showDirectLinkNotif && (
                <div className="flex items-center gap-2">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-5 h-5"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Direct HN Links {options.directLinks ? 'enabled' : 'disabled'}
                </div>
              )}
            </div>
          </div>
        )}

        {showSettings && (
          <SettingsModal
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            theme={options.theme}
            options={options}
            onUpdateOptions={handleSettingsUpdate}
            colorizeUsernames={colorizeUsernames}
            onColorizeUsernamesChange={setColorizeUsernames}
            hnUsername={hnUsername}
            onUpdateHnUsername={handleUpdateHnUsername}
          />
        )}

        {/* Replace the mobile bottom bar with the new component */}
        <MobileBottomBar 
          theme={options.theme}
          onShowSearch={() => setShowSearch(true)}
          onCloseSearch={() => setShowSearch(false)}
          onShowSettings={() => setShowSettings(true)}
          isRunning={isRunning}
          username={hnUsername}
          unreadCount={unreadReplies}
        />

        {location.pathname.startsWith('/user/') && (
          <UserPage 
            theme={options.theme}
            fontSize={'base' as const}  // Force to base size for UserPage
            onShowSearch={() => setShowSearch(true)}
            onShowSettings={() => setShowSettings(true)}
            isRunning={isRunning}
          />
        )}

        {/* Add the UserModal component to the render */}
        <UserModal
          userId={viewingUser || ''}
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
          theme={options.theme}
          fontSize={options.fontSize}
        />

        {/* Add the ReplayView component to the render */}
        {location.pathname.startsWith('/replay/') && (
          <ReplayView
            theme={options.theme}
            fontSize={options.fontSize}
            font={options.font}
            onShowSettings={() => setShowSettings(true)}
            isSettingsOpen={showSettings}
            isRunning={isRunning}
          />
        )}

        {/* Add LinksView to the render section, after ReplayView */}
        {location.pathname.startsWith('/links/') && (
          <LinksView
            theme={options.theme}
            fontSize={options.fontSize}
            font={options.font}
            isRunning={isRunning}
          />
        )}

        {/* Add HistoricalFrontPage component to the render */}
        {location.pathname === '/frontpage-history' && (
          <HistoricalFrontPage 
            theme={options.theme}
            fontSize={options.fontSize}
            font={options.font}
            colorizeUsernames={colorizeUsernames}
            classicLayout={options.classicLayout}
            onShowSearch={() => setShowSearch(true)}
            onShowGrep={() => setShowGrep(true)}
            onShowSettings={() => setShowSettings(true)}
            isSettingsOpen={showSettings}
            isSearchOpen={showSearch}
            onViewUser={(userId) => setViewingUser(userId)}
            isRunning={isRunning}
          />
        )}

        {/* Add ActivePage component to the render */}
        {location.pathname === '/trending' && (
          <ActivePage 
            theme={options.theme}
            fontSize={options.fontSize}
            font={options.font}
            colorizeUsernames={colorizeUsernames}
            classicLayout={options.classicLayout}
            onShowSearch={() => setShowSearch(true)}
            onCloseSearch={() => setShowSearch(false)}
            onShowGrep={() => setShowGrep(true)}
            onShowSettings={() => setShowSettings(true)}
            isSettingsOpen={showSettings}
            isSearchOpen={showSearch}
            onViewUser={(userId) => setViewingUser(userId)}
            isRunning={isRunning}
            username={hnUsername}
            unreadCount={unreadReplies}
          />
        )}

        {/* Add BestCommentsPage component to the render */}
        {location.pathname === '/best-comments' && (
          <BestCommentsPage 
            theme={options.theme}
            fontSize={options.fontSize}
            font={options.font}
            colorizeUsernames={colorizeUsernames}
            classicLayout={options.classicLayout}
            onShowSearch={() => setShowSearch(true)}
            onCloseSearch={() => setShowSearch(false)}
            onShowGrep={() => setShowGrep(true)}
            onShowSettings={() => setShowSettings(true)}
            isSettingsOpen={showSettings}
            isSearchOpen={showSearch}
            onViewUser={(userId) => setViewingUser(userId)}
            isRunning={isRunning}
            username={hnUsername}
            unreadCount={unreadReplies}
          />
        )}

        {/* Add UserDashboardPage component to the render */}
        {location.pathname === '/dashboard' && (
          <div className="fixed inset-0 z-[100] bg-inherit overflow-auto">
            <UserDashboardPage />
          </div>
        )}

      </div>

      <Outlet />
    </>
  );
}
