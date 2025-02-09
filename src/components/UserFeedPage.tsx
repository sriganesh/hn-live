import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { Following } from '../types/Following';
import { UserTag } from '../types/UserTag';
import { MobileBottomBar } from './MobileBottomBar';

interface UserFeedPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: FontOption;
  onShowSearch: () => void;
  onCloseSearch: () => void;
  onShowSettings: () => void;
  isRunning: boolean;
}

type Tab = 'feed' | 'following' | 'tags';

interface AlgoliaResponse {
  hits: Array<{
    objectID: string;
    title?: string;
    comment_text?: string;
    story_title?: string;
    author: string;
    created_at_i: number;
    url?: string;
    parent_id?: string;
  }>;
  nbPages: number;
  page: number;
}

interface FeedFilters {
  type: 'all' | 'stories' | 'comments';
  timeRange: '24h' | '7d' | '30d' | 'all';
  sortBy: 'date' | 'points';
}

export function UserFeedPage({ 
  theme, 
  fontSize, 
  font, 
  onShowSearch, 
  onCloseSearch, 
  onShowSettings,
  isRunning 
}: UserFeedPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [following, setFollowing] = useState<Following[]>([]);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<FeedFilters>({
    type: 'all',
    timeRange: '24h',
    sortBy: 'date'
  });
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Add tab order array
  const TAB_ORDER: Tab[] = ['feed', 'following', 'tags'];

  // Add swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIndex = TAB_ORDER.indexOf(activeTab);
      if (currentIndex >= 0) {
        // If we're at the last tab, go to the first tab
        const nextIndex = currentIndex === TAB_ORDER.length - 1 ? 0 : currentIndex + 1;
        setActiveTab(TAB_ORDER[nextIndex]);
      }
    },
    onSwipedRight: () => {
      const currentIndex = TAB_ORDER.indexOf(activeTab);
      if (currentIndex >= 0) {
        // If we're at the first tab, go to the last tab
        const nextIndex = currentIndex === 0 ? TAB_ORDER.length - 1 : currentIndex - 1;
        setActiveTab(TAB_ORDER[nextIndex]);
      }
    },
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: false,
    delta: 50,
    swipeDuration: 500,
    touchEventOptions: { passive: false }
  });

  // Load following and tags data
  useEffect(() => {
    try {
      const savedFollowing = JSON.parse(localStorage.getItem('hn-following') || '[]');
      const savedTags = JSON.parse(localStorage.getItem('hn-user-tags') || '[]');
      setFollowing(savedFollowing);
      setUserTags(savedTags);
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }, []);

  // Fetch feed items from followed users
  const fetchFeedItems = useCallback(async (pageNum: number) => {
    if (!following.length) {
      setFeedItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authorQuery = following.map(f => `author_${f.userId}`).join(',');
      const timeFilter = getTimeFilter(filters.timeRange);
      const pageParam = `&page=${pageNum}`;
      
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
      setHasMore(pageNum < maxPages - 1);

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

      setFeedItems(prev => pageNum === 0 ? newItems : [...prev, ...newItems]);
      setPage(pageNum);
    } catch (e) {
      console.error('Error fetching feed:', e);
      setError('Failed to load feed items');
    } finally {
      setLoading(false);
    }
  }, [following, filters]);

  // Initial feed fetch
  useEffect(() => {
    if (activeTab === 'feed') {
      fetchFeedItems(0);
    }
  }, [activeTab, fetchFeedItems]);

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || loading || activeTab !== 'feed') return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          fetchFeedItems(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, page, activeTab, fetchFeedItems]);

  // ESC key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate(-1);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [navigate]);

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
    return 'just now';
  };

  const removeFollowing = (userId: string) => {
    const updated = following.filter(f => f.userId !== userId);
    localStorage.setItem('hn-following', JSON.stringify(updated));
    setFollowing(updated);
    
    // Clear feed items if no users are left
    if (updated.length === 0) {
      setFeedItems([]);
      setHasMore(false);
    }
  };

  const removeTag = (userId: string, tagToRemove: string) => {
    const updated = userTags.map(tag => {
      if (tag.userId === userId) {
        return {
          ...tag,
          tags: tag.tags.filter(t => t !== tagToRemove)
        };
      }
      return tag;
    }).filter(tag => tag.tags.length > 0);

    localStorage.setItem('hn-user-tags', JSON.stringify(updated));
    setUserTags(updated);
  };

  const refreshFeed = () => {
    setLastRefresh(new Date());
    fetchFeedItems(0);
  };

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(refreshFeed, 60000);
    return () => clearInterval(interval);
  }, [isRunning]);

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

  return (
    <div {...swipeHandlers} className={`
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
      <div ref={containerRef} className="h-full overflow-y-auto overflow-x-hidden p-4 pb-20">
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
                / MY FEED
              </span>
            </div>
            
            <button 
              onClick={() => navigate(-1)}
              className="opacity-75 hover:opacity-100"
            >
              [ESC]
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('feed')}
              className={`hover:opacity-100 ${
                activeTab === 'feed' 
                  ? theme === 'green' 
                    ? 'text-green-500' 
                    : 'text-[#ff6600]'
                  : 'opacity-50'
              }`}
            >
              [FEED]
            </button>
            <button
              onClick={() => setActiveTab('following')}
              className={`hover:opacity-100 ${
                activeTab === 'following'
                  ? theme === 'green'
                    ? 'text-green-500'
                    : 'text-[#ff6600]'
                  : 'opacity-50'
              }`}
            >
              [FOLLOWING]
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`hover:opacity-100 ${
                activeTab === 'tags'
                  ? theme === 'green'
                    ? 'text-green-500'
                    : 'text-[#ff6600]'
                  : 'opacity-50'
              }`}
            >
              [TAGS]
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto">
          {activeTab === 'feed' && (
            <div>
              {/* Filters - Moved inside feed tab */}
              <div className="mb-8">
                <div className="flex flex-wrap gap-4">
                  <select
                    value={filters.type}
                    onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as 'all' | 'stories' | 'comments' }))}
                    className={`px-2 py-1 rounded text-sm ${
                      theme === 'green'
                        ? 'bg-black border border-green-500/30 text-green-400'
                        : theme === 'og'
                        ? 'bg-[#f6f6ef] border border-[#ff6600]/30 text-[#828282]'
                        : 'bg-[#1a1a1a] border border-[#828282]/30 text-[#828282]'
                    }`}
                  >
                    <option value="all">All Items</option>
                    <option value="stories">Stories Only</option>
                    <option value="comments">Comments Only</option>
                  </select>

                  <select
                    value={filters.timeRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, timeRange: e.target.value as '24h' | '7d' | '30d' | 'all' }))}
                    className={`px-2 py-1 rounded text-sm ${
                      theme === 'green'
                        ? 'bg-black border border-green-500/30 text-green-400'
                        : theme === 'og'
                        ? 'bg-[#f6f6ef] border border-[#ff6600]/30 text-[#828282]'
                        : 'bg-[#1a1a1a] border border-[#828282]/30 text-[#828282]'
                    }`}
                  >
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="all">All Time</option>
                  </select>

                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as 'date' | 'points' }))}
                    className={`px-2 py-1 rounded text-sm ${
                      theme === 'green'
                        ? 'bg-black border border-green-500/30 text-green-400'
                        : theme === 'og'
                        ? 'bg-[#f6f6ef] border border-[#ff6600]/30 text-[#828282]'
                        : 'bg-[#1a1a1a] border border-[#828282]/30 text-[#828282]'
                    }`}
                  >
                    <option value="date">Sort by Date</option>
                    <option value="points">Sort by Points</option>
                  </select>
                </div>
              </div>

              {/* Feed Content */}
              {loading && !feedItems.length ? (
                <div className="text-center py-8 opacity-75">
                  Loading...
                </div>
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
                      <div className="flex items-center gap-2 text-sm">
                        <a
                          href={`/user/${item.by}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/user/${item.by}`);
                          }}
                          className={`hover:opacity-75 ${
                            theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
                          }`}
                        >
                          {item.by}
                        </a>
                        <span className="opacity-75">·</span>
                        <a
                          href={`/item/${item.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(item.type === 'comment' ? `/item/${item.parent}/comment/${item.id}` : `/item/${item.id}`);
                          }}
                          className="opacity-75 hover:opacity-100"
                        >
                          {formatTimeAgo(item.time)}
                        </a>
                      </div>

                      {item.type === 'comment' ? (
                        // Comment
                        <div>
                          <div 
                            className="prose prose-sm max-w-none break-words
                              [&>*]:max-w-full [&>*]:break-words
                              [&_a]:inline-block [&_a]:max-w-full [&_a]:overflow-hidden [&_a]:text-ellipsis
                              [&_p]:max-w-full [&_p]:break-words
                              [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap
                              [&_code]:max-w-full [&_code]:break-words"
                            dangerouslySetInnerHTML={{ __html: item.text }}
                          />
                          <div className="text-sm mt-2">
                            <span className="opacity-75">on: </span>
                            <a
                              href={`/item/${item.parent}`}
                              onClick={(e) => {
                                e.preventDefault();
                                navigate(`/item/${item.parent}`);
                              }}
                              className="hover:opacity-75 break-words"
                            >
                              {item.title}
                            </a>
                          </div>
                        </div>
                      ) : (
                        // Story
                        <div className="break-words">
                          <a
                            href={item.url || `/item/${item.id}`}
                            onClick={(e) => {
                              if (!item.url) {
                                e.preventDefault();
                                navigate(`/item/${item.id}`);
                              }
                            }}
                            className="hover:opacity-75 break-all inline-block max-w-full"
                            target={item.url ? "_blank" : undefined}
                            rel={item.url ? "noopener noreferrer" : undefined}
                          >
                            {item.title}
                          </a>
                          {item.url && (
                            <span className="ml-2 opacity-50 text-sm break-all">
                              ({new URL(item.url).hostname})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Infinite scroll observer */}
                  <div ref={loadingRef} className="py-4 text-center">
                    {loading ? (
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
          )}

          {activeTab === 'following' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="opacity-75">
                  {following.length} followed user{following.length !== 1 ? 's' : ''}
                </div>
                <button
                  onClick={() => {
                    const timestamp = Math.floor(Date.now() / 1000);
                    const content = JSON.stringify(following, null, 2);
                    const blob = new Blob([content], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `hn.live-following-${timestamp}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="opacity-75 hover:opacity-100"
                >
                  [EXPORT]
                </button>
              </div>
              {following.length === 0 ? (
                <div className="text-center py-8 opacity-75">
                  <div>No followed users yet. Click on usernames to follow users.</div>
                  <div className="mt-2 text-sm">Following users lets you see their stories and comments in your personalized feed.</div>
                </div>
              ) : (
                following.map(follow => (
                  <div 
                    key={follow.userId}
                    className={`p-4 rounded ${
                      theme === 'green'
                        ? 'bg-green-500/5'
                        : theme === 'og'
                        ? 'bg-[#ff6600]/5'
                        : 'bg-[#828282]/5'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => navigate(`/user/${follow.userId}`)}
                        className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} hover:opacity-75`}
                      >
                        {follow.userId}
                      </button>
                      <button
                        onClick={() => removeFollowing(follow.userId)}
                        className="opacity-75 hover:opacity-100"
                      >
                        [unfollow]
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="opacity-75">
                  {userTags.length} tagged user{userTags.length !== 1 ? 's' : ''}
                </div>
                <button
                  onClick={() => {
                    const timestamp = Math.floor(Date.now() / 1000);
                    const content = JSON.stringify(userTags, null, 2);
                    const blob = new Blob([content], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `hn.live-user-tags-${timestamp}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="opacity-75 hover:opacity-100"
                >
                  [EXPORT]
                </button>
              </div>
              {userTags.length === 0 ? (
                <div className="text-center py-8 opacity-75">
                  <div>No tagged users yet. Click on usernames to add tags.</div>
                  <div className="mt-2 text-sm">Tags are private to you and stored locally in your browser.</div>
                </div>
              ) : (
                userTags.map(tag => (
                  <div key={tag.userId} className="space-y-2">
                    <button
                      onClick={() => navigate(`/user/${tag.userId}`)}
                      className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} hover:opacity-75`}
                    >
                      {tag.userId}
                    </button>
                    <div className="flex flex-wrap gap-2">
                      {tag.tags.map(t => (
                        <span
                          key={t}
                          className={`
                            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm
                            ${theme === 'green' 
                              ? 'bg-green-500/10 border border-green-500/30' 
                              : theme === 'og'
                              ? 'bg-[#ff6600]/10 border border-[#ff6600]/30'
                              : 'bg-[#828282]/10 border border-[#828282]/30'
                            }
                          `}
                        >
                          {t}
                          <button
                            onClick={() => removeTag(tag.userId, t)}
                            className="opacity-75 hover:opacity-100 ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))
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
    </div>
  );
} 