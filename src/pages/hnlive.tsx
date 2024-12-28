import { useState, useEffect, useRef } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

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
}

interface SearchFilters {
  text: string;
}

export default function HNLiveTerminal() {
  useDocumentTitle('Hacker News Live');
  
  const [items, setItems] = useState<HNItem[]>([]);
  const [options, setOptions] = useState<TerminalOptions>({
    theme: 'og',
    autoscroll: true
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

      setTimeout(processNext, 800 + Math.random() * 400);
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
      // Create new abort controller
      abortControllerRef.current = new AbortController();
      
      try {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = undefined;
        }

        const response = await fetch('https://hacker-news.firebaseio.com/v0/maxitem.json', {
          signal: abortControllerRef.current.signal
        });
        const maxItem = await response.json();
        maxItemRef.current = maxItem;
        
        const itemIds = Array.from({length: 15}, (_, i) => (maxItem - 14) + i);
        
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
            await addItem(item);
          }
        }
        
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
          }, 30000);
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('Error fetching items:', error);
      }
    };

    if (isRunning) {
      fetchMaxItem();
    } else {
      // Abort any ongoing fetches when stopping
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

  return (
    <div className={`fixed inset-0 ${themeBg} font-mono`} data-theme={options.theme}>
      {showAbout && <AboutOverlay />}
      <div className={`fixed top-0 left-0 right-0 z-50 ${themeHeaderBg} border-b ${themeColors} py-2 px-3 sm:py-4 sm:px-4`}>
        {/* Mobile Layout */}
        <div className="block sm:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className={`${headerColor} font-bold tracking-wider flex items-center gap-2 relative`}>
              HN
              <span className="animate-pulse">
                <span className={`inline-block w-2 h-2 rounded-full ${isRunning ? 'bg-red-500' : 'bg-gray-500'}`}></span>
              </span>
              LIVE
              {queueSize >= 10 && (
                <span className={`absolute -top-1 -right-6 min-w-[1.2rem] h-[1.2rem] 
                  ${options.theme === 'green' ? 'bg-green-500 text-black' : 'bg-[#ff6600] text-white'} 
                  rounded text-xs flex items-center justify-center font-bold`}
                >
                  {queueSize}
                </span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowAbout(true)}
                className={themeColors}
              >
                [?]
              </button>
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
          <div className="flex items-center justify-between gap-2 text-sm overflow-x-auto">
            <div className="flex items-center gap-2 whitespace-nowrap">
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
                className={`${options.theme === 'green' ? 'text-green-400' : 'text-green-400/50'}`}
              >
                [{options.theme === 'green' ? '×' : ' '}] G
              </button>
              <button
                onClick={() => setOptions(prev => ({...prev, autoscroll: !prev.autoscroll}))}
                className={`${themeColors} ${!options.autoscroll && 'opacity-50'}`}
              >
                [{options.autoscroll ? '×' : ' '}] Auto-scroll
              </button>
            </div>
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

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className={`${headerColor} font-bold tracking-wider flex items-center gap-2 relative`}>
              HN
              <span className="animate-pulse">
                <span className={`inline-block w-2 h-2 rounded-full ${isRunning ? 'bg-red-500' : 'bg-gray-500'}`}></span>
              </span>
              LIVE
              {queueSize >= 10 && (
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
              className={`${options.theme === 'green' ? 'text-green-400' : 'text-green-400/50'}`}
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
                    href={item.formatted?.links.main}
                    target="_blank"
                    rel="noopener noreferrer"
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
                <div className="break-words overflow-hidden">
                  <a 
                    href={item.formatted?.links.main}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${themeColors} transition-colors cursor-pointer break-all`}
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
    </div>
  );
} 