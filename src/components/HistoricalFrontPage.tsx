import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileBottomBar } from './MobileBottomBar';

interface HistoricalFrontPageProps {
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

interface FrontPageHistoryItem {
  id: string;
  position: number;
}

type FontOption = 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';

const HistoricalFrontPage = ({
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
}: HistoricalFrontPageProps) => {
  const navigate = useNavigate();
  const [stories, setStories] = useState<HNStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const [allStoryIds, setAllStoryIds] = useState<string[]>([]);

  // Constants for date range - use UTC dates
  const START_DATE = new Date(Date.UTC(2007, 1, 19)); // February 19, 2007 UTC

  // Initialize with today's date
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Try to get date from URL first
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    if (dateParam) {
      const date = new Date(dateParam);
      if (!isNaN(date.getTime())) {
        return new Date(Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate()
        ));
      }
    }
    // Fall back to today's date
    const now = new Date();
    return new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    ));
  });

  // Format date for API call - convert local date to YYYY-MM-DD format
  const formatDateForApi = (date: Date) => {
    // Use UTC methods to ensure consistent date formatting
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display (with weekday) - for header
  const formatDisplayDate = (date: Date) => {
    return new Date(date.getTime()).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC' // Force UTC timezone for display
    });
  };

  // Format date for slider (without weekday)
  const formatSliderDate = (date: Date) => {
    return new Date(date.getTime()).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

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

  // Load stories based on date
  const loadStoriesForDate = async (date: Date, page: number = 1, append: boolean = false) => {
    if (page === 1) {
      setLoading(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const selectedDate = new Date(Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate()
      ));
      
      // If date is today, use Firebase topstories API with pagination
      if (selectedDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]) {
        const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        const allIds = await response.json();
        setAllStoryIds(allIds.map(String));

        // Load first 30 stories immediately for page 1
        const start = (page - 1) * 30;
        const end = start + 30;
        const pageStoryIds = allIds.slice(start, end).map(String);
        
        const storyPromises = pageStoryIds.map(id => fetchStoryDetails(id));
        const newStories = await Promise.all(storyPromises);
        const validStories = newStories.filter((story): story is HNStory => story !== null);
        
        setStories(prev => append ? [...prev, ...validStories] : validStories);
        setHasMore(end < allIds.length);
      } else if (selectedDate.getTime() >= START_DATE.getTime()) {
        const formattedDate = formatDateForApi(selectedDate);
        const response = await fetch(`https://fp-api.hn.live/?date=${formattedDate}&page=${page}`);
        
        // If we get a 404, it just means no more pages - handle silently
        if (response.status === 404) {
          setHasMore(false);
          setLoadingMore(false);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: FrontPageHistoryItem[] = await response.json();
        const storyIds = data.map(item => item.id);
        const storyPromises = storyIds.map(id => fetchStoryDetails(id));
        const newStories = await Promise.all(storyPromises);
        const validStories = newStories.filter((story): story is HNStory => story !== null);
        
        setStories(prev => append ? [...prev, ...validStories] : validStories);
        setHasMore(validStories.length > 0);
      } else {
        setStories([]);
        setHasMore(false);
      }
    } catch (error) {
      // Only log non-404 errors for the first page
      if (page === 1) {
        console.error('Error loading stories:', error);
        setStories([]);
      }
      setHasMore(false);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  // Slider helper functions
  const getTotalDays = () => {
    const timeDiff = new Date().getTime() - START_DATE.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  };

  const sliderValueToDate = (value: number) => {
    const newDate = new Date(START_DATE.getTime());
    newDate.setUTCDate(START_DATE.getUTCDate() + value);
    
    // Check specifically for Feb 18, 2007 using UTC methods
    if (newDate.getUTCFullYear() === 2007 && 
        newDate.getUTCMonth() === 1 && 
        newDate.getUTCDate() === 18) {
      return new Date(START_DATE.getTime());
    }
    
    // Also check for any date before START_DATE using timestamps
    if (newDate.getTime() < START_DATE.getTime()) {
      return new Date(START_DATE.getTime());
    }
    
    return newDate;
  };

  const dateToSliderValue = (date: Date) => {
    // Check specifically for Feb 18, 2007 using UTC methods
    if (date.getUTCFullYear() === 2007 && 
        date.getUTCMonth() === 1 && 
        date.getUTCDate() === 18) {
      return 0;
    }
    
    const timeDiff = date.getTime() - START_DATE.getTime();
    return Math.max(0, Math.floor(timeDiff / (1000 * 60 * 60 * 24)));
  };

  // Load stories when date changes and not dragging
  useEffect(() => {
    if (!isDragging) {
      loadStoriesForDate(selectedDate);
    }
  }, [selectedDate, isDragging]);

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
  };

  // Add these helper functions from FrontPage.tsx
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
    return url.length > maxLength ? url.slice(0, maxLength) + '...' : url;
  };

  // Update the escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate(-1); // Go back one level instead of going to '/'
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [navigate]);

  // Add intersection observer handler
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && !loading && !loadingMore && hasMore && !isDragging) {
      setCurrentPage(prev => prev + 1);
      loadStoriesForDate(selectedDate, currentPage + 1, true);
    }
  }, [loading, loadingMore, hasMore, isDragging, selectedDate, currentPage]);

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

  // Reset pagination when date changes
  useEffect(() => {
    if (!isDragging) {
      setCurrentPage(1);
      loadStoriesForDate(selectedDate, 1);
    }
  }, [selectedDate, isDragging]);

  // Update URL when date changes
  useEffect(() => {
    const formattedDate = formatDateForApi(selectedDate);
    const newUrl = `/frontpage-history?date=${formattedDate}`;
    window.history.replaceState({}, '', newUrl);
  }, [selectedDate]);

  return (
    <div className={`
      fixed inset-0 z-50
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
      {/* Header */}
      <div className="p-4">
        <div className="space-y-2">
          {/* First line - update to include ESC button */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
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
            <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold`}>
              /
            </span>
            <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold`}>
              FRONT PAGE HISTORY
            </span>
            <div className="flex-1" />
            <button
              onClick={() => navigate(-1)}
              className="opacity-50 hover:opacity-100"
            >
              [ESC]
            </button>
          </div>

          {/* Second line */}
          <div className={`${theme === 'green' ? 'text-green-400' : 'text-[#828282]'} opacity-75`}>
            {formatDisplayDate(tempDate || selectedDate)}
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="overflow-y-auto h-full pb-[240px] sm:pb-52">
        <div className="px-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              Loading stories...
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-6">
              {stories.map((story, index) => (
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
                              ({new URL(story.url).hostname})
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
              {!loading && hasMore && (
                <div ref={loadingRef} className="text-center py-8">
                  {loadingMore ? (
                    <div className="opacity-75">Loading more stories...</div>
                  ) : (
                    // Spacer for intersection observer
                    <div className="h-20"></div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Slider - use dynamic viewport calculation */}
      <div className={`
        fixed sm:bottom-0 left-0 right-0 z-20
        ${theme === 'green'
          ? 'bg-black'
          : theme === 'og'
          ? 'bg-[#f6f6ef]'
          : 'bg-[#1a1a1a]'}
        border-t ${
          theme === 'green'
            ? 'border-green-500/20'
            : theme === 'og'
            ? 'border-[#ff6600]/20'
            : 'border-[#828282]/20'
        }
        px-4 py-6
        bottom-[calc(env(safe-area-inset-bottom,_0px)_+_3.5rem)]
      `}>
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Date display */}
          <div className="flex justify-between items-center text-sm">
            <span>Feb 19, 2007</span>
            <span className={`${isDragging ? 'opacity-100' : 'opacity-50'} transition-opacity`}>
              {formatSliderDate(tempDate || selectedDate)}
            </span>
            <span>Today</span>
          </div>
          
          {/* Slider */}
          <input
            type="range"
            min="0"
            max={getTotalDays()}
            step="1"
            value={dateToSliderValue(tempDate || selectedDate)}
            onChange={(e) => {
              const value = Math.max(0, parseInt(e.target.value));
              const newDate = sliderValueToDate(value);
              setTempDate(newDate); // Only update temp date while dragging
            }}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => {
              if (tempDate) {
                setSelectedDate(tempDate); // This will trigger URL update and data fetch
                setTempDate(null);
              }
              setIsDragging(false);
            }}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => {
              if (tempDate) {
                setSelectedDate(tempDate); // This will trigger URL update and data fetch
                setTempDate(null);
              }
              setIsDragging(false);
            }}
            className={`
              w-full h-2 rounded-lg appearance-none cursor-pointer
              ${theme === 'green'
                ? 'bg-green-500/20 range-slider-green'
                : 'bg-[#ff6600]/20 range-slider-orange'
              }
              range-slider
            `}
          />
        </div>
      </div>

      <MobileBottomBar 
        theme={theme}
        onShowSearch={onShowSearch}
        onShowSettings={onShowSettings}
        onCloseSearch={() => {}}
        isRunning={isRunning}
        username={null}
        unreadCount={0}
        className="z-30"
      />
    </div>
  );
};

export default HistoricalFrontPage; 