import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopUsers } from '../hooks/useTopUsers';

interface FrontPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: 'xs' | 'sm' | 'base';
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

  const loadMore = () => {
    const nextPage = state.page + 1;
    setState(prev => ({ ...prev, page: nextPage }));
    fetchStories(nextPage);
  };

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

  return (
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

            {!grepFilter && state.hasMore && (
              <div className="text-center py-8">
                <button
                  onClick={loadMore}
                  disabled={state.loadingMore}
                  className={`${
                    theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                  } opacity-75 hover:opacity-100 transition-opacity disabled:opacity-50`}
                >
                  {state.loadingMore ? 'Loading more stories...' : 'Load more stories'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 