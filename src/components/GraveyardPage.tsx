import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopUsers } from '../hooks/useTopUsers';
import { MobileBottomBar } from './MobileBottomBar';

interface GraveyardPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: 'xs' | 'sm' | 'base';
  colorizeUsernames: boolean;
  onShowSearch: () => void;
  onShowSettings: () => void;
}

interface HNItem {
  id: number;
  title?: string;
  text?: string;
  by: string;
  time: number;
  url?: string;
  score?: number;
  kids?: number[];
  type: 'story' | 'comment';
  dead: boolean;
  parent?: number;
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

const GRAVEYARD_MESSAGES = [
  "This story didn't make it...",
  "Another one bites the dust...",
  "Rest in peace, sweet post...",
  "Gone, but not forgotten...",
  "This one's sleeping with the fishes...",
  "Lost to the void...",
  "Crossed over to the other side...",
  "404'd into oblivion...",
  "Joined the digital afterlife...",
  "Pushed to /dev/null...",
];

export function GraveyardPage({ 
  theme, 
  fontSize,
  colorizeUsernames,
  onShowSearch,
  onShowSettings
}: GraveyardPageProps) {
  const navigate = useNavigate();
  const [items, setItems] = useState<HNItem[]>([]);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const processedIds = useRef<Set<number>>(new Set());
  const maxItemRef = useRef<number>(0);
  const { isTopUser, getTopUserClass } = useTopUsers();

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

  const INITIAL_FETCH_SIZE = 250; // Look through last 250 items initially

  const formatItem = async (item: HNItem) => {
    if (!item || !item.dead) return null;
    if (!item.by || item.text === '[deleted]') return null;

    let text = '';
    let links = {
      main: '',
      comments: ''
    };

    const userLink = `<a href="https://news.ycombinator.com/user?id=${item.by}" 
      class="hn-username ${colorizeUsernames && isTopUser(item.by) ? getTopUserClass(theme) : ''}"
      target="_blank"
      rel="noopener noreferrer"
    >${item.by}</a>`;

    // Get a random message
    const deadMessage = GRAVEYARD_MESSAGES[Math.floor(Math.random() * GRAVEYARD_MESSAGES.length)];
    const deadLink = `<a href="https://news.ycombinator.com/item?id=${item.id}" 
      class="opacity-75 hover:opacity-100" 
      target="_blank" 
      rel="noopener noreferrer"
    >${deadMessage}</a>`;

    if (item.type === 'story') {
      text = `${userLink}: ${item.title ? `${item.title} ${deadLink}` : deadLink}`;
      links.main = `https://news.ycombinator.com/item?id=${item.id}`;
    } else if (item.type === 'comment') {
      if (item.text === '[dead]') return null;
      text = `${userLink}: ${item.text?.replace(/<[^>]*>/g, '')} ${deadLink}`;
      links.main = `https://news.ycombinator.com/item?id=${item.id}`;
    }

    return {
      timestamp: formatTimestamp(item.time),
      text,
      links
    };
  };

  const fetchDeadItems = async () => {
    try {
      const response = await fetch('https://hacker-news.firebaseio.com/v0/maxitem.json');
      const maxItem = await response.json();
      maxItemRef.current = maxItem;

      // Fetch last INITIAL_FETCH_SIZE items to start with
      const itemIds = Array.from(
        {length: INITIAL_FETCH_SIZE}, 
        (_, i) => maxItem - i
      );

      for (const id of itemIds) {
        if (processedIds.current.has(id)) continue;
        
        try {
          const itemResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          const item = await itemResponse.json();
          
          if (item && item.dead === true && (item.type === 'story' || item.type === 'comment')) {
            const formattedItem = await formatItem(item);
            if (formattedItem) {
              setItems(prevItems => {
                if (prevItems.some(existing => existing.id === item.id)) {
                  return prevItems;
                }
                return [...prevItems, { ...item, formatted: formattedItem }];
              });
            }
          }
          
          processedIds.current.add(id);
        } catch (error) {
          console.error('Error processing item:', id);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchDeadItems');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadItems();
    
    const interval = setInterval(async () => {
      try {
        const response = await fetch('https://hacker-news.firebaseio.com/v0/maxitem.json');
        const newMaxItem = await response.json();
        
        if (newMaxItem > maxItemRef.current) {
          const newIds = Array.from(
            {length: newMaxItem - maxItemRef.current},
            (_, i) => maxItemRef.current + 1 + i
          );
          
          for (const id of newIds) {
            if (processedIds.current.has(id)) continue;
            
            try {
              const itemResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
              const item = await itemResponse.json();
              
              if (item && item.dead === true && (item.type === 'story' || item.type === 'comment')) {
                const formattedItem = await formatItem(item);
                if (formattedItem) {
                  setItems(prevItems => {
                    if (prevItems.some(existing => existing.id === item.id)) {
                      return prevItems;
                    }
                    return [...prevItems, { ...item, formatted: formattedItem }];
                  });
                }
              }
              
              processedIds.current.add(id);
            } catch (error) {
              console.error('Error fetching item:', id);
            }
          }
          
          maxItemRef.current = newMaxItem;
        }
      } catch (error) {
        console.error('Error polling for new items');
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const themeColors = theme === 'green'
    ? 'text-green-400 bg-black'
    : theme === 'og'
    ? 'text-[#828282] bg-[#f6f6ef]'
    : 'text-[#828282] bg-[#1a1a1a]';

  return (
    <>
      <div className={`fixed inset-0 z-50 ${themeColors} overflow-hidden text-${fontSize}`}>
        <div className="h-full overflow-y-auto p-4">
          {/* Desktop header */}
          <div className="hidden sm:flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/')}
                  className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold tracking-wider hover:opacity-75 flex items-center`}
                >
                  <span>HN</span>
                  <span className="text-2xl leading-[0] relative top-[1px] mx-[1px]">•</span>
                  <span>LIVE</span>
                </button>
                <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
                  /
                </span>
                <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
                  GRAVEYARD
                </span>
              </div>
            </div>
          </div>

          {/* Mobile header */}
          <div className="sm:hidden mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/')}
                  className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold tracking-wider hover:opacity-75 flex items-center`}
                >
                  <span>HN</span>
                  <span className="text-2xl leading-[0] relative top-[1px] mx-[1px]">•</span>
                  <span>LIVE</span>
                </button>
                <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
                  /
                </span>
                <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
                  GRAVEYARD
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-full">
              Digging up dead items...
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-full opacity-50">
              No dead items found... yet.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="py-1">
                  <div className="hidden sm:flex items-start gap-4">
                    <div className="opacity-50" title={item.formatted?.timestamp.fullDate}>
                      {item.formatted?.timestamp.time}
                    </div>
                    <a 
                      href={item.formatted?.links.main}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 hover:opacity-75 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(item.formatted?.links.main, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <div
                        dangerouslySetInnerHTML={{ __html: item.formatted?.text || '' }}
                      />
                    </a>
                  </div>
                  <div className="sm:hidden space-y-1">
                    <div className="opacity-50 text-sm" title={item.formatted?.timestamp.fullDate}>
                      {item.formatted?.timestamp.time}
                    </div>
                    <a 
                      href={item.formatted?.links.main}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:opacity-75 cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(item.formatted?.links.main, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <div
                        dangerouslySetInnerHTML={{ __html: item.formatted?.text || '' }}
                      />
                    </a>
                  </div>
                  <div className="border-b border-current opacity-5 mt-2"></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MobileBottomBar 
        theme={theme}
        onShowSearch={onShowSearch}
        onShowSettings={onShowSettings}
      />
    </>
  );
} 