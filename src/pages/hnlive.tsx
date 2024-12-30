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

interface TerminalOptions {
  theme: 'green' | 'og' | 'dog';
  autoscroll: boolean;
  directLinks: boolean;
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
    // Return true if no value is stored (first visit) or if the stored value is 'true'
    return storedAutoscroll === null ? true : storedAutoscroll === 'true';
  } catch (e) {
    console.warn('Could not access localStorage');
  }
  return true; // Default to autoscroll on
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

export default function HNLiveTerminal() {
  useDocumentTitle('Hacker News Live');
  
  const [items, setItems] = useState<HNItem[]>([]);
  const [options, setOptions] = useState<TerminalOptions>({
    theme: getStoredTheme(),
    autoscroll: getStoredAutoscroll(),
    directLinks: getStoredDirectLinks()
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

  const navigate = useNavigate();
  const { itemId, commentId } = useParams();
  const location = useLocation();

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
    
    // Always link username directly to HN
    const userLink = `<a href="https://news.ycombinator.com/user?id=${item.by}" 
      class="hn-username hover:underline"
      target="_blank"
      rel="noopener noreferrer"
      onclick="event.stopPropagation()"
    >${item.by}</a>`;
    
    if (item.type === 'comment') {
      text = `${userLink} > ${item.text?.replace(/<[^>]*>/g, '')}`;
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
    setIsRunning(prev => !prev);
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
    if (isProcessingRef.current || !itemQueueRef.current.length) return;
    
    isProcessingRef.current = true;
    
    const processNext = () => {
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

      // Calculate next update interval based on queue size
      const queueSize = itemQueueRef.current.length;
      let interval;
      
      if (queueSize > 20) {
        // If queue is large, display faster
        interval = MIN_DISPLAY_INTERVAL;
      } else if (queueSize > 10) {
        // Medium queue, moderate speed
        interval = MIN_DISPLAY_INTERVAL + Math.random() * 500;
      } else {
        // Small queue, slower display to prevent empty periods
        interval = MIN_DISPLAY_INTERVAL + Math.random() * (MAX_DISPLAY_INTERVAL - MIN_DISPLAY_INTERVAL);
      }

      setTimeout(processNext, interval);
    };

    processNext();
  };

  // Replace the queueTrigger state and effect with this
  useEffect(() => {
    // Start processing when items are added to queue
    if (itemQueueRef.current.length > 0 && !isProcessingRef.current) {
      processQueue();
    }
  }, [isRunning]); // Only re-run when feed is started/stopped

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

  const themeColors = options.theme === 'green'
    ? 'text-green-400 hover:text-green-300 border-green-500/30'
    : options.theme === 'og'
    ? 'text-[#828282] hover:text-[#666666] border-[#ff6600]/30'
    : 'text-[#828282] hover:text-[#999999] border-[#ff6600]/30';

  // Add theme background color class
  const themeBg = options.theme === 'og' 
    ? 'bg-[#f6f6ef]' 
    : options.theme === 'dog'
    ? 'bg-[#1a1a1a]'
    : 'bg-black';
  const themeHeaderBg = options.theme === 'og' 
    ? 'bg-[#f6f6ef]/90' 
    : options.theme === 'dog'
    ? 'bg-[#1a1a1a]/90'
    : 'bg-black/90';

  // Update header title color
  const headerColor = options.theme === 'green'
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

  // Add About overlay component
  const AboutOverlay = () => (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className={`${themeBg} border ${themeColors} p-8 max-w-lg rounded-lg space-y-4`}>
        <div className="flex justify-between items-center">
          <h2 className={`${headerColor} text-lg font-bold`}>About HN Live</h2>
          <button 
            onClick={() => setShowAbout(false)}
            className={themeColors}
          >
            [×]
          </button>
        </div>
        <div className="space-y-4 text-sm">
          <p>
            HN Live is a real-time terminal interface for Hacker News, showing stories and comments as they happen.
          </p>
          <p>
            Built by{' '}
            <a 
              href="https://sri.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              sri.xyz
            </a>
            {' '}using the{' '}
            <a 
              href="https://github.com/HackerNews/API"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Hacker News API
            </a>
          </p>
          <p className="flex items-center gap-2">
            <svg 
              viewBox="0 0 24 24" 
              className="w-4 h-4" 
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <a
              href="https://github.com/sriganesh/hn-live/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              View source on GitHub
            </a>
          </p>
          <p className="text-xs opacity-75">
            Not affiliated with Hacker News or YCombinator(yet).
          </p>
        </div>
      </div>
    </div>
  );

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
      </Helmet>
      <div className={`fixed inset-0 ${themeBg} font-mono`} data-theme={options.theme}>
        <noscript>
          <div className="p-4">
            <h1>HN Live - Real-time Hacker News Feed</h1>
            <p>This is a real-time feed of Hacker News content. JavaScript is required to view the live updates.</p>
          </div>
        </noscript>
        {showAbout && <AboutOverlay />}
        <div className={`fixed top-0 left-0 right-0 z-50 ${themeHeaderBg} border-b ${themeColors} py-2 px-3 sm:py-4 sm:px-4`}>
          {/* Mobile Layout */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span 
                  onClick={reloadSite}
                  className={`${headerColor} font-bold tracking-wider flex items-center gap-2 relative cursor-pointer hover:opacity-75 transition-opacity`}
                >
                  HN
                  <span className="animate-pulse">
                    <span className={`inline-block w-2 h-2 rounded-full ${isRunning ? 'bg-red-500' : 'bg-gray-500'}`}></span>
                  </span>
                  LIVE
                  {queueSize >= 100 && (
                    <span className={`absolute -top-1 -right-4 min-w-[1.2rem] h-[1.2rem] 
                      ${options.theme === 'green' ? 'bg-green-500 text-black' : 'bg-[#ff6600] text-white'} 
                      rounded text-xs flex items-center justify-center font-bold`}
                    >
                      {queueSize}
                    </span>
                  )}
                </span>
              </div>

              {/* Auto-scroll, Direct, Theme options, and Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOptions(prev => ({...prev, autoscroll: !prev.autoscroll}))}
                  className={`${themeColors} flex items-center gap-1`}
                  title="Auto-scroll"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`w-4 h-4 ${!options.autoscroll && 'opacity-50'}`}
                  >
                    <path d="M17 13l-5 5-5-5M17 7l-5 5-5-5" />
                  </svg>
                </button>
                <button
                  onClick={() => setOptions(prev => ({...prev, directLinks: !prev.directLinks}))}
                  className={`${themeColors} flex items-center gap-1`}
                  title="Direct links"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={`w-4 h-4 ${!options.directLinks && 'opacity-50'}`}
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </button>
                <div className="flex items-center gap-3 ml-2">
                  <button 
                    onClick={() => setOptions(prev => ({...prev, theme: 'dog'}))}
                    className="relative"
                    title="Dark theme"
                  >
                    <div className={`w-4 h-4 rounded-full border ${
                      options.theme === 'green'
                        ? 'bg-[#1a1a1a] border-[#828282]'
                        : options.theme === 'og'
                        ? 'bg-black border-[#828282]/30'
                        : 'bg-[#1a1a1a] border-[#828282]/30'
                    }`} />
                    {options.theme === 'dog' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#828282]" />
                      </div>
                    )}
                  </button>
                  <button 
                    onClick={() => setOptions(prev => ({...prev, theme: 'og'}))}
                    className="relative"
                    title="Original theme"
                  >
                    <div className={`w-4 h-4 rounded-full border ${
                      options.theme === 'green'
                        ? 'bg-[#ff6600]/90 border-[#ff6600]'
                        : options.theme === 'dog'
                        ? 'bg-[#ff6600] border-[#ff6600]/30'
                        : 'bg-[#f6f6ef] border-[#ff6600]/30'
                    }`} />
                    {options.theme === 'og' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#ff6600]" />
                      </div>
                    )}
                  </button>
                  <button 
                    onClick={() => setOptions(prev => ({...prev, theme: 'green'}))}
                    className="relative"
                    title="Terminal theme"
                  >
                    <div className={`w-4 h-4 rounded-full border ${
                      options.theme === 'og'
                        ? 'bg-green-500 border-green-500/30'
                        : options.theme === 'dog'
                        ? 'bg-green-500 border-green-500/30'
                        : 'bg-black border-green-500/30'
                    }`} />
                    {options.theme === 'green' && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      </div>
                    )}
                  </button>
                </div>
                <button 
                  onClick={toggleFeed}
                  className={`${themeColors} ml-2`}
                  title={isRunning ? "Stop feed" : "Start feed"}
                >
                  {isRunning ? (
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor" 
                      className="w-4 h-4"
                    >
                      <rect x="6" y="4" width="4" height="16"/>
                      <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                  ) : (
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      viewBox="0 0 24 24" 
                      fill="currentColor" 
                      className="w-4 h-4"
                    >
                      <polygon points="5,3 19,12 5,21"/>
                    </svg>
                  )}
                </button>
                <button 
                  onClick={clearScreen}
                  className={themeColors}
                  title="Clear screen"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    className="w-4 h-4"
                  >
                    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    <path d="M10 10v8" />
                    <path d="M14 10v8" />
                  </svg>
                </button>
                <button 
                  onClick={() => setShowAbout(true)}
                  className={`${themeColors} ml-2`}
                >
                  [?]
                </button>
              </div>
            </div>

            {/* Second row */}
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate('/front')}
                  className={themeColors}
                >
                  [FRONT]
                </button>
                <button 
                  onClick={() => navigate('/best')}
                  className={themeColors}
                >
                  [BEST]
                </button>
                <button 
                  onClick={() => navigate('/show')}
                  className={themeColors}
                >
                  [SHOW]
                </button>
                <button 
                  onClick={() => navigate('/ask')}
                  className={themeColors}
                >
                  [ASK]
                </button>
                <button 
                  onClick={() => navigate('/jobs')}
                  className={themeColors}
                >
                  [JOBS]
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSearch(true)}
                  className={themeColors}
                  title="Search (Ctrl/Cmd + K)"
                >
                  [SEARCH]
                </button>
                {showGrep ? (
                  <div className="flex items-center gap-2">
                    <span>grep:</span>
                    <input
                      type="text"
                      value={filters.text}
                      onChange={(e) => setFilters(prev => ({...prev, text: e.target.value}))}
                      className={`bg-transparent border-b border-current outline-none w-20 px-1 ${themeColors}`}
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
                  >
                    [GREP]
                  </button>
                )}
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
                {queueSize >= 100 && (
                  <span className={`absolute -top-1 -right-4 min-w-[1.2rem] h-[1.2rem] 
                    ${options.theme === 'green' ? 'bg-green-500 text-black' : 'bg-[#ff6600] text-white'} 
                    rounded text-xs flex items-center justify-center font-bold`}
                  >
                    {queueSize}
                  </span>
                )}
              </span>
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
              <button 
                onClick={() => setOptions(prev => ({...prev, theme: 'dog'}))}
                className={`${options.theme === 'dog' ? 'text-[#ff6600]' : 'text-[#ff6600]/50'}`}
              >
                [{options.theme === 'dog' ? '×' : ' '}] D
              </button>
              <button 
                onClick={() => setOptions(prev => ({...prev, theme: 'og'}))}
                className={`${options.theme === 'og' ? 'text-[#ff6600]' : 'text-[#ff6600]/50'}`}
              >
                [{options.theme === 'og' ? '×' : ' '}] O
              </button>
              <button 
                onClick={() => setOptions(prev => ({...prev, theme: 'green'}))}
                className={`${
                  options.theme === 'green' 
                    ? 'text-green-600'
                    : options.theme === 'og'
                    ? 'text-green-700'
                    : 'text-green-400/50'
                }`}
              >
                [{options.theme === 'green' ? '×' : ' '}] G
              </button>
              <button
                onClick={() => setOptions(prev => ({...prev, autoscroll: !prev.autoscroll}))}
                className={`${themeColors} ${!options.autoscroll && 'opacity-50'}`}
              >
                [{options.autoscroll ? '×' : ' '}] Auto-scroll
              </button>
              <button
                onClick={() => setOptions(prev => ({...prev, directLinks: !prev.directLinks}))}
                className={`${themeColors} ${!options.directLinks && 'opacity-50'}`}
              >
                [{options.directLinks ? '×' : ' '}] Direct
              </button>
              <button 
                onClick={() => navigate('/front')}
                className={`hidden sm:inline ${themeColors}`}
              >
                [FRONT]
              </button>
              <button 
                onClick={() => navigate('/best')}
                className={`hidden sm:inline ${themeColors}`}
              >
                [BEST]
              </button>
              <button 
                onClick={() => navigate('/show')}
                className={`hidden sm:inline ${themeColors}`}
              >
                [SHOW]
              </button>
              <button 
                onClick={() => navigate('/ask')}
                className={`hidden sm:inline ${themeColors}`}
              >
                [ASK]
              </button>
              <button 
                onClick={() => setShowAbout(true)}
                className={themeColors}
              >
                [ABOUT]
              </button>
              <button 
                onClick={() => navigate('/jobs')}
                className={`hidden sm:inline ${themeColors}`}
              >
                [JOBS]
              </button>
              <button 
                onClick={toggleFeed}
                className={themeColors}
                title="Ctrl/Cmd + S"
              >
                [{isRunning ? 'STOP' : 'START'}]{showShortcuts && ' (⌘S)'}
              </button>
              <button 
                onClick={clearScreen}
                className={themeColors}
                title="Ctrl/Cmd + L"
              >
                [CLEAR]{showShortcuts && ' (⌘L)'}
              </button>
              <button
                onClick={() => setShowSearch(true)}
                className={themeColors}
                title="Ctrl/Cmd + K"
              >
                [SEARCH]{showShortcuts && ' (⌘K)'}
              </button>
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
                  [GREP]{showShortcuts && ' (⌘F)'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div 
          ref={containerRef}
          className={`h-screen pt-24 sm:pt-20 pb-20 sm:pb-4 px-3 sm:px-4 overflow-y-auto font-mono
                       ${options.theme === 'green'
                         ? 'text-green-400'
                         : 'text-[#828282]'}
                       scrollbar-thin scrollbar-track-transparent
                       ${options.theme === 'green'
                         ? 'scrollbar-thumb-green-500/30'
                         : 'scrollbar-thumb-[#ff6600]/30'}`}
        >
          {filteredItems.map((item, index) => (
            <div key={`${item.id}-${index}`}>
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
                      dangerouslySetInnerHTML={{ __html: item.formatted?.text || '' }}
                    />
                    {item.type === 'story' && item.url && (
                      <span className="ml-2">
                        <a 
                          href={item.formatted?.links.comments}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${themeColors} opacity-50 hover:opacity-100 transition-colors cursor-pointer`}
                        >
                          [{item.kids?.length ? 'comments' : 'discuss'}]
                        </a>
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile view */}
                <div className="sm:hidden space-y-1">
                  <div className="flex items-center gap-2 text-sm opacity-50">
                    <span>{item.formatted?.timestamp.time || formatTimestamp(item.time).time}</span>
                    <span>•</span>
                    <a 
                      href={`https://news.ycombinator.com/user?id=${item.by}`}
                      className="hn-username hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.by}
                    </a>
                  </div>
                  <div className="break-words whitespace-pre-wrap overflow-hidden">
                    {item.type === 'story' ? (
                      <>
                        <span className="opacity-50">
                          {item.url && (
                            <a 
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`${themeColors} opacity-50 hover:opacity-100 transition-colors`}
                            >
                              [link]
                            </a>
                          )}
                          {' '}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/item/${item.id}`);
                            }}
                            className={`${themeColors} opacity-50 hover:opacity-100 transition-colors cursor-pointer`}
                          >
                            [{item.kids?.length ? 'comments' : 'discuss'}]
                          </button>
                        </span>
                      </>
                    ) : (
                      <a 
                        onClick={(e) => {
                          e.preventDefault();
                          handleStoryClick(item);
                        }}
                        href={item.formatted?.links.main}
                        className={`${themeColors} transition-colors cursor-pointer`}
                        dangerouslySetInnerHTML={{ 
                          __html: item.formatted?.text
                            .replace(/<a[^>]*>.*?<\/a>\s*>\s*/, '')
                            .replace(/^[^>]*>\s*/, '')
                            || '' 
                        }}
                      />
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
          <FrontPage theme={options.theme} />
        )}

        {/* Add the StoryView component to the render */}
        {viewingStory && (
          <StoryView
            itemId={viewingStory.itemId}
            scrollToId={viewingStory.scrollToId}
            onClose={handleStoryClose}
            theme={options.theme}
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
          <ShowPage theme={options.theme} />
        )}

        {/* Add the AskPage component to the render */}
        {location.pathname === '/ask' && (
          <AskPage theme={options.theme} />
        )}

        {/* Add the JobsPage component to the render */}
        {location.pathname === '/jobs' && (
          <JobsPage theme={options.theme} />
        )}

        {/* Add the BestPage component to the render */}
        {location.pathname === '/best' && (
          <BestPage theme={options.theme} />
        )}
      </div>

      <Outlet />
    </>
  );
} 