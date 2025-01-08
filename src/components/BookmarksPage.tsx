import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkManager } from './BookmarkManager';
import { MobileBottomBar } from './MobileBottomBar';

interface BookmarksPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: FontOption;
  onShowSearch: () => void;
  onCloseSearch: () => void;
  onShowSettings: () => void;
  isRunning: boolean;
}

interface Bookmark {
  id: number;
  type: 'story' | 'comment';
  title?: string;
  text?: string;
  by: string;
  time: number;
  url?: string;
  storyId?: number;
  storyTitle?: string;
}

export function BookmarksPage({ theme, fontSize, font, onShowSearch, onCloseSearch, onShowSettings, isRunning }: BookmarksPageProps) {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState<HNItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef<HTMLDivElement>(null);
  const ITEMS_PER_PAGE = 20;

  const fetchBookmarks = async (pageNum: number) => {
    try {
      const savedBookmarks: BookmarkEntry[] = JSON.parse(localStorage.getItem('hn-bookmarks') || '[]');
      
      // Sort by timestamp (newest first)
      savedBookmarks.sort((a, b) => b.timestamp - a.timestamp);

      const start = pageNum * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const pageBookmarks = savedBookmarks.slice(start, end);

      if (pageBookmarks.length < ITEMS_PER_PAGE) {
        setHasMore(false);
      }

      // Fetch all bookmarked items for this page
      const items = await Promise.all(
        pageBookmarks.map(async (bookmark) => {
          const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${bookmark.id}.json`);
          const item = await response.json();
          return {
            ...item,
            type: bookmark.type,
            storyId: bookmark.storyId
          };
        })
      );

      // For comments, fetch their parent stories
      const itemsWithStories = await Promise.all(
        items.map(async (item) => {
          if (item.type === 'comment' && item.storyId) {
            const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${item.storyId}.json`);
            const story = await storyResponse.json();
            return { ...item, story };
          }
          return item;
        })
      );

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
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
          fetchBookmarks(page + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, page]);

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
      <div className="h-full overflow-y-auto p-4 pb-20">
        {/* Header */}
        <div className="max-w-3xl mx-auto mb-8">
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

        {/* Bookmarks List */}
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="opacity-75">
              Loading bookmarks...
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="opacity-75 space-y-2">
              <p>
                No bookmarks yet. Use the bookmark button on stories or comments to save them here.
              </p>
              <p>
                Note: Bookmarks are stored locally in your browser. They may be lost if you clear browser data. 
                Use the [EXPORT] button above to save your bookmarks.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
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
                        onClick={() => {
                          const updatedBookmarks = bookmarks.filter(b => b.id !== bookmark.id);
                          localStorage.setItem('hn-bookmarks', JSON.stringify(updatedBookmarks));
                          setBookmarks(updatedBookmarks);
                        }}
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
                        onClick={() => {
                          const updatedBookmarks = bookmarks.filter(b => b.id !== bookmark.id);
                          localStorage.setItem('hn-bookmarks', JSON.stringify(updatedBookmarks));
                          setBookmarks(updatedBookmarks);
                        }}
                        className="opacity-50 hover:opacity-100"
                      >
                        [remove]
                      </button>
                    </>
                  )}
                </div>
              ))}
              
              {hasMore && (
                <div ref={loadingRef} className="py-4 text-center opacity-50">
                  Loading more bookmarks...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <MobileBottomBar 
        theme={theme}
        onShowSearch={onShowSearch}
        onCloseSearch={onCloseSearch}
        onShowSettings={onShowSettings}
        isRunning={isRunning}
      />
    </div>
  );
} 