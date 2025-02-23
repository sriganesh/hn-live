import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopUsers } from '../hooks/useTopUsers';
import { MobileBottomBar } from './MobileBottomBar';

interface ActivePageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';
  colorizeUsernames: boolean;
  classicLayout: boolean;
  onShowSearch: () => void;
  onShowGrep: () => void;
  onShowSettings: () => void;
  isSettingsOpen: boolean;
  isSearchOpen: boolean;
  onViewUser: (userId: string) => void;
  isRunning: boolean;
}

interface HNStory {
  id: number;
  title: string;
  url?: string;
  by: string;
  time: number;
  score: number;
  descendants: number;
}

interface ActiveStoryItem {
  id: string;
  position: number;
}

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'just now';
  }
};

const truncateUrl = (url: string, maxLength: number): string => {
  if (url.length <= maxLength) return url;
  
  const parts = url.split('.');
  if (parts.length <= 2) return url.slice(0, maxLength) + '...';
  
  if (parts[0].length > 15) {
    parts[0] = parts[0].slice(0, 15) + '...';
  }
  
  return parts.join('.');
};

export function ActivePage({ 
  theme, 
  fontSize,
  font,
  colorizeUsernames,
  classicLayout,
  onShowSearch,
  onShowGrep,
  onShowSettings,
  isSettingsOpen,
  isSearchOpen,
  onViewUser,
  isRunning
}: ActivePageProps) {
  const navigate = useNavigate();
  const [stories, setStories] = useState<HNStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showGrep, setShowGrep] = useState(false);
  const [grepFilter, setGrepFilter] = useState('');
  const { /* isTopUser, getTopUserClass */ } = useTopUsers();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const processedIds = useRef<Set<number>>(new Set());

  const themeColors = theme === 'green'
    ? 'text-green-400'
    : theme === 'og'
    ? 'text-[#828282]'
    : 'text-[#828282]';

  // Filter stories based on grep input
  const filteredStories = stories.filter(story => {
    if (!grepFilter) return true;
    const searchText = `${story.title} ${story.by}`.toLowerCase();
    return searchText.includes(grepFilter.toLowerCase());
  });

  // Fetch story details from Firebase
  const fetchStoryDetails = async (id: string) => {
    try {
      const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching story details:', error);
      return null;
    }
  };

  // Load stories based on page
  const loadStories = async (page: number, append: boolean = false) => {
    if (page === 1) {
      setLoading(true);
      processedIds.current.clear();
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetch(`https://active-api.hn.live/?page=${page}`);
      
      if (response.status === 404) {
        setHasMore(false);
        setLoadingMore(false);
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ActiveStoryItem[] = await response.json();
      const storyPromises = data
        .filter(item => !processedIds.current.has(Number(item.id)))
        .map(item => fetchStoryDetails(item.id));
      
      const newStories = await Promise.all(storyPromises);
      const validStories = newStories.filter((story): story is HNStory => {
        if (story === null) return false;
        processedIds.current.add(story.id);
        return true;
      });
      
      setStories(prev => append ? [...prev, ...validStories] : validStories);
      setHasMore(validStories.length > 0);
    } catch (error) {
      console.error('Error loading stories:', error);
      setHasMore(false);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  // Initial load
  useEffect(() => {
    loadStories(1);
  }, []);

  // Handle Ctrl+F and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowGrep(true);
      }
      if (e.key === 'Escape') {
        if (!isSettingsOpen && !isSearchOpen) {
          if (showGrep) {
            setGrepFilter('');
            setShowGrep(false);
            return;
          }
          navigate(-1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showGrep, isSettingsOpen, isSearchOpen]);

  // Add intersection observer handler
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && !loading && !loadingMore && hasMore) {
      setCurrentPage(prev => prev + 1);
      loadStories(currentPage + 1, true);
    }
  }, [loading, loadingMore, hasMore, currentPage]);

  // Set up the intersection observer
  useEffect(() => {
    if (stories.length > 0 && hasMore) {
      const options = {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      };

      observerRef.current = new IntersectionObserver(handleObserver, options);
      
      if (loadingRef.current) {
        observerRef.current.observe(loadingRef.current);
      }

      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }
  }, [handleObserver, stories.length, hasMore]);

  return (
    <div className={`
      fixed inset-0 z-50 overflow-hidden
      ${font === 'mono' ? 'font-mono' : 
        font === 'jetbrains' ? 'font-jetbrains' :
        font === 'fira' ? 'font-fira' :
        font === 'source' ? 'font-source' :
        font === 'sans' ? 'font-sans' :
        font === 'serif' ? 'font-serif' :
        'font-system'}
      ${theme === 'green'
        ? 'bg-black text-green-400'
        : theme === 'og'
        ? 'bg-[#f6f6ef] text-[#828282]'
        : 'bg-[#1a1a1a] text-[#828282]'}
      text-${fontSize}
    `}>
      <div className="h-full overflow-y-auto p-4">
        {/* Desktop view */}
        <div className="hidden sm:flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button 
              onClick={() => navigate('/')}
              className={`${
                theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
              } font-bold tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity`}
            >
              <span>HN</span>
              <span className="animate-pulse">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  isRunning 
                    ? theme === 'green'
                      ? 'bg-green-500'
                      : 'bg-[#ff6600]'
                    : 'bg-gray-500'
                }`}></span>
              </span>
              <span>LIVE</span>
            </button>
            <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
              /
            </span>
            <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
              TRENDING
            </span>
          </div>

          {/* Desktop controls */}
          <div className="hidden sm:flex items-center gap-4">
            <button 
              onClick={() => navigate('/front')}
              className={themeColors}
            >
              [FRONT PAGE]
            </button>
            <button 
              onClick={() => navigate('/trending')}
              className={`${themeColors} opacity-30 hover:opacity-50`}
            >
              [TRENDING]
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
              onClick={() => navigate('/best')}
              className={themeColors}
            >
              [BEST]
            </button>
            <button 
              onClick={() => navigate('/jobs')}
              className={themeColors}
            >
              [JOBS]
            </button>
            <button 
              onClick={onShowSearch}
              className={themeColors}
              title="Ctrl/Cmd + K"
            >
              [SEARCH]
            </button>
            {showGrep ? (
              <div className="flex items-center gap-2">
                <span>grep:</span>
                <input
                  type="text"
                  value={grepFilter}
                  onChange={(e) => setGrepFilter(e.target.value)}
                  className={`bg-transparent border-b border-current outline-none w-32 px-1 ${themeColors}`}
                  placeholder="filter..."
                  autoFocus
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
            <button 
              onClick={() => navigate('/dashboard')}
              className={themeColors}
            >
              [DASHBOARD]
            </button>
            <button
              onClick={onShowSettings}
              className={themeColors}
            >
              [SETTINGS]
            </button>
            <button 
              onClick={() => navigate(-1)}
              className="opacity-75 hover:opacity-100"
            >
              [ESC]
            </button>
          </div>
        </div>

        {/* Mobile view */}
        <div className="sm:hidden mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button 
                onClick={() => navigate('/')}
                className={`${
                  theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
                } font-bold tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity`}
              >
                <span>HN</span>
                <span className="animate-pulse">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    isRunning 
                      ? theme === 'green'
                        ? 'bg-green-500'
                        : 'bg-[#ff6600]'
                      : 'bg-gray-500'
                  }`}></span>
                </span>
                <span>LIVE</span>
              </button>
              <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
                / TRENDING
              </span>
            </div>
          </div>
        </div>

        {/* Main content */}
        {loading ? (
          <div className="flex items-center justify-center h-full">
            Loading stories...
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {filteredStories.map((story, index) => (
              <div key={story.id} className="group relative">
                {classicLayout ? (
                  <div className="flex items-baseline gap-2">
                    <span className="opacity-50">{index + 1}.</span>
                    <div className="space-y-1">
                      <div>
                        <a
                          href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                          onClick={(e) => {
                            if (!story.url) {
                              e.preventDefault();
                              navigate(`/item/${story.id}`);
                            }
                          }}
                          className={`
                            group-hover:opacity-75
                            ${story.url && theme === 'green' && 'visited:text-green-600/30'}
                            ${story.url && theme === 'og' && 'visited:text-[#999999]'}
                            ${story.url && theme === 'dog' && 'visited:text-[#666666]'}
                          `}
                          target={story.url ? "_blank" : undefined}
                          rel={story.url ? "noopener noreferrer" : undefined}
                        >
                          {story.title}
                        </a>
                        {story.url && (
                          <span className="ml-2 opacity-50 text-sm">
                            ({truncateUrl(new URL(story.url).hostname, 30)})
                          </span>
                        )}
                      </div>
                      <div className="text-sm opacity-75">
                        {story.score} points by{' '}
                        <button 
                          onClick={() => onViewUser(story.by)}
                          className={`hover:underline ${
                            theme === 'green'
                              ? 'text-green-400'
                              : colorizeUsernames 
                                ? 'hn-username'
                                : 'opacity-75'
                          }`}
                        >
                          {story.by}
                        </button>{' '}
                        <span className="opacity-75">•</span>{' '}
                        <span className="shrink-0">
                          {formatTimeAgo(story.time)}
                        </span>{' '}
                        <span className="opacity-75">•</span>{' '}
                        <button
                          onClick={() => navigate(`/item/${story.id}`)}
                          className="hover:underline"
                        >
                          {story.descendants || 0} comments
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-3">
                    <span className={`${theme === 'green' ? 'text-green-500/50' : 'text-[#ff6600]/50'} text-sm font-mono`}>
                      {(index + 1).toString().padStart(2, '0')}
                    </span>
                    <div className="space-y-1 flex-1">
                      {story.url && (
                        <div className="flex items-center text-sm opacity-50">
                          <span className="truncate">
                            {truncateUrl(new URL(story.url).hostname.replace('www.', ''), 40)}
                          </span>
                          <span className="mx-2">•</span>
                          <span className="shrink-0">
                            {formatTimeAgo(story.time)}
                          </span>
                        </div>
                      )}
                      {!story.url && (
                        <div className="text-sm opacity-50">
                          <span className="shrink-0">
                            {formatTimeAgo(story.time)}
                          </span>
                        </div>
                      )}
                      <div className="pr-4">
                        <a
                          href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                          onClick={(e) => {
                            if (!story.url) {
                              e.preventDefault();
                              navigate(`/item/${story.id}`);
                            }
                          }}
                          className={`
                            group-hover:opacity-75
                            ${story.url && theme === 'green' && 'visited:text-green-600/30'}
                            ${story.url && theme === 'og' && 'visited:text-[#999999]'}
                            ${story.url && theme === 'dog' && 'visited:text-[#666666]'}
                          `}
                          target={story.url ? "_blank" : undefined}
                          rel={story.url ? "noopener noreferrer" : undefined}
                        >
                          {story.title}
                        </a>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <button 
                          onClick={() => onViewUser(story.by)}
                          className={`hover:underline ${
                            theme === 'green'
                              ? 'text-green-400'
                              : colorizeUsernames 
                                ? 'hn-username'
                                : 'opacity-75'
                          }`}
                        >
                          {story.by}
                        </button>
                        <span className="opacity-75">•</span>
                        <span className="font-mono opacity-75">
                          {story.score} points
                        </span>
                        <span className="opacity-75">•</span>
                        <button
                          onClick={() => navigate(`/item/${story.id}`)}
                          className="opacity-75 hover:opacity-100 hover:underline"
                        >
                          {story.descendants 
                            ? `${story.descendants} comment${story.descendants === 1 ? '' : 's'}`
                            : 'discuss'
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className={`border-b ${
                  theme === 'green' 
                    ? 'border-green-500/10' 
                    : theme === 'og'
                    ? 'border-[#ff6600]/5'
                    : 'border-[#828282]/10'
                } mt-4`} />
              </div>
            ))}

            {!grepFilter && (
              <div ref={loadingRef} className="text-center py-8">
                {loadingMore ? (
                  <div className={`${
                    theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                  } opacity-75`}>
                    Loading more stories...
                  </div>
                ) : hasMore ? (
                  <div className="h-20"></div>
                ) : (
                  <div className="space-y-2">
                    <div className={`${
                      theme === 'green' ? 'text-green-500/50' : 'text-[#ff6600]/50'
                    } text-sm`}>
                      That's all for now!
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <MobileBottomBar 
        theme={theme}
        onShowSearch={onShowSearch}
        onShowSettings={onShowSettings}
        onCloseSearch={() => {}}
        isRunning={isRunning}
        username={null}
        unreadCount={0}
      />
    </div>
  );
} 