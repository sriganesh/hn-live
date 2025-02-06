import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Following } from '../types/Following';
import { MobileBottomBar } from './MobileBottomBar';

interface FeedPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: FontOption;
  onShowSearch: () => void;
  onCloseSearch: () => void;
  onShowSettings: () => void;
  isRunning: boolean;
}

interface FeedItem {
  id: number;
  type: 'story' | 'comment';
  title?: string;
  text?: string;
  url?: string;
  by: string;
  time: number;
  score?: number;
  parent?: number;
}

interface FeedFilters {
  type: 'stories' | 'comments' | 'all';
  timeRange: '24h' | '7d' | '30d' | 'all';
  sortBy: 'date' | 'points';
}

export function FeedPage({ theme, fontSize, font, onShowSearch, onCloseSearch, onShowSettings, isRunning }: FeedPageProps) {
  const navigate = useNavigate();
  const [following, setFollowing] = useState<Following[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FeedFilters>({
    type: 'all',
    timeRange: '24h',
    sortBy: 'date'
  });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [colorizeUsernames, setColorizeUsernames] = useState(() => {
    try {
      return localStorage.getItem('hn-live-colorize-usernames') === 'true';
    } catch (e) {
      return true; // Default to true if not set
    }
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        navigate(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Load following list
  useEffect(() => {
    try {
      const savedFollowing: Following[] = JSON.parse(localStorage.getItem('hn-following') || '[]');
      setFollowing(savedFollowing);
    } catch (e) {
      console.error('Error loading following:', e);
      setFollowing([]);
    }
  }, []);

  // Move fetchFeedItems outside useEffect
  const fetchFeedItems = async (page = 0, append = false) => {
    if (!following.length) {
      setFeedItems([]);
      setLoading(false);
      return;
    }

    if (append) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const authorQuery = following.map(f => `author_${f.userId}`).join(',');
      const timeFilter = getTimeFilter(filters.timeRange);
      const pageParam = `&page=${page}`;
      
      let storiesData: AlgoliaResponse = { hits: [], nbPages: 0, page: 0, hitsPerPage: 0 };
      let commentsData: AlgoliaResponse = { hits: [], nbPages: 0, page: 0, hitsPerPage: 0 };

      if (filters.type === 'stories' || filters.type === 'all') {
        const storiesRes = await fetch(
          `https://hn.algolia.com/api/v1/search_by_date?tags=story,(${authorQuery})${timeFilter}${pageParam}`
        );
        if (!storiesRes.ok) throw new Error('Failed to fetch from Algolia API');
        storiesData = await storiesRes.json();
      }

      if (filters.type === 'comments' || filters.type === 'all') {
        const commentsRes = await fetch(
          `https://hn.algolia.com/api/v1/search_by_date?tags=comment,(${authorQuery})${timeFilter}${pageParam}`
        );
        if (!commentsRes.ok) throw new Error('Failed to fetch from Algolia API');
        commentsData = await commentsRes.json();
      }

      // Calculate if there are more pages
      const maxPages = Math.max(storiesData.nbPages, commentsData.nbPages);
      setHasMore(page < maxPages - 1);

      // Combine and process items
      const newItems = [
        ...storiesData.hits.map((item: any) => ({
          id: item.objectID,
          type: 'story' as const,
          title: item.title,
          url: item.url,
          by: item.author,
          time: item.created_at_i,
          score: item.points,
          text: item.story_text
        })),
        ...commentsData.hits.map((item: any) => ({
          id: item.objectID,
          type: 'comment' as const,
          text: item.comment_text,
          by: item.author,
          time: item.created_at_i,
          parent: item.parent_id,
          title: item.story_title
        }))
      ];

      // Sort items
      newItems.sort((a, b) => b.time - a.time);

      if (filters.sortBy === 'points') {
        newItems.sort((a, b) => {
          const pointsA = a.type === 'story' ? (a.score || 0) : 0;
          const pointsB = b.type === 'story' ? (b.score || 0) : 0;
          return pointsB - pointsA;
        });
      }

      setFeedItems(prev => append ? [...prev, ...newItems] : newItems);
      setCurrentPage(page);
    } catch (e) {
      console.error('Error fetching feed:', e);
      setError('Failed to load feed items');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchFeedItems(0, false);
  }, [following, filters]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !loading && !isLoadingMore && hasMore) {
          fetchFeedItems(currentPage + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loading, isLoadingMore, hasMore, currentPage]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(0);
    setHasMore(true);
    fetchFeedItems(0, false);
  }, [following, filters]);

  const getTimeFilter = (range: string) => {
    const now = Math.floor(Date.now() / 1000);
    switch (range) {
      case '24h':
        return `&numericFilters=created_at_i>${now - 86400}`;
      case '7d':
        return `&numericFilters=created_at_i>${now - 604800}`;
      case '30d':
        return `&numericFilters=created_at_i>${now - 2592000}`;
      default:
        return '';
    }
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  const refreshFeed = () => {
    setLastRefresh(new Date());
  };

  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(refreshFeed, 60000); // Refresh every minute when running
    return () => clearInterval(interval);
  }, [isRunning]);

  // Add loading skeleton
  const LoadingSkeleton = () => (
    <div className="animate-pulse space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 bg-gray-700/20 rounded w-32" />
          <div className="h-4 bg-gray-700/20 rounded w-full" />
        </div>
      ))}
    </div>
  );

  // Add interface for API response
  interface AlgoliaResponse {
    hits: any[];
    nbPages: number;
    page: number;
    hitsPerPage: number;
  }

  return (
    <div className={`
      fixed inset-0 z-50 overflow-hidden
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
                / MY FEED
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={refreshFeed}
                className="opacity-75 hover:opacity-100"
              >
                [refresh]
              </button>
              <span className="text-sm opacity-50">
                {formatTimeAgo(lastRefresh.getTime() / 1000)}
              </span>
              <button 
                onClick={() => navigate(-1)}
                className="opacity-75 hover:opacity-100"
              >
                [ESC]
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mt-4">
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
              className={`
                px-2 py-1 rounded text-sm
                ${theme === 'green'
                  ? 'bg-black border border-green-500/30 text-green-400'
                  : theme === 'og'
                  ? 'bg-[#f6f6ef] border border-[#ff6600]/30 text-[#828282]'
                  : 'bg-[#1a1a1a] border border-[#828282]/30 text-[#828282]'
                }
              `}
            >
              <option value="all">All Items</option>
              <option value="stories">Stories Only</option>
              <option value="comments">Comments Only</option>
            </select>

            <select
              value={filters.timeRange}
              onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as any }))}
              className={`
                px-2 py-1 rounded text-sm
                ${theme === 'green'
                  ? 'bg-black border border-green-500/30 text-green-400'
                  : theme === 'og'
                  ? 'bg-[#f6f6ef] border border-[#ff6600]/30 text-[#828282]'
                  : 'bg-[#1a1a1a] border border-[#828282]/30 text-[#828282]'
                }
              `}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className={`
                px-2 py-1 rounded text-sm
                ${theme === 'green'
                  ? 'bg-black border border-green-500/30 text-green-400'
                  : theme === 'og'
                  ? 'bg-[#f6f6ef] border border-[#ff6600]/30 text-[#828282]'
                  : 'bg-[#1a1a1a] border border-[#828282]/30 text-[#828282]'
                }
              `}
            >
              <option value="date">Sort by Date</option>
              <option value="points">Sort by Points</option>
            </select>
          </div>
        </div>

        {/* Feed Content */}
        <div className="max-w-3xl mx-auto">
          {loading && !isLoadingMore ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="text-center py-8 opacity-75">
              {error}
            </div>
          ) : feedItems.length === 0 ? (
            <div className="text-center py-8 opacity-75">
              {following.length === 0 
                ? "Follow some users to see their content here"
                : "No items found for the selected filters"}
            </div>
          ) : (
            <div className="space-y-6">
              {feedItems.map(item => (
                <div key={item.id} className="space-y-2">
                  {item.type === 'story' ? (
                    <div className="space-y-3">
                      {/* User and Time Header */}
                      <div className="flex items-center gap-2 text-sm">
                        <a
                          href={`/user/${item.by}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/user/${item.by}`);
                          }}
                          className={`hover:opacity-75 ${
                            colorizeUsernames && theme !== 'green'
                              ? 'text-[#ff6600]'
                              : ''
                          }`}
                        >
                          {item.by}
                        </a>
                        <span className="opacity-75">·</span>
                        <a
                          href={`/item/${item.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/item/${item.id}`);
                          }}
                          className="opacity-75 hover:opacity-100"
                        >
                          {formatTimeAgo(item.time)}
                        </a>
                      </div>

                      {/* Story Title and URL */}
                      <div>
                        <a
                          href={item.url || `https://news.ycombinator.com/item?id=${item.id}`}
                          onClick={(e) => {
                            if (!item.url) {
                              e.preventDefault();
                              navigate(`/item/${item.id}`);
                            }
                          }}
                          className="hover:opacity-75"
                          target={item.url ? "_blank" : undefined}
                          rel={item.url ? "noopener noreferrer" : undefined}
                        >
                          {item.title}
                        </a>
                        {item.url && (
                          <span className="ml-2 opacity-50 text-sm">
                            ({new URL(item.url).hostname})
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* User and Time Header */}
                      <div className="flex items-center gap-2 text-sm">
                        <a
                          href={`/user/${item.by}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/user/${item.by}`);
                          }}
                          className={`hover:opacity-75 ${
                            colorizeUsernames && theme !== 'green'
                              ? 'text-[#ff6600]'
                              : ''
                          }`}
                        >
                          {item.by}
                        </a>
                        <span className="opacity-75">·</span>
                        <a
                          href={`/item/${item.parent}/comment/${item.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/item/${item.parent}/comment/${item.id}`);
                          }}
                          className="opacity-75 hover:opacity-100"
                        >
                          {formatTimeAgo(item.time)}
                        </a>
                      </div>

                      {/* Comment Content */}
                      <div 
                        className="prose prose-sm max-w-none break-words
                          [&>*]:max-w-full [&>*]:break-words
                          [&_a]:inline-block [&_a]:max-w-full [&_a]:overflow-hidden [&_a]:text-ellipsis
                          [&_p]:max-w-full [&_p]:break-words
                          [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap
                          [&_code]:max-w-full [&_code]:break-words"
                        style={{
                          width: '100%',
                          maxWidth: '100%',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}
                        dangerouslySetInnerHTML={{ 
                          __html: item.text?.replace(/<p>/g, '<p style="max-width: 100%; overflow-wrap: break-word;">') || '' 
                        }}
                      />

                      {/* Parent Story Link */}
                      <div className="text-sm">
                        <span className="opacity-75">Commented on: </span>
                        <a
                          href={`/item/${item.parent}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/item/${item.parent}`);
                          }}
                          className="hover:opacity-75"
                        >
                          {item.title || 'story'}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Infinite scroll observer and loading indicator */}
              <div ref={observerTarget} className="py-4 text-center">
                {isLoadingMore ? (
                  <div className="opacity-75">Loading more...</div>
                ) : !hasMore && filters.timeRange !== 'all' && feedItems.length > 0 ? (
                  <div className="opacity-75 space-y-2">
                    <div>No more items in this time range.</div>
                    <div className="text-sm">
                      Try adjusting the time filter to see more content from your followed users.
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      <MobileBottomBar 
        theme={theme}
        onShowSearch={onShowSearch}
        onCloseSearch={onCloseSearch}
        onShowSettings={onShowSettings}
      />
    </div>
  );
}