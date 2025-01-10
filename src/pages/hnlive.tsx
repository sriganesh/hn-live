import { useState, useEffect, useRef } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { StoryView } from '../components/StoryView';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams, useLocation, Outlet } from 'react-router-dom';
import SearchModal from '../components/SearchModal';
import { FrontPage } from '../components/FrontPage';
import { ShowPage } from '../components/ShowPage';
import { AskPage } from '../components/AskPage';
import { JobsPage } from '../components/JobsPage';
import { BestPage } from '../components/BestPage';
import { useTopUsers } from '../hooks/useTopUsers';
import SettingsModal from '../components/SettingsModal';
import { MobileBottomBar } from '../components/MobileBottomBar';
import UserPage from '../components/UserPage';
import { UserModal } from '../components/UserModal';
import { AboutOverlay } from '../content/about';
import { BookmarksPage } from '../components/BookmarksPage';
import { navigationItems } from '../config/navigation';

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
}

interface SearchFilters {
  text: string;
}

const INITIAL_BUFFER_SIZE = 60;  // Number of items to fetch initially
const UPDATE_INTERVAL = 30000;   // How often to fetch new items (30 seconds)
const MIN_DISPLAY_INTERVAL = 800;  // Minimum time between displaying items
const MAX_DISPLAY_INTERVAL = 2000; // Maximum time between displaying items

const getStoredTheme = () => {
  try {
    const storedTheme = localStorage.getItem('hn-live-theme');
    if (storedTheme && ['green', 'og', 'dog'].includes(storedTheme)) {
      return storedTheme as 'green' | 'og' | 'dog';
    }
  } catch (e) {
    // Handle cases where localStorage might be unavailable
    console.warn('Could not access localStorage');
  }
  return 'og'; // Default theme if nothing is stored
};

const getStoredDirectLinks = () => {
  try {
    const storedDirectLinks = localStorage.getItem('hn-live-direct');
    return storedDirectLinks === 'true';
  } catch (e) {
    console.warn('Could not access localStorage');
  }
  return false; // Default to our site view
};

const getStoredAutoscroll = () => {
  try {
    const storedAutoscroll = localStorage.getItem('hn-live-autoscroll');
    // Return false if no value is stored (first visit) or if the stored value is 'false'
    return storedAutoscroll === 'true';
  } catch (e) {
    console.warn('Could not access localStorage');
  }
  return false; // Default to autoscroll off
};

const getStoredFontSize = () => {
  try {
    const storedSize = localStorage.getItem('hn-live-font-size');
    if (storedSize && ['xs', 'sm', 'base', 'lg', 'xl', '2xl'].includes(storedSize)) {
      return storedSize as 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
    }
    
    // If no stored preference, check screen width for default
    const isMobile = window.innerWidth < 640; // 640px is Tailwind's 'sm' breakpoint
    return isMobile ? 'sm' : 'base'; // 'sm' for mobile, 'base' for desktop
    
  } catch (e) {
    console.warn('Could not access localStorage');
    // Fallback to same mobile check if localStorage fails
    const isMobile = window.innerWidth < 640;
    return isMobile ? 'sm' : 'base';
  }
};

const getStoredLayout = () => {
  try {
    const storedLayout = localStorage.getItem('hn-live-classic-layout');
    // Return false only if explicitly set to 'false'
    return storedLayout === null ? true : storedLayout === 'true';
  } catch (e) {
    console.warn('Could not access localStorage');
  }
  return true; // Default to classic HN layout
};

const getStoredCommentParents = () => {
  try {
    const stored = localStorage.getItem('hn-live-comment-parents');
    return stored === 'true';
  } catch (e) {
    console.warn('Could not access localStorage');
  }
  return false; // Default to not showing parents
};

const getStoredFont = () => {
  try {
    const storedFont = localStorage.getItem('hn-live-font');
    if (storedFont && ['mono', 'jetbrains', 'fira', 'source', 'sans', 'serif', 'system'].includes(storedFont)) {
      return storedFont as FontOption;
    }
  } catch (e) {
    console.warn('Could not access localStorage');
  }
  return 'mono'; // Default to monospace
};

// Update the style to handle both dark and green themes
const themeStyles = `
  [data-theme='dog'] ::selection {
    background: rgba(255, 255, 255, 0.1);
    color: inherit;
  }
  
  [data-theme='green'] ::selection {
    background: rgba(34, 197, 94, 0.2); /* green-500 with low opacity */
    color: inherit;
  }
`;

// Add this near other style definitions at the top
const mobileNavStyles = `
  .mobile-nav-button {
    @apply flex-1 py-3 flex items-center justify-center transition-colors border-r last:border-r-0 border-current/30;
  }
`;

export default function HNLiveTerminal() {
  useDocumentTitle('Hacker News Live');
  
  const [items, setItems] = useState<HNItem[]>([]);
  const [options, setOptions] = useState<TerminalOptions>({
    theme: getStoredTheme(),
    autoscroll: getStoredAutoscroll(),
    directLinks: getStoredDirectLinks(),
    fontSize: getStoredFontSize(),
    classicLayout: getStoredLayout(),
    showCommentParents: getStoredCommentParents(),
    font: getStoredFont()
  });
  const [isRunning, setIsRunning] = useState(true);
  
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
  const { itemId, commentId } = useParams();
  const location = useLocation();

  const { isTopUser, getTopUserClass } = useTopUsers();

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
    if (!item.by || 
        (item.type === 'comment' && !item.text) || 
        item.text === '[delayed]') return null;

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
          let currentParent = await fetch(`https://hacker-news.firebaseio.com/v0/item/${item.parent}.json`).then(r => r.json());
          
          // Keep going up until we find the root story
          while (currentParent.type === 'comment' && currentParent.parent) {
            currentParent = await fetch(`https://hacker-news.firebaseio.com/v0/item/${currentParent.parent}.json`).then(r => r.json());
          }
          
          if (currentParent.type === 'story') {
            parentStory = currentParent;
          }
        } catch (error) {
          console.error('Error fetching parent story:', error);
        }
      }

      // First show the comment with the username
      text = `${userLink}: ${item.text?.replace(/<[^>]*>/g, '')}`;
      
      // Then add the parent story info if available, respecting directLinks setting
      if (parentStory) {
        text += ` <span class="opacity-50">| re: </span><a href="https://news.ycombinator.com/item?id=${parentStory.id}" 
          class="opacity-75 hover:opacity-100"
          target="_blank"
          rel="noopener noreferrer"
          onclick="event.stopPropagation()"
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
    setIsRunning(prev => {
      if (prev) {
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
      return !prev;
    });
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
    ? 'bg-[#f6f6ef]/90'
    : 'bg-[#1a1a1a]/90';

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

  // Add an effect to save theme changes
  useEffect(() => {
    try {
      localStorage.setItem('hn-live-theme', options.theme);
    } catch (e) {
      console.warn('Could not save theme preference');
    }
  }, [options.theme]);

  // Add an effect to save directLinks preference
  useEffect(() => {
    try {
      localStorage.setItem('hn-live-direct', options.directLinks.toString());
    } catch (e) {
      console.warn('Could not save direct links preference');
    }
  }, [options.directLinks]);

  // Add a new effect to save autoscroll changes
  useEffect(() => {
    try {
      localStorage.setItem('hn-live-autoscroll', options.autoscroll.toString());
    } catch (e) {
      console.warn('Could not save autoscroll preference');
    }
  }, [options.autoscroll]);

  // Add effect to save font size changes
  useEffect(() => {
    try {
      localStorage.setItem('hn-live-font-size', options.fontSize);
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
    const saved = localStorage.getItem('hn-live-colorize-usernames');
    return saved ? JSON.parse(saved) : true; // Default to true - usernames colorized
  });

  // Add effect to save setting
  useEffect(() => {
    localStorage.setItem('hn-live-colorize-usernames', JSON.stringify(colorizeUsernames));
  }, [colorizeUsernames]);

  // Update the settings handler to store the layout preference
  const handleSettingsUpdate = (newOptions: TerminalOptions) => {
    setOptions(newOptions);
    try {
      localStorage.setItem('hn-live-theme', newOptions.theme);
      localStorage.setItem('hn-live-autoscroll', String(newOptions.autoscroll));
      localStorage.setItem('hn-live-direct', String(newOptions.directLinks));
      localStorage.setItem('hn-live-classic-layout', String(newOptions.classicLayout));
      localStorage.setItem('hn-live-comment-parents', String(newOptions.showCommentParents));
      localStorage.setItem('hn-live-font', newOptions.font);
    } catch (e) {
      console.warn('Could not save settings to localStorage');
    }
  };

  // Add effect to save comment parent preference
  useEffect(() => {
    try {
      localStorage.setItem('hn-live-comment-parents', String(options.showCommentParents));
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

    const styles = [
      'color: #ff6600',
      'font-size: 20px',
      'font-weight: bold',
      'padding: 10px',
    ].join(';');

    const secondaryStyles = [
      'color: #828282',
      'font-size: 14px',
      'padding: 5px',
    ].join(';');

    console.log('%c👋 Hello fellow hacker!', styles);
    console.log(
      '%c💡 Have ideas for making HN Live faster/better? Let us know!', 
      secondaryStyles
    );
    console.log(
      '%c🐛 Found a bug? Want to add a feature? PRs are welcome!', 
      secondaryStyles
    );
    console.log(
      '%c🌟 HN Live is open source: https://github.com/sriganesh/hn-live', 
      secondaryStyles
    );
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

  return (
    <>
      <Helmet>
        <title>HN Live - Real-time Hacker News Feed</title>
        <meta name="description" content="Live, real-time feed of Hacker News stories and discussions as they happen. Watch new posts and comments appear instantly from the HN community." />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "HN Live",
            "description": "Real-time Hacker News feed",
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
      </Helmet>
      <div className={`
        min-h-screen flex flex-col
        ${theme === 'green' ? 'bg-black text-green-400' : theme === 'og' ? 'bg-[#f6f6ef] text-[#111]' : 'bg-[#1a1a1a] text-[#c9d1d9]'}
        mt-[env(safe-area-inset-top)]
        pb-[env(safe-area-inset-bottom)]
        ${options.font === 'mono' ? 'font-mono' : 
          options.font === 'jetbrains' ? 'font-jetbrains' :
          options.font === 'fira' ? 'font-fira' :
          options.font === 'source' ? 'font-source' :
          options.font === 'sans' ? 'font-sans' :
          options.font === 'serif' ? 'font-serif' :
          options.font === 'system' ? 'font-system' :
          'font-sans'}
        ${options.fontSize}
      `}>
        <noscript>
          <div className="p-4">
            <h1>HN Live - Real-time Hacker News Feed</h1>
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
        <div className={`
          fixed top-0 left-0 right-0 z-50 
          ${themeHeaderBg} ${themeColors}
          px-4 sm:px-6
          pt-[max(20px,env(safe-area-inset-top))]
          pb-2
          sm:py-4
        `}>
          {/* Mobile Layout - Top Bar */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between">
              {/* Left side with logo and about */}
              <div className="flex items-center gap-4">
                <span 
                  onClick={reloadSite}
                  className={`${headerColor} font-bold tracking-wider flex items-center gap-2 relative cursor-pointer hover:opacity-75 transition-opacity`}
                >
                  HN
                  <span className="animate-pulse">
                    <span className={`inline-block w-2 h-2 rounded-full ${isRunning ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                  </span>
                  LIVE
                  {queueSize > 99 && (
                    <span className={`absolute -top-1 -right-4 min-w-[1.2rem] h-[1.2rem] 
                      ${options.theme === 'green' ? 'bg-green-500 text-black' : 'bg-[#ff6600] text-white'} 
                      rounded text-xs flex items-center justify-center font-bold`}
                    >
                      {queueSize}
                    </span>
                  )}
                </span>
                <button 
                  onClick={() => setShowAbout(true)}
                  className={`${themeColors} mr-2`}
                >
                  [?]
                </button>
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-2">
                {/* Grep control */}
                {showGrep ? (
                  <div className="flex items-center gap-2">
                    <span>grep:</span>
                    <input
                      type="text"
                      value={filters.text}
                      onChange={(e) => setFilters(prev => ({...prev, text: e.target.value}))}
                      className={`bg-transparent border-b border-current outline-none w-32 px-1 ${themeColors}`}
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
                    className={themeColors}
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
                      ? 'text-red-500' 
                      : options.theme === 'green'
                        ? 'text-green-400'
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
            <div className="flex items-center gap-4">
              <span 
                onClick={reloadSite}
                className={`${headerColor} font-bold tracking-wider flex items-center gap-2 relative cursor-pointer hover:opacity-75 transition-opacity`}
              >
                HN
                <span className="animate-pulse">
                  <span className={`inline-block w-2 h-2 rounded-full ${isRunning ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                </span>
                LIVE
                {queueSize > 99 && (
                  <span className={`absolute -top-1 -right-4 min-w-[1.2rem] h-[1.2rem] 
                    ${options.theme === 'green' ? 'bg-green-500 text-black' : 'bg-[#ff6600] text-white'} 
                    rounded text-xs flex items-center justify-center font-bold`}
                  >
                    {queueSize}
                  </span>
                )}
              </span>
              <button
                onClick={() => setShowAbout(true)}
                className={`${headerColor} opacity-75 hover:opacity-100 transition-opacity`}
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
                    className={`${headerColor} text-sm font-bold opacity-75 hover:opacity-100 transition-opacity`}
                  >
                    {headerText}
                  </a>
                ) : (
                  <span className={`${headerColor} text-sm font-bold opacity-75`}>
                    {headerText}
                  </span>
                )
              )}
            </div>
            <div className="flex items-center gap-4">
              {/* Main navigation */}
              <button 
                onClick={() => navigate('/front')}
                className="hidden sm:inline text-[#ff6600] font-bold"
              >
                [VIEW FRONT PAGE]
              </button>

              {/* More dropdown */}
              <div className="relative hidden sm:inline-block more-dropdown">
                <button 
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={themeColors}
                >
                  [MORE]
                </button>
                
                {showMoreMenu && (
                  <div className={`absolute left-0 mt-2 py-2 w-48 rounded-lg shadow-lg z-50 border ${
                    theme === 'green'
                      ? 'bg-black border-green-500/30'
                      : theme === 'og'
                      ? 'bg-white border-[#ff6600]/30'
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
                          className="block px-4 py-2 hover:opacity-75"
                        >
                          [{item.label}]
                        </a>
                      ) : (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setShowMoreMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:opacity-75"
                        >
                          [{item.label}]
                        </button>
                      )
                    ))}
                  </div>
                )}
              </div>

              {/* Search and other controls */}
              <button 
                onClick={() => setShowSearch(true)}
                className={themeColors}
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
                      className={`bg-transparent border-b border-current outline-none w-32 px-1 ${themeColors}`}
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
                    className={themeColors}
                    title="Ctrl/Cmd + F"
                  >
                    [GREP]
                  </button>
                )}
              </div>

              {/* Replace theme selector and settings with new Settings button and dropdown */}
              <div className="relative">
              <button
                onClick={() => setShowSettings(true)}
                className={`${themeColors} opacity-75 hover:opacity-100 transition-colors`}
              >
                [SETTINGS]
              </button>
              </div>

              {/* Start/Stop control */}
              <button 
                onClick={toggleFeed}
                className={`${
                  isRunning 
                    ? options.theme === 'green'
                      ? 'text-red-500'
                      : 'text-red-500'
                    : options.theme === 'green'
                      ? 'text-green-400'
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
            fixed top-[60px] bottom-0 left-0 right-0 
            overflow-y-auto overflow-x-hidden 
            px-3 sm:px-4 pb-20 sm:pb-4
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
                        __html: item.type === 'story' 
                          ? item.formatted?.text.replace(
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
                        __html: item.type === 'story' 
                          ? item.formatted?.text.replace(
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
            onShowGrep={() => setShowGrep(true)}
            onShowSettings={() => setShowSettings(true)}
            isSettingsOpen={showSettings}
            isSearchOpen={showSearch}
            onViewUser={(userId) => setViewingUser(userId)}
          />
        )}

        {/* Add the StoryView component to the render */}
        {location.pathname.startsWith('/item/') && (
          <StoryView
            itemId={Number(itemId)}
            scrollToId={Number(commentId)}
            onClose={() => navigate('/')}
            theme={options.theme}
            fontSize={options.fontSize}
            font={options.font}
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
              onShowGrep={() => setShowGrep(true)}
              onShowSettings={() => setShowSettings(true)}
              isSettingsOpen={showSettings}
              isSearchOpen={showSearch}
              onViewUser={(userId) => setViewingUser(userId)}
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
              onShowGrep={() => setShowGrep(true)}
              onShowSettings={() => setShowSettings(true)}
              isSettingsOpen={showSettings}
              isSearchOpen={showSearch}
              onViewUser={(userId) => setViewingUser(userId)}
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
          <>
            <JobsPage 
              theme={options.theme}
              fontSize={options.fontSize}
              font={options.font}
              onShowSearch={() => setShowSearch(true)}
              onShowSettings={() => setShowSettings(true)}
              isSettingsOpen={showSettings}
              isSearchOpen={showSearch}
            />
            <SearchModal 
              isOpen={showSearch}
              onClose={() => setShowSearch(false)}
              theme={options.theme}
            />
          </>
        )}

        {/* Add the BestPage component to the render */}
        {location.pathname === '/best' && (
          <>
            <BestPage 
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
            />
            <SearchModal 
              isOpen={showSearch}
              onClose={() => setShowSearch(false)}
              theme={options.theme}
            />
          </>
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

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          theme={options.theme}
          options={options}
          onUpdateOptions={handleSettingsUpdate}
          colorizeUsernames={colorizeUsernames}
          onColorizeUsernamesChange={setColorizeUsernames}
          isMobile={window.innerWidth < 640}
        />

        {/* Replace the mobile bottom bar with the new component */}
        <MobileBottomBar 
          theme={options.theme}
          onShowSearch={() => setShowSearch(true)}
          onCloseSearch={() => setShowSearch(false)}
          onShowSettings={() => setShowSettings(true)}
          isRunning={isRunning}
        />

        {location.pathname.startsWith('/user/') && (
          <UserPage 
            theme={options.theme}
            fontSize={options.fontSize}
            onShowSearch={() => setShowSearch(true)}
            onShowSettings={() => setShowSettings(true)}
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

        {/* Add the BookmarksPage component to the render */}
        {location.pathname === '/bookmarks' && (
          <BookmarksPage 
            theme={options.theme}
            fontSize={options.fontSize}
            font={options.font}
            onShowSearch={() => setShowSearch(true)}
            onCloseSearch={() => setShowSearch(false)}
            onShowSettings={() => setShowSettings(true)}
            isRunning={isRunning}
          />
        )}
      </div>

      <Outlet />
    </>
  );
} 