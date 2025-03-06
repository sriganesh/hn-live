import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileBottomBar } from '../../components/navigation/MobileBottomBar';
import { useSwipeable } from 'react-swipeable';
import '../../styles/historyPageAnimations.css'; // Import the animations from styles directory

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
  const [swipeAnimation, setSwipeAnimation] = useState<string>('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Constants for date range - use local dates instead of UTC
  const START_DATE = new Date(2007, 1, 19); // February 19, 2007 in local time
  
  // Get today's date in local time
  const TODAY = new Date();
  TODAY.setHours(0, 0, 0, 0); // Set to beginning of day in local time

  // Get yesterday's date in local time
  const YESTERDAY = new Date(TODAY);
  YESTERDAY.setDate(YESTERDAY.getDate() - 1);

  // Initialize with today's date
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Try to get date from URL first
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    if (dateParam) {
      // Parse the date parts manually to avoid timezone issues
      const [year, month, day] = dateParam.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        // Create date in local time zone (months are 0-indexed in JS Date)
        const date = new Date(year, month - 1, day);
        // Don't adjust hours - keep it as is
        return date;
      }
    }
    // Fall back to today's date
    return TODAY;
  });

  // Function to navigate to the previous day
  const goToPreviousDay = useCallback(() => {
    if (selectedDate.getTime() <= START_DATE.getTime() || isTransitioning) {
      // Already at the earliest date or currently transitioning, don't go further back
      return;
    }
    
    // Set transitioning state to prevent multiple swipes
    setIsTransitioning(true);
    
    // Create a new date object for the previous day
    const prevDate = new Date(selectedDate);
    prevDate.setDate(prevDate.getDate() - 1);
    
    // Set animation
    setSwipeAnimation('slide-right');
    
    // Update the date after animation is mostly complete
    setTimeout(() => {
      // Clear animation first
      setSwipeAnimation('');
      
      // Small delay before changing date to ensure overlay is still visible
      setTimeout(() => {
        setSelectedDate(prevDate);
        
        // Keep overlay visible until content is loaded
        setTimeout(() => {
          setIsTransitioning(false);
        }, 500);
      }, 50);
    }, 200);
  }, [selectedDate, isTransitioning]);

  // Function to navigate to the next day
  const goToNextDay = useCallback(() => {
    // Check if we're already at today's date or currently transitioning
    if (selectedDate.getTime() >= TODAY.getTime() || isTransitioning) {
      // Already at today or currently transitioning, don't go further
      return;
    }
    
    // Set transitioning state to prevent multiple swipes
    setIsTransitioning(true);
    
    // Create a new date object for the next day
    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    // If the next date would be after today, set it to today
    if (nextDate.getTime() > TODAY.getTime()) {
      nextDate.setTime(TODAY.getTime());
    }
    
    // Set animation
    setSwipeAnimation('slide-left');
    
    // Update the date after animation is mostly complete
    setTimeout(() => {
      // Clear animation first
      setSwipeAnimation('');
      
      // Small delay before changing date to ensure overlay is still visible
      setTimeout(() => {
        setSelectedDate(nextDate);
        
        // Keep overlay visible until content is loaded
        setTimeout(() => {
          setIsTransitioning(false);
        }, 500);
      }, 50);
    }, 200);
  }, [selectedDate, TODAY, isTransitioning]);

  // Set up swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      // Swipe left means go to next day (newer)
      goToNextDay();
    },
    onSwipedRight: () => {
      // Swipe right means go to previous day (older)
      goToPreviousDay();
    },
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: false,
    delta: 50, // minimum swipe distance
    swipeDuration: 500, // maximum time for swipe motion
    touchEventOptions: { passive: false } // important for preventing default touch behavior
  });

  // Format date for API call - convert local date to YYYY-MM-DD format
  const formatDateForApi = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Format date for display (with weekday) - for header
  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format date for slider (without weekday and with short month)
  const formatSliderDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format start date to show only year
  const formatStartDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric'
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
      // For date comparison, we need to ensure we're working with the date as provided
      // without any timezone adjustments
      const selectedDateStr = formatDateForApi(date);
      const todayStr = formatDateForApi(TODAY);
      
      // If date is today, use Firebase topstories API with pagination
      if (selectedDateStr === todayStr) {
        const response = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        const allIds = await response.json();
        setAllStoryIds(allIds.map(String));

        // Load first 30 stories immediately for page 1
        const start = (page - 1) * 30;
        const end = start + 30;
        const pageStoryIds = allIds.slice(start, end).map(String);
        
        const storyPromises = pageStoryIds.map((id: string) => fetchStoryDetails(id));
        const newStories = await Promise.all(storyPromises);
        const validStories = newStories.filter((story): story is HNStory => story !== null);
        
        setStories(prev => append ? [...prev, ...validStories] : validStories);
        setHasMore(end < allIds.length);
      } 
      // Use our custom API for all other dates
      else if (new Date(date).getTime() >= START_DATE.getTime()) {
        // Use the formatted date string directly without creating a new Date object
        const formattedDate = selectedDateStr;
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
    newDate.setDate(START_DATE.getDate() + value);
    
    // Check specifically for Feb 18, 2007 using UTC methods
    if (newDate.getFullYear() === 2007 && 
        newDate.getMonth() === 1 && 
        newDate.getDate() === 18) {
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
    if (date.getFullYear() === 2007 && 
        date.getMonth() === 1 && 
        date.getDate() === 18) {
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

  // Update the truncateUrl function to be more aggressive with long URLs
  const truncateUrl = (url: string, maxLength: number): string => {
    if (url.length <= maxLength) return url;
    
    // Split into parts (e.g., ["subdomain", "domain", "com"])
    const parts = url.split('.');
    if (parts.length <= 2) return url.slice(0, maxLength) + '...';
    
    // If we have a long subdomain, truncate it
    if (parts[0].length > 15) {
      parts[0] = parts[0].slice(0, 15) + '...';
    }
    
    return parts.join('.');
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
    // Use the exact date parts from the selectedDate to create the URL
    // This ensures we don't have timezone issues
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    
    const newUrl = `/frontpage-history?date=${formattedDate}`;
    window.history.replaceState({}, '', newUrl);
  }, [selectedDate]);

  return (
    <>
      {/* Transition overlay - completely blocks any content from showing through */}
      {isTransitioning && (
        <div 
          className={`fixed inset-0 z-[200] ${
            theme === 'green'
              ? 'bg-black'
              : theme === 'og'
              ? 'bg-[#f6f6ef]'
              : 'bg-[#1a1a1a]'
          } flex items-center justify-center`}
        >
          <div className={`${
            theme === 'green' ? 'text-green-400' : 'text-[#828282]'
          } text-center`}>
            <div className="animate-pulse">Loading...</div>
          </div>
        </div>
      )}
      
      <div 
        {...swipeHandlers}
        className={`
        fixed inset-0 z-50 overflow-x-hidden
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
        ${swipeAnimation}
      `}>
        {/* Header */}
        <div className={`py-2 px-4 sm:px-6 fixed top-0 left-0 right-0 z-10 ${
          theme === 'green'
            ? 'bg-black text-green-400'
            : theme === 'og'
            ? 'bg-[#ff6600]/90 text-white'
            : 'bg-[#1a1a1a] text-[#ff6600]'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="font-bold tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity"
              >
                HN
                <span className="animate-pulse">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    isRunning 
                      ? theme === 'green'
                        ? 'bg-green-500'
                        : 'bg-red-500'
                      : 'bg-gray-500'
                  }`}></span>
                </span>
                LIVE
              </button>
              <span className="font-bold">
                /
              </span>
              <span className="font-bold">
                FRONT PAGE HISTORY
              </span>
            </div>
            
            {/* Date display - below header on mobile, right-aligned on desktop */}
            <div className="sm:ml-auto flex items-center gap-4">
              <div className="opacity-75">
                {formatDisplayDate(tempDate || selectedDate)}
              </div>
              <button
                onClick={() => navigate(-1)}
                className="opacity-75 hover:opacity-100 ml-auto sm:ml-0"
              >
                [ESC]
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto h-full pb-[240px] sm:pb-52 pt-20 sm:pt-14">
          <div className="px-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                Loading stories...
              </div>
            ) : (
              <div className={`max-w-3xl mx-auto space-y-6 ${!hasMore ? 'pb-4' : ''}`}>
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
                              <span className="ml-2 opacity-50 text-sm break-all">
                                ({truncateUrl(new URL(story.url).hostname.replace('www.', ''), 30)})
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
                              <span className="truncate max-w-full inline-block break-all">
                                {truncateUrl(new URL(story.url).hostname.replace('www.', ''), 60)}
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
            <div className="relative flex justify-between items-center text-sm">
              <span className="opacity-50">
                {formatStartDate(new Date('2007-02-19'))}
              </span>
              <span className={`absolute left-1/2 -translate-x-1/2 ${
                isDragging ? 'opacity-100' : 'opacity-50'
              } transition-opacity`}>
                {formatSliderDate(tempDate || selectedDate)}
              </span>
              <span className="opacity-50">Today</span>
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
              // Add touch-action to improve touch handling
              style={{ touchAction: 'none' }}
              // Add aria attributes for accessibility
              aria-label="Date slider"
              aria-valuemin={0}
              aria-valuemax={getTotalDays()}
              aria-valuenow={dateToSliderValue(tempDate || selectedDate)}
              className={`
                w-full rounded-lg appearance-none cursor-pointer
                ${theme === 'green'
                  ? 'range-slider-green'
                  : 'range-slider-orange'
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
    </>
  );
};

export default HistoricalFrontPage; 