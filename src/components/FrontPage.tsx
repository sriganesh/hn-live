import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopUsers } from '../hooks/useTopUsers';

interface FrontPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  colorizeUsernames: boolean;
  classicLayout: boolean;
  onShowSearch: () => void;
  onShowGrep: () => void;
  onShowSettings: () => void;
  isSettingsOpen: boolean;
  isSearchOpen: boolean;
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
  colorizeUsernames,
  classicLayout,
  onShowSearch,
  onShowGrep,
  onShowSettings,
  isSettingsOpen,
  isSearchOpen
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
      if (e.key === 'Escape' && showGrep) {
        setGrepFilter('');
        setShowGrep(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGrep]);

  const loadMore = useCallback(() => {
    const nextPage = state.page + 1;
    setState(prev => ({ ...prev, page: nextPage }));
    fetchStories(nextPage);
  }, [state.page]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Only handle ESC if neither modal is open
        if (!isSettingsOpen && !isSearchOpen) {
          // First check if grep is open
          if (showGrep) {
            setGrepFilter('');
            setShowGrep(false);
            return;
          }
          // If no modals are open, then navigate back
          navigate('/');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showGrep, isSettingsOpen, isSearchOpen]); // Add isSearchOpen to dependencies

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

  // Add state at the top of the component
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreMenu && !(event.target as Element).closest('.more-menu-container')) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMoreMenu]);

  return (
    <>
      <div className={`fixed inset-0 z-50 ${themeColors} overflow-hidden text-${fontSize}`}>
        <div className="h-full overflow-y-auto p-4">
          {/* Header */}
          <div className="mb-8">
            {/* Desktop view - single row */}
            <div className="hidden sm:flex items-center justify-between">
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
                    FRONT PAGE
                  </span>
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
                <button 
                  onClick={() => navigate('/best')}
                  className={themeColors}
                >
                  [BEST]
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
            <div className="sm:hidden">
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
                    FRONT PAGE
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <button
                    onClick={onShowSettings}
                    className={`${themeColors} hover:opacity-75`}
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
                            className="group-hover:opacity-75"
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
                            href={`https://news.ycombinator.com/user?id=${story.by}`}
                            className={`hover:underline ${
                              colorizeUsernames 
                                ? `hn-username ${isTopUser(story.by) ? getTopUserClass(theme) : ''}`
                                : 'opacity-75'
                            }`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {story.by}
                          </a>{' '}
                          <span title={new Date(story.time * 1000).toLocaleString()}>
                            {formatTimeAgo(story.time)}
                          </span> • {' '}
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
                      <div className="space-y-2 flex-1">
                        {/* Top line - hostname and timestamp */}
                        {story.url && (
                          <div className="flex items-center text-sm opacity-50">
                            <span className="truncate">
                              {truncateUrl(new URL(story.url).hostname.replace('www.', ''), 40)}
                            </span>
                            <span className="mx-2">•</span>
                            <span className="shrink-0" title={new Date(story.time * 1000).toLocaleString()}>
                              {formatTimeAgo(story.time)}
                            </span>
                          </div>
                        )}
                        {!story.url && (
                          <div className="text-sm opacity-50">
                            <span title={new Date(story.time * 1000).toLocaleString()}>
                              {formatTimeAgo(story.time)}
                            </span>
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
                            className="group-hover:opacity-75 font-medium"
                            target={story.url ? "_blank" : undefined}
                            rel={story.url ? "noopener noreferrer" : undefined}
                          >
                            <div className={`${
                              theme === 'green'
                                ? 'text-green-400'
                                : theme === 'og'
                                ? 'text-[#666666]'
                                : 'text-[#a0a0a0]'
                            }`}>
                              {story.title}
                            </div>
                          </a>
                        </div>

                        {/* Bottom metadata line - without timestamp */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                          <a 
                            href={`https://news.ycombinator.com/user?id=${story.by}`}
                            className={`hover:underline ${
                              colorizeUsernames 
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

      {/* Mobile Bottom Bar */}
      <div className="fixed sm:hidden bottom-0 left-0 right-0 mobile-bottom-bar border-t z-50">
        <div className={`
          ${theme === 'green'
            ? 'bg-black/90 border-green-500/30 text-green-400'
            : theme === 'og'
            ? 'bg-[#f6f6ef]/90 border-[#ff6600]/30 text-[#828282]'
            : 'bg-[#1a1a1a]/90 border-[#828282]/30 text-[#828282]'
          } grid grid-cols-5 divide-x ${
            theme === 'green'
              ? 'divide-green-500/30'
              : theme === 'og'
              ? 'divide-[#ff6600]/30'
              : 'divide-[#828282]/30'
          }`}
        >
          {/* Home Button */}
          <button
            onClick={() => navigate('/')}
            className="p-4 flex items-center justify-center relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </button>

          {/* Stories/Front Page Button */}
          <button
            onClick={() => navigate('/front')}
            className="p-4 flex items-center justify-center relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
              <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
            </svg>
          </button>

          {/* More Menu Button */}
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-4 flex items-center justify-center relative more-menu-container"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>

            {showMoreMenu && (
              <div className={`
                absolute bottom-full left-0 mb-2 w-48 py-2
                border rounded-lg shadow-lg z-50
                ${theme === 'green'
                  ? 'bg-black border-green-500/30 text-green-400'
                  : theme === 'og'
                  ? 'bg-white border-[#ff6600]/30 text-[#828282]'
                  : 'bg-black border-[#828282]/30 text-[#828282]'
                }
              `}>
                <button
                  onClick={(e) => { 
                    e.stopPropagation();
                    navigate('/show'); 
                    setShowMoreMenu(false); 
                  }}
                  className={`w-full px-4 py-2 text-left font-normal
                    ${theme === 'green'
                      ? 'hover:bg-green-900 hover:text-green-400'
                      : theme === 'og'
                      ? 'hover:bg-gray-100 hover:text-[#828282]'
                      : 'hover:bg-gray-900 hover:text-[#828282]'
                    }
                  `}
                >
                  Show HN
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation();
                    navigate('/ask'); 
                    setShowMoreMenu(false); 
                  }}
                  className={`w-full px-4 py-2 text-left font-normal
                    ${theme === 'green'
                      ? 'hover:bg-green-900 hover:text-green-400'
                      : theme === 'og'
                      ? 'hover:bg-gray-100 hover:text-[#828282]'
                      : 'hover:bg-gray-900 hover:text-[#828282]'
                    }
                  `}
                >
                  Ask HN
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation();
                    navigate('/jobs'); 
                    setShowMoreMenu(false); 
                  }}
                  className={`w-full px-4 py-2 text-left font-normal
                    ${theme === 'green'
                      ? 'hover:bg-green-900 hover:text-green-400'
                      : theme === 'og'
                      ? 'hover:bg-gray-100 hover:text-[#828282]'
                      : 'hover:bg-gray-900 hover:text-[#828282]'
                    }
                  `}
                >
                  Jobs
                </button>
                <button
                  onClick={(e) => { 
                    e.stopPropagation();
                    navigate('/best'); 
                    setShowMoreMenu(false); 
                  }}
                  className={`w-full px-4 py-2 text-left font-normal
                    ${theme === 'green'
                      ? 'hover:bg-green-900 hover:text-green-400'
                      : theme === 'og'
                      ? 'hover:bg-gray-100 hover:text-[#828282]'
                      : 'hover:bg-gray-900 hover:text-[#828282]'
                    }
                  `}
                >
                  Best
                </button>
              </div>
            )}
          </button>

          {/* Search Button */}
          <button
            onClick={onShowSearch}
            className="p-4 flex items-center justify-center relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Settings Button */}
          <button
            onClick={onShowSettings}
            className="p-4 flex items-center justify-center relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
} 