import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkManager } from './BookmarkManager';
import { MobileBottomBar } from './MobileBottomBar';
import { AUTH_TOKEN_KEY, API_BASE_URL } from '../types/auth';

type FontOption = 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';

interface BookmarkEntry {
  id: number;
  type: 'story' | 'comment';
  storyId?: number;
  timestamp: number;
}

interface BookmarkCache {
  [key: string]: HNItem;
}

interface HNItem {
  id: number;
  type: 'story' | 'comment';
  title?: string;
  text?: string;
  by: string;
  time: number;
  url?: string;
  score?: number;
  kids?: number[];
  parent?: number;
  storyId?: number;
  story?: HNItem;
}

interface BookmarksPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: FontOption;
  onShowSearch: () => void;
  onCloseSearch: () => void;
  onShowSettings: () => void;
  isRunning: boolean;
  username?: string;
}

export function BookmarksPage({ theme, fontSize, font, onShowSearch, onCloseSearch, onShowSettings, isRunning, username }: BookmarksPageProps) {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<HNItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 20;
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchBookmarks = async (pageNum: number) => {
    try {
      // Get core bookmark data
      const bookmarkEntries: BookmarkEntry[] = JSON.parse(localStorage.getItem('hn-bookmarks') || '[]');
      
      // Sort by timestamp (newest first)
      bookmarkEntries.sort((a, b) => b.timestamp - a.timestamp);

      const start = pageNum * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const pageBookmarks = bookmarkEntries.slice(start, end);

      if (pageBookmarks.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      // Get or initialize cache
      let bookmarkCache: BookmarkCache = JSON.parse(localStorage.getItem('hn-bookmark-cache') || '{}');

      // Fetch items not in cache
      const itemsToFetch = pageBookmarks.filter(b => !bookmarkCache[b.id]);
      
      if (itemsToFetch.length > 0) {
        const newItems = await Promise.all(
          itemsToFetch.map(async (bookmark) => {
            const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${bookmark.id}.json`);
            const item = await response.json();
            return {
              ...item,
              type: bookmark.type,
              storyId: bookmark.storyId
            };
          })
        );

        // Update cache with new items
        newItems.forEach(item => {
          bookmarkCache[item.id] = item;
        });
        localStorage.setItem('hn-bookmark-cache', JSON.stringify(bookmarkCache));
      }

      // Get items for this page from cache
      const pageItems = pageBookmarks.map(bookmark => ({
        ...bookmarkCache[bookmark.id],
        type: bookmark.type,
        storyId: bookmark.storyId
      }));

      // For comments, fetch their parent stories if not in cache
      const itemsWithStories = await Promise.all(
        pageItems.map(async (item) => {
          if (item.type === 'comment' && item.storyId) {
            if (!bookmarkCache[item.storyId]) {
              const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${item.storyId}.json`);
              const story = await storyResponse.json();
              bookmarkCache[item.storyId] = story;
              localStorage.setItem('hn-bookmark-cache', JSON.stringify(bookmarkCache));
              return { ...item, story };
            }
            return { ...item, story: bookmarkCache[item.storyId] };
          }
          return item;
        })
      );

      // Update bookmarks state
      if (pageNum === 0) {
        setBookmarks(itemsWithStories.filter(Boolean));
      } else {
        setBookmarks(prev => [...prev, ...itemsWithStories.filter(Boolean)]);
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks(0);

    // Listen for sync events and refresh bookmarks
    const handleSync = async () => {
      const currentScrollTop = containerRef.current?.scrollTop || 0;
      setLoading(true);
      setPage(0);
      setHasMore(true);
      setBookmarks([]);
      await fetchBookmarks(0);
      setLoading(false);
      // Restore scroll position for sync if we were not at the top
      if (currentScrollTop > 0) {
        requestAnimationFrame(() => {
          if (containerRef.current) {
            containerRef.current.scrollTop = currentScrollTop;
          }
        });
      }
    };

    window.addEventListener('bookmarks-synced', handleSync);
    return () => window.removeEventListener('bookmarks-synced', handleSync);
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    let isMounted = true;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setLoading(true);
          const nextPage = page + 1;
          setPage(nextPage);
          await fetchBookmarks(nextPage);
          if (isMounted) {
            setLoading(false);
          }
        }
      },
      { 
        threshold: 0.5,
        rootMargin: '100px' // Start loading earlier
      }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => {
      isMounted = false;
      observer.disconnect();
    };
  }, [hasMore, loading, page]);

  // Add scroll handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsBackToTopVisible(container.scrollTop > 500);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Add scroll to top function
  const scrollToTop = () => {
    containerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return '0m';
  };

  // Add ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate(-1);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [navigate]);

  // Add loading indicator component
  const LoadingIndicator = () => (
    <div className="py-4 text-center opacity-75 transition-opacity duration-200">
      {loading ? 'Loading more bookmarks...' : hasMore ? 'Scroll for more' : ''}
    </div>
  );

  const handleDeleteBookmark = async (bookmarkId: number) => {
    try {
      // Remove from local storage
      const bookmarkEntries: BookmarkEntry[] = JSON.parse(localStorage.getItem('hn-bookmarks') || '[]');
      const updatedBookmarks = bookmarkEntries.filter(b => b.id !== bookmarkId);
      localStorage.setItem('hn-bookmarks', JSON.stringify(updatedBookmarks));

      // Remove from cache
      const bookmarkCache = JSON.parse(localStorage.getItem('hn-bookmark-cache') || '{}');
      delete bookmarkCache[bookmarkId];
      localStorage.setItem('hn-bookmark-cache', JSON.stringify(bookmarkCache));

      // Update UI
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));

      // Remove from cloud if user is logged in
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        const deleteResponse = await fetch(`${API_BASE_URL}/api/bookmarks/item/${bookmarkId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });

        if (!deleteResponse.ok && deleteResponse.status !== 404) {
          console.error('Failed to delete bookmark from cloud');
        }
      }
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  };

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
      <div 
        ref={containerRef}
        className="h-full overflow-y-auto p-4 pb-20 transition-all duration-200"
      >
        {/* Header */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/')}
                className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold tracking-wider hover:opacity-75 flex items-center`}
              >
                <span>HN</span>
                <span className={`mx-1 animate-pulse ${!isRunning ? 'text-gray-500' : ''}`}>•</span>
                <span>LIVE</span>
              </button>
              <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold`}>
                / BOOKMARKS
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <BookmarkManager theme={theme} />
              <button 
                onClick={() => navigate(-1)}
                className="opacity-75 hover:opacity-100"
              >
                [ESC]
              </button>
            </div>
          </div>
        </div>

        {/* Add the note about local storage at the top */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="text-sm opacity-75">
            Note: Bookmarks are stored locally. Use [EXPORT] to save them, or create an HN Live account in Settings for cloud sync.
          </div>
        </div>

        {/* Bookmarks List */}
        <div className="max-w-3xl mx-auto">
          {bookmarks.length === 0 ? (
            <div className="text-center py-8 opacity-75">
              No bookmarks yet. Use the bookmark button on stories or comments to save them here.
            </div>
          ) : (
            <div className="space-y-6">
              {bookmarks.map(bookmark => (
                <div key={bookmark.id} className="leading-relaxed">
                  {bookmark.type === 'comment' ? (
                    <>
                      <span className="opacity-50">{formatTimeAgo(bookmark.time)}</span>
                      {' | '}
                      <a
                        href={`/item/${bookmark.storyId}/comment/${bookmark.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/item/${bookmark.storyId}/comment/${bookmark.id}`);
                        }}
                        className="hover:opacity-75"
                      >
                        {bookmark.text}
                      </a>
                      {' | re: '}
                      <a
                        href={`/item/${bookmark.storyId}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/item/${bookmark.storyId}`);
                        }}
                        className="hover:opacity-75"
                      >
                        {bookmark.story?.title}
                      </a>
                      {' '}
                      <button
                        onClick={() => handleDeleteBookmark(bookmark.id)}
                        className="opacity-50 hover:opacity-100"
                      >
                        [remove]
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="opacity-50">{formatTimeAgo(bookmark.time)}</span>
                      {' | '}
                      <a
                        href={`/item/${bookmark.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/item/${bookmark.id}`);
                        }}
                        className="hover:opacity-75"
                      >
                        {bookmark.title}
                      </a>
                      {' '}
                      <button
                        onClick={() => handleDeleteBookmark(bookmark.id)}
                        className="opacity-50 hover:opacity-100"
                      >
                        [remove]
                      </button>
                    </>
                  )}
                </div>
              ))}
              
              {(hasMore || loading) && (
                <div ref={loadingRef}>
                  <LoadingIndicator />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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

      <MobileBottomBar 
        theme={theme}
        onShowSearch={onShowSearch}
        onCloseSearch={onCloseSearch}
        onShowSettings={onShowSettings}
        isRunning={isRunning}
        username={username}
      />
    </div>
  );
} 