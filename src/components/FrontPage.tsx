import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopUsers } from '../hooks/useTopUsers';
import { MobileBottomBar } from './MobileBottomBar';
import type { FontOption } from '../types';

interface FrontPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: FontOption;
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

interface FrontPageState {
  stories: HNStory[];
  loading: boolean;
  loadingMore: boolean;
  page: number;
  hasMore: boolean;
}

const STORIES_PER_PAGE = 30;

const truncateUrl = (url: string, maxLength: number): string => {
  return url.length > maxLength ? url.slice(0, maxLength) + '...' : url;
};

export function FrontPage({ 
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
}: FrontPageProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<FrontPageState>({
    stories: [],
    loading: true,
    loadingMore: false,
    page: 0,
    hasMore: true
  });

  // Add grep state
  const [showGrep, setShowGrep] = useState(false);
  const [grepFilter, setGrepFilter] = useState('');

  // Filter stories based on grep input
  const filteredStories = state.stories.filter(story => {
    if (!grepFilter) return true;
    const searchText = `${story.title} ${story.by}`.toLowerCase();
    return searchText.includes(grepFilter.toLowerCase());
  });

  // Handle grep button click
  const handleGrepClick = () => {
    setShowGrep(true);
    onShowGrep(); // Still call the parent handler if needed
  };

  const { isTopUser, getTopUserClass } = useTopUsers();

  const fetchStories = async (pageNumber: number) => {
    try {
      // Fetch all story IDs if this is the first page
      if (pageNumber === 0) {
        const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        const allStoryIds = await response.json();
        
        // Calculate start and end indices for this page
        const start = pageNumber * STORIES_PER_PAGE;
        const end = start + STORIES_PER_PAGE;
        const pageStoryIds = allStoryIds.slice(start, end);
        
        // Fetch each story's details
        const storyPromises = pageStoryIds.map(async (id: number) => {
          const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          return storyResponse.json();
        });
        
        const newStories = await Promise.all(storyPromises);
        
        setState(prev => ({
          ...prev,
          stories: newStories,
          loading: false,
          hasMore: end < allStoryIds.length
        }));
      } else {
        setState(prev => ({ ...prev, loadingMore: true }));
        
        const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        const allStoryIds = await response.json();
        
        const start = pageNumber * STORIES_PER_PAGE;
        const end = start + STORIES_PER_PAGE;
        const pageStoryIds = allStoryIds.slice(start, end);
        
        const storyPromises = pageStoryIds.map(async (id: number) => {
          const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          return storyResponse.json();
        });
        
        const newStories = await Promise.all(storyPromises);
        
        setState(prev => ({
          ...prev,
          stories: [...prev.stories, ...newStories],
          loadingMore: false,
          hasMore: end < allStoryIds.length
        }));
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        loadingMore: false 
      }));
    }
  };

  useEffect(() => {
    fetchStories(0);
  }, []);

  // Add Ctrl+F handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Ctrl+F or Cmd+F
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault(); // Prevent default browser search
        setShowGrep(true);
      }
      // Handle Escape for grep input
      if (e.key === 'Escape') {
        if (!isSettingsOpen && !isSearchOpen) {
          // First check if grep is open
          if (showGrep) {
            setGrepFilter('');
            setShowGrep(false);
            return;
          }
          // If no modals are open, then navigate back
          navigate(-1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showGrep, isSettingsOpen, isSearchOpen]);

  const loadMore = useCallback(() => {
    const nextPage = state.page + 1;
    setState(prev => ({ ...prev, page: nextPage }));
    fetchStories(nextPage);
  }, [state.page]);

  const handleClose = () => {
    navigate('/');
  };

  const themeColors = theme === 'green'
    ? 'text-green-400 bg-black'
    : theme === 'og'
    ? 'text-[#828282] bg-[#f6f6ef]'
    : 'text-[#828282] bg-[#1a1a1a]';

  // Add a ref for the intersection observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Create a callback for intersection observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && !state.loadingMore && state.hasMore) {
      loadMore();
    }
  }, [state.loadingMore, state.hasMore, loadMore]);

  // Move the observer setup after the stories are loaded
  useEffect(() => {
    // Only set up observer if we have stories and there's more to load
    if (state.stories.length > 0 && state.hasMore && !state.loading) {
      const options = {
        root: null,
        rootMargin: '1000px',
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
  }, [handleObserver, state.stories.length, state.hasMore, state.loading]);

  // Add these near the top with other state declarations
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);

  // Add ref for the scrollable container
  const containerRef = useRef<HTMLDivElement>(null);

  // Update scroll handler to use container's scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsBackToTopVisible(container.scrollTop > 500);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Update scroll to top function to use container
  const scrollToTop = () => {
    containerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <>
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
        <div 
          ref={containerRef}
          className="h-full overflow-y-auto p-4"
        >
          {/* Header */}
          <div className="mb-8">
            {/* Desktop view */}
            <div className="hidden sm:flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="flex items-center">
                  <button 
                    onClick={handleClose}
                    className={`${
                      theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
                    } font-bold tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity`}
                  >
                    HN
                    <span className="animate-pulse">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        isRunning ? 'bg-current' : 'bg-gray-500'
                      } opacity-50`}></span>
                    </span>
                    LIVE
                  </button>
                  <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
                    /
                  </span>
                  <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
                    FRONT PAGE
                  </span>
                  <a
                    href="/frontpage-history"
                    className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} opacity-75 hover:opacity-100 ml-4`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/frontpage-history');
                    }}
                  >
                    [VIEW HISTORY]
                  </a>
                </div>
              </div>

              {/* Desktop controls in one row */}
              <div className="hidden sm:flex items-center gap-4">
                <button 
                  onClick={() => navigate('/front')}
                  className={`${themeColors} opacity-30 hover:opacity-50`}
                >
                  [FRONT PAGE]
                </button>
                <button 
                  onClick={() => navigate('/trending')}
                  className={themeColors}
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
                    onClick={handleGrepClick}
                    className={themeColors}
                    title="Ctrl/Cmd + F"
                  >
                    [GREP]
                  </button>
                )}
                <button
                  onClick={onShowSettings}
                  className={themeColors}
                >
                  [SETTINGS]
                </button>
                <button 
                  onClick={handleClose}
                  className="opacity-75 hover:opacity-100"
                >
                  [ESC]
                </button>
              </div>
            </div>

            {/* Mobile view - single row with title and controls */}
            <div className="sm:hidden mb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <button 
                    onClick={handleClose}
                    className={`${
                      theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
                    } font-bold tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity`}
                  >
                    HN
                    <span className="animate-pulse">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        isRunning ? 'bg-current' : 'bg-gray-500'
                      } opacity-50`}></span>
                    </span>
                    LIVE
                  </button>
                  <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
                    / FRONT PAGE
                  </span>
                  <a
                    href="/frontpage-history"
                    className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} opacity-75 hover:opacity-100 ml-4`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/frontpage-history');
                    }}
                  >
                    [VIEW HISTORY]
                  </a>
                </div>
              </div>
            </div>
          </div>

          {state.loading ? (
            <div className="flex items-center justify-center h-full">
              Loading front page...
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {filteredStories.map((story, index) => (
                <div 
                  key={story.id}
                  className="group relative"
                >
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
                              ({new URL(story.url).hostname})
                            </span>
                          )}
                        </div>
                        <div className="text-sm opacity-75">
                          {story.score} points by{' '}
                          <a 
                            onClick={(e) => {
                              e.preventDefault();
                              onViewUser(story.by);
                            }}
                            href={`/user/${story.by}`}
                            className={`hover:underline ${
                              theme === 'green'
                                ? 'text-green-400'
                                : colorizeUsernames 
                                  ? `hn-username ${isTopUser(story.by) ? getTopUserClass(theme) : ''}`
                                  : 'opacity-75'
                            }`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {story.by}
                          </a>{' '}
                          <span className="opacity-75">•</span>{' '}
                          <a
                            href={`https://news.ycombinator.com/item?id=${story.id}`}
                            className="shrink-0 hover:underline"
                            title={new Date(story.time * 1000).toLocaleString()}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {formatTimeAgo(story.time)}
                          </a> • {' '}
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
                      {/* Left column - story number */}
                      <span className={`${theme === 'green' ? 'text-green-500/50' : 'text-[#ff6600]/50'} text-sm font-mono`}>
                        {(index + 1).toString().padStart(2, '0')}
                      </span>

                      {/* Right column - content */}
                      <div className="space-y-1 flex-1">
                        {/* Top line - hostname and timestamp */}
                        {story.url && (
                          <div className="flex items-center text-sm opacity-50">
                            <span className="truncate">
                              {truncateUrl(new URL(story.url).hostname.replace('www.', ''), 40)}
                            </span>
                            <span className="mx-2">•</span>
                            <a
                              href={`https://news.ycombinator.com/item?id=${story.id}`}
                              className="shrink-0 hover:underline"
                              title={new Date(story.time * 1000).toLocaleString()}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {formatTimeAgo(story.time)}
                            </a>
                          </div>
                        )}
                        {!story.url && (
                          <div className="text-sm opacity-50">
                            <a
                              href={`https://news.ycombinator.com/item?id=${story.id}`}
                              className="shrink-0 hover:underline"
                              title={new Date(story.time * 1000).toLocaleString()}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {formatTimeAgo(story.time)}
                            </a>
                          </div>
                        )}

                        {/* Title line */}
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

                        {/* Bottom metadata line - without timestamp */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                          <a 
                            onClick={(e) => {
                              e.preventDefault();
                              onViewUser(story.by);
                            }}
                            href={`/user/${story.by}`}
                            className={`hover:underline ${
                              theme === 'green'
                                ? 'text-green-400'
                                : colorizeUsernames 
                                  ? `hn-username ${isTopUser(story.by) ? getTopUserClass(theme) : ''}`
                                  : 'opacity-75'
                            }`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {story.by}
                          </a>
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
                <div 
                  ref={loadingRef} 
                  className="text-center py-8"
                >
                  {state.loadingMore ? (
                    <div className={`${
                      theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                    } opacity-75`}>
                      Loading more stories...
                    </div>
                  ) : state.hasMore ? (
                    // Invisible div for intersection observer when there are more stories
                    <div className="h-20 opacity-50">
                      <span className="text-sm">Loading more...</span>
                    </div>
                  ) : (
                    // Show end message when no more stories
                    <div className="space-y-2">
                      <div className={`${
                        theme === 'green' ? 'text-green-500/50' : 'text-[#ff6600]/50'
                      } text-sm`}>
                        That's all for now! 
                      </div>
                      <div className="text-sm">
                        <button
                          onClick={() => navigate('/')}
                          className={`${
                            theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                          } hover:opacity-75`}
                        >
                          → Head back to the live feed to see real-time stories and discussions
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <MobileBottomBar 
        theme={theme}
        onShowSearch={onShowSearch}
        onShowSettings={onShowSettings}
      />

      {isBackToTopVisible && (
        <button
          onClick={scrollToTop}
          className={`fixed bottom-28 right-8 p-2 rounded-full shadow-lg z-[60] 
            ${theme === 'green' 
              ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400' 
              : theme === 'og'
              ? 'bg-[#ff6600]/10 hover:bg-[#ff6600]/20 text-[#ff6600]'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
            }
            transition-all duration-200 opacity-90 hover:opacity-100`}
          aria-label="Back to top"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </>
  );
} 