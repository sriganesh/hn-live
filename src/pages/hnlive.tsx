import { useState, useEffect, useRef } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { StoryView } from '../components/StoryView';

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

const INITIAL_BUFFER_SIZE = 30;  // Number of items to fetch initially
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

export default function HNLiveTerminal() {
  useDocumentTitle('Hacker News Live');
  
  const [items, setItems] = useState<HNItem[]>([]);
  const [options, setOptions] = useState<TerminalOptions>({
    theme: getStoredTheme(),
    autoscroll: true,
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
    
    const userLink = `<a href="https://news.ycombinator.com/user?id=${item.by}" 
      class="hn-username hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >${item.by}</a>`;
    
    if (item.type === 'comment') {
      text = `${userLink} > ${item.text?.replace(/<[^>]*>/g, '')}`;
      links.main = `https://news.ycombinator.com/item?id=${item.id}`;
      links.comments = ''; // Empty string for comments since it's a comment
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

  return (
    <div className={`fixed inset-0 ${themeBg} font-mono`} data-theme={options.theme}>
      {showAbout && <AboutOverlay />}
      <div className={`fixed top-0 left-0 right-0 z-50 ${themeHeaderBg} border-b ${themeColors} py-2 px-3 sm:py-4 sm:px-4`}>
        {/* Mobile Layout */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className={`${headerColor} font-bold tracking-wider flex items-center gap-2 relative`}>
              HN
              <span className="animate-pulse">
                <span className={`inline-block w-2 h-2 rounded-full ${isRunning ? 'bg-red-500' : 'bg-gray-500'}`}></span>
              </span>
              LIVE
              {queueSize >= 50 && (
                <span className={`absolute -top-1 -right-6 min-w-[1.2rem] h-[1.2rem] 
                  ${options.theme === 'green' ? 'bg-green-500 text-black' : 'bg-[#ff6600] text-white'} 
                  rounded text-xs flex items-center justify-center font-bold`}
                >
                  {queueSize}
                </span>
              )}
            </span>

            {/* Theme options in the middle */}
            <div className="flex items-center gap-2">
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
            </div>

            {/* Controls on the right */}
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowAbout(true)}
                className={themeColors}
              >
                [?]
              </button>
            </div>
          </div>

          {/* Second row for other controls */}
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
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
            </div>
            <div className="flex items-center gap-2">
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
              <button 
                onClick={toggleFeed}
                className={themeColors}
              >
                [{isRunning ? 'STOP' : 'START'}]
              </button>
              <button 
                onClick={clearScreen}
                className={themeColors}
              >
                [CLR]
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className={`${headerColor} font-bold tracking-wider flex items-center gap-2 relative`}>
              HN
              <span className="animate-pulse">
                <span className={`inline-block w-2 h-2 rounded-full ${isRunning ? 'bg-red-500' : 'bg-gray-500'}`}></span>
              </span>
              LIVE
              {queueSize >= 50 && (
                <span className={`absolute -top-1 -right-6 min-w-[1.2rem] h-[1.2rem] 
                  ${options.theme === 'green' ? 'bg-green-500 text-black' : 'bg-[#ff6600] text-white'} 
                  rounded text-xs flex items-center justify-center font-bold`}
                >
                  {queueSize}
                </span>
              )}
            </span>
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
              onClick={() => setShowAbout(true)}
              className={themeColors}
            >
              [ABOUT]
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
                      if (options.directLinks) {
                        window.open(item.formatted?.links.main, '_blank');
                      } else {
                        setViewingStory({ 
                          itemId: item.id,
                          scrollToId: item.type === 'comment' ? item.id : undefined
                        });
                      }
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
                        [comments]
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
                  <a 
                    onClick={(e) => {
                      e.preventDefault();
                      if (options.directLinks) {
                        window.open(item.formatted?.links.main, '_blank');
                      } else {
                        setViewingStory({ 
                          itemId: item.id,
                          scrollToId: item.type === 'comment' ? item.id : undefined
                        });
                      }
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
                  {item.type === 'story' && item.url && (
                    <span className="ml-2 inline-block">
                      <a 
                        href={item.formatted?.links.comments}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${themeColors} opacity-50 hover:opacity-100 transition-colors cursor-pointer`}
                      >
                        [comments]
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

      {/* Add the StoryView component to the render */}
      {viewingStory && (
        <StoryView
          itemId={viewingStory.itemId}
          scrollToId={viewingStory.scrollToId}
          onClose={() => setViewingStory(null)}
          theme={options.theme}
        />
      )}
    </div>
  );
} 