import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { Following } from '../types/Following';
import { UserTag } from '../types/UserTag';
import { MobileBottomBar } from './MobileBottomBar';
import { FeedTabContent } from './tabs/FeedTabContent';
import { ProfileTabContent } from './tabs/ProfileTabContent';
import { BookmarksTabContent } from './tabs/BookmarksTabContent';
import { BookmarkEntry } from '../types/bookmarks';
import { Comment } from '../types/comments';
import { 
  DashboardComment, 
  AlgoliaResponse, 
  AlgoliaHit, 
  FeedFilters,
  NewReply,
  MessageHandlerData,
  TrackerData,
  FeedItem,
  Bookmark,
  CommentGroup
} from '../types/dashboardTypes';
import { ErrorBoundary } from './ErrorBoundary';

type FontOption = 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';
type Tab = 'profile' | 'bookmarks' | 'feed' | 'following' | 'tags';

interface UserDashboardPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: FontOption;
  onShowSearch: () => void;
  onCloseSearch: () => void;
  onShowSettings: () => void;
  isRunning: boolean;
  onUserClick: (username: string) => void;
  onUpdateHnUsername: (username: string | null) => void;
  username?: string;
}

// Add loading state types
type LoadingState = {
  feed: boolean;
  bookmarks: boolean;
  profile: boolean;
  following: boolean;
  tags: boolean;
};

// Add a helper function for localStorage operations
const safeLocalStorage = {
  get: (key: string, defaultValue: string = '[]') => {
    try {
      const value = localStorage.getItem(key);
      return value !== null ? value : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return defaultValue;
    }
  },
  set: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error(`Error writing ${key} to localStorage:`, e);
      return false;
    }
  }
};

// Add loading indicator component
const LoadingIndicator = ({ message }: { message: string }) => (
  <div className="text-center py-8 opacity-75">
    <div className="animate-pulse">{message}</div>
  </div>
);

// Add a helper function to safely handle dates
const safeDate = (timestamp: number | string | undefined): string => {
  try {
    if (typeof timestamp === 'number') {
      // Convert Unix timestamp to milliseconds if needed
      const ms = timestamp > 9999999999 ? timestamp : timestamp * 1000;
      return new Date(ms).toISOString();
    } else if (timestamp) {
      return new Date(timestamp).toISOString();
    }
    return new Date().toISOString(); // Fallback to current time
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date().toISOString();
  }
};

export function UserDashboardPage({ 
  theme, 
  fontSize, 
  font, 
  onShowSearch, 
  onCloseSearch, 
  onShowSettings,
  isRunning,
  onUserClick,
  onUpdateHnUsername,
  username
}: UserDashboardPageProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState<Following[]>(() => {
    try {
      const savedFollowing = localStorage.getItem('hn-following');
      console.log('Initial following data:', savedFollowing); // Debug
      return savedFollowing ? JSON.parse(savedFollowing) : [];
    } catch (error) {
      console.error('Error loading following data:', error);
      return [];
    }
  });
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [comments, setComments] = useState<DashboardComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filters, setFilters] = useState<FeedFilters>({
    type: 'all',
    timeRange: '24h',
    sortBy: 'date'
  });
  const [error, setError] = useState<string | null>(null);
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);
  const [trackerData, setTrackerData] = useState<TrackerData>({
    lastChecked: 0,
    comments: [],
    lastSeenReplies: {}
  });

  // Update loading state
  const [loadingStates, setLoadingStates] = useState<LoadingState>({
    feed: false,
    bookmarks: false,
    profile: false,
    following: false,
    tags: false
  });

  const TAB_ORDER: Tab[] = ['profile', 'bookmarks', 'feed', 'following', 'tags'];

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      const currentIndex = TAB_ORDER.indexOf(activeTab);
      if (currentIndex >= 0) {
        const nextIndex = currentIndex === TAB_ORDER.length - 1 ? 0 : currentIndex + 1;
        setActiveTab(TAB_ORDER[nextIndex]);
      }
    },
    onSwipedRight: () => {
      const currentIndex = TAB_ORDER.indexOf(activeTab);
      if (currentIndex >= 0) {
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

  const handleMarkAllAsRead = () => {
    localStorage.setItem('hn-new-replies', '{}');
    localStorage.setItem('hn-unread-count', '0');
    setUnreadCount(0);
    window.dispatchEvent(new CustomEvent('unreadCountChange', {
      detail: { unreadCount: 0 }
    }));
  };

  const handleDeleteBookmark = async (bookmarkId: number) => {
    try {
      const bookmarkEntries: BookmarkEntry[] = JSON.parse(
        safeLocalStorage.get('hn-bookmarks')
      );
      const updatedBookmarks = bookmarkEntries.filter(b => b.id !== bookmarkId);
      localStorage.setItem('hn-bookmarks', JSON.stringify(updatedBookmarks));

      // Remove from cache
      const bookmarkCache = JSON.parse(localStorage.getItem('hn-bookmark-cache') || '{}');
      delete bookmarkCache[bookmarkId];
      localStorage.setItem('hn-bookmark-cache', JSON.stringify(bookmarkCache));

      // Update UI
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('bookmarks-updated'));
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      setError('Failed to delete bookmark. Please try again.');
    }
  };

  const handleUnfollow = (userId: string) => {
    const updated = following.filter(f => f.userId !== userId);
    localStorage.setItem('hn-following', JSON.stringify(updated));
    setFollowing(updated);
    
    if (updated.length === 0) {
      setFeedItems([]);
      setHasMore(false);
    }
  };

  const handleRemoveTag = (userId: string, tagToRemove: string) => {
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

  // Move handleNetworkError before it's used
  const handleNetworkError = useCallback((error: unknown, defaultMessage: string) => {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        setError('Request was cancelled');
      } else if (error.message.includes('Failed to fetch')) {
        setError('Network error. Please check your connection.');
      } else {
        setError(error.message);
      }
    } else {
      setError(defaultMessage);
    }
  }, []);

  const renderTabContent = () => {
    if (loadingStates[activeTab]) {
      return <LoadingIndicator message={`Loading ${activeTab}...`} />;
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <div className="text-red-500 dark:text-red-400 mb-2">
            {error}
          </div>
          <button
            onClick={() => {
              setError(null);
              if (activeTab === 'feed') fetchFeedItems(0);
            }}
            className="opacity-75 hover:opacity-100"
          >
            [RETRY]
          </button>
        </div>
      );
    }

    if (loading && !feedItems.length) {
      return (
        <div className="text-center py-8 opacity-75">
          Loading...
        </div>
      );
    }

    switch (activeTab) {
      case 'profile':
        return (
          <ProfileTabContent 
            theme={theme}
            hnUsername={username || null}
            onShowSettings={onShowSettings}
            onUpdateHnUsername={onUpdateHnUsername}
            comments={comments}
            loading={loading}
            unreadCount={unreadCount}
            onMarkAllAsRead={handleMarkAllAsRead}
            onUserClick={onUserClick}
            commentGroups={commentGroups}
            handleMarkAsRead={handleMarkAsRead}
          />
        );

      case 'bookmarks':
        return (
          <BookmarksTabContent 
            theme={theme}
            bookmarks={bookmarks}
            loading={loading}
            hasMore={hasMore}
            loadingRef={loadingRef}
            onDeleteBookmark={handleDeleteBookmark}
            navigate={navigate}
          />
        );

      case 'feed':
        console.log('Rendering feed tab, items:', feedItems.length); // Debug
        return (
          <FeedTabContent 
            theme={theme}
            filters={filters}
            setFilters={setFilters}
            feedItems={feedItems}
            loading={loadingStates.feed}
            hasMore={hasMore}
            loadingRef={loadingRef}
            onUserClick={onUserClick}
          />
        );

      case 'following':
        return (
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
            <FollowingList />
          </div>
        );

      case 'tags':
        return (
          <div className="space-y-4">
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
            <TagsList />
          </div>
        );

      default:
        return null;
    }
  };

  const FollowingList = () => {
    return (
      <div className="space-y-4">
        {following.length === 0 ? (
          <div className="text-center py-8 opacity-75">
            <div>No followed users yet. Click on usernames to follow users.</div>
            <div className="mt-2 text-sm">
              Following users lets you see their stories and comments in your personalized feed.
            </div>
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
                  onClick={() => onUserClick(follow.userId)}
                  className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} hover:opacity-75`}
                >
                  {follow.userId}
                </button>
                <button
                  onClick={() => handleUnfollow(follow.userId)}
                  className="opacity-75 hover:opacity-100"
                >
                  [unfollow]
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const TagsList = () => {
    return (
      <div className="space-y-4">
        {userTags.length === 0 ? (
          <div className="text-center py-8 opacity-75">
            <div>No tagged users yet. Click on usernames to add tags.</div>
            <div className="mt-2 text-sm">
              Tags are private to you and stored locally in your browser.
            </div>
          </div>
        ) : (
          userTags.map(tag => (
            <div key={tag.userId} className="space-y-2">
              <button
                onClick={() => onUserClick(tag.userId)}
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
                      onClick={() => handleRemoveTag(tag.userId, t)}
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
    );
  };

  // Load following and tags data
  useEffect(() => {
    setLoading(true);
    setError(null);

    try {
      const savedFollowing = JSON.parse(localStorage.getItem('hn-following') || '[]');
      const savedTags = JSON.parse(localStorage.getItem('hn-user-tags') || '[]');
      setFollowing(savedFollowing);
      setUserTags(savedTags);
    } catch (e) {
      console.error('Error loading data:', e);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load bookmarks
  const fetchBookmarks = useCallback(async (pageNum = 0) => {
    setTabLoading('bookmarks', true);
    try {
      if (activeTab !== 'bookmarks') return;
      
      setLoading(true);
      setError(null);
      
      const ITEMS_PER_PAGE = 20;
      const bookmarkEntries: BookmarkEntry[] = JSON.parse(
        safeLocalStorage.get('hn-bookmarks')
      );
      const bookmarkCache: Record<number, any> = JSON.parse(localStorage.getItem('hn-bookmark-cache') || '{}');
      
      const start = pageNum * ITEMS_PER_PAGE;
      const end = start + ITEMS_PER_PAGE;
      const pageBookmarks = bookmarkEntries.slice(start, end);

      setHasMore(end < bookmarkEntries.length);
      
      const itemsToFetch = pageBookmarks.filter(b => !bookmarkCache[b.id]);
      if (itemsToFetch.length > 0) {
        const newItems = await Promise.all(
          itemsToFetch.map(async (bookmark: BookmarkEntry) => {
            const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${bookmark.id}.json`);
            if (!response.ok) {
              throw new Error(`Failed to fetch bookmark ${bookmark.id}`);
            }
            return await response.json();
          })
        );
        
        newItems.forEach(item => {
          if (item) bookmarkCache[item.id] = item;
        });
        localStorage.setItem('hn-bookmark-cache', JSON.stringify(bookmarkCache));
      }
      
      const items = pageBookmarks.map(bookmark => bookmarkCache[bookmark.id]);
      setBookmarks(prev => pageNum === 0 ? items.filter(Boolean) : [...prev, ...items.filter(Boolean)]);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      setError(error instanceof Error ? error.message : 'Failed to load bookmarks');
    } finally {
      setTabLoading('bookmarks', false);
    }
  }, [activeTab]);

  // Add infinite scroll for bookmarks
  useEffect(() => {
    if (!hasMore || loading || activeTab !== 'bookmarks') return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          fetchBookmarks(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading, page, activeTab, fetchBookmarks]);

  // Add AbortController for cleanup
  const abortControllerRef = useRef<AbortController>();

  useEffect(() => {
    return () => {
      // Cleanup any pending requests when component unmounts
      abortControllerRef.current?.abort();
    };
  }, []);

  // Now we can use handleNetworkError in fetchFeedItems
  const fetchFeedItems = useCallback(async (pageNum: number) => {
    setTabLoading('feed', true);
    console.log('Fetching feed items, page:', pageNum);
    
    // Get fresh following data
    const currentFollowing = JSON.parse(localStorage.getItem('hn-following') || '[]');
    console.log('Current following users:', currentFollowing); // Debug

    if (!currentFollowing.length) {
      console.log('No followed users found');
      setFeedItems([]);
      setHasMore(false);
      setTabLoading('feed', false);
      return;
    }

    try {
      const authorQuery = currentFollowing.map(f => `author_${f.userId}`).join(',');
      console.log('Author query:', authorQuery); // Debug
      
      const timeFilter = getTimeFilter(filters.timeRange);
      const pageParam = `&page=${pageNum}`;
      
      const [storiesRes, commentsRes] = await Promise.all([
        fetch(`https://hn.algolia.com/api/v1/search_by_date?tags=story,(${authorQuery})${timeFilter}${pageParam}`, 
          { signal: abortControllerRef.current?.signal }
        ),
        fetch(`https://hn.algolia.com/api/v1/search_by_date?tags=comment,(${authorQuery})${timeFilter}${pageParam}`, 
          { signal: abortControllerRef.current?.signal }
        )
      ]);

      if (!storiesRes.ok || !commentsRes.ok) {
        throw new Error('Failed to fetch feed items');
      }

      const [storiesData, commentsData] = await Promise.all([
        storiesRes.json(),
        commentsRes.json()
      ]) as [AlgoliaResponse, AlgoliaResponse];

      // Only update state if the request wasn't aborted
      if (!abortControllerRef.current?.signal.aborted) {
        const maxPages = Math.max(storiesData.nbPages, commentsData.nbPages);
        setHasMore(pageNum < maxPages - 1);

        const newItems: FeedItem[] = [
          ...storiesData.hits.map((item: AlgoliaHit) => ({
            id: item.objectID,
            type: 'story' as const,
            title: item.title || '',
            url: item.url,
            by: item.author,
            time: item.created_at_i,
            score: item.points,
            text: item.story_text
          })),
          ...commentsData.hits.map((item: AlgoliaHit) => ({
            id: item.objectID,
            type: 'comment' as const,
            text: item.comment_text || '',
            by: item.author,
            time: item.created_at_i,
            parent: item.parent_id,
            title: item.story_title || ''
          }))
        ];

        setFeedItems(prev => pageNum === 0 ? newItems : [...prev, ...newItems]);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching feed:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return;
        }
        handleNetworkError(error, 'Failed to load feed items');
      }
    } finally {
      setTabLoading('feed', false);
    }
  }, [following, filters, activeTab, handleNetworkError]);

  // Load profile data
  const fetchProfileData = useCallback(async () => {
    setTabLoading('profile', true);
    if (!username || activeTab !== 'profile') return;

    setLoading(true);
    setError(null);

    try {
      // First get the user's comments
      const response = await fetch(
        `https://hn.algolia.com/api/v1/search_by_date?tags=comment,author_${username}&hitsPerPage=100`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }

      const data = await response.json();
      
      // Get comment IDs
      const commentIds = data.hits
        .filter((hit: AlgoliaHit) => hit.comment_text)
        .map((hit: AlgoliaHit) => hit.objectID);

      // Get tracker data to find ALL replies
      const trackerData = getLocalStorageData('hn-comment-tracker', { 
        lastChecked: 0,
        comments: [],
        lastSeenReplies: {}
      });

      // Get ALL reply IDs from tracker
      const replyIds = trackerData.comments
        .filter(comment => commentIds.includes(comment.id))
        .reduce<string[]>((ids, comment) => [...ids, ...comment.replyIds], []);

      // Fetch ALL replies
      let repliesData = { hits: [] };
      if (replyIds.length > 0) {
        const repliesResponse = await fetch(
          `https://hn.algolia.com/api/v1/search_by_date?tags=comment&numericFilters=created_at_i>0&filters=${
            encodeURIComponent(replyIds.map(id => `objectID:${id}`).join(' OR '))
          }&hitsPerPage=${replyIds.length}`
        );

        if (repliesResponse.ok) {
          repliesData = await repliesResponse.json();
          // Transform the replies to include parent_id
          repliesData.hits = repliesData.hits.map(reply => ({
            ...reply,
            parent_id: reply.parent_id || reply.story_id // Algolia might use a different field name
          }));
        }
      }

      // Get the new replies data to check unread status
      const newReplies = JSON.parse(localStorage.getItem('hn-new-replies') || '{}') as Record<string, NewReply[]>;

      // Create a map of parent IDs to replies
      const replyMap = repliesData.hits.reduce((map, reply) => {
        const parentId = reply.parent_id || reply.parent || reply.story_id;
        if (!map[parentId]) {
          map[parentId] = [];
        }
        map[parentId].push(reply);
        return map;
      }, {});

      // Then use the map when processing comments
      const processedComments = data.hits.map((comment: AlgoliaHit) => {
        const commentReplies = (replyMap[comment.objectID] || [])
          .map(reply => ({
            id: reply.objectID,
            text: reply.comment_text || '',
            author: reply.author,
            created_at: safeDate(reply.created_at_i),
            seen: !newReplies[comment.objectID]?.find(r => r.id === reply.objectID)?.seen,
            parent_id: comment.objectID,
            story_id: reply.story_id,
            story_title: reply.story_title
          }));

        return {
          id: comment.objectID,
          comment_text: comment.comment_text || '',
          author: comment.author,
          created_at: safeDate(comment.created_at_i),
          story_id: comment.story_id || '',
          story_title: comment.story_title || '',
          story_url: comment.url,
          objectID: comment.objectID,
          points: comment.points,
          parent_id: comment.parent_id,
          replies: commentReplies,
          hasUnread: commentReplies.some(reply => 
            newReplies[comment.objectID]?.find(r => r.id === reply.id && !r.seen)
          ),
          isUserComment: true
        };
      });

      setComments(processedComments);

      // Calculate total unread count from newReplies
      const totalUnread = Object.values(newReplies)
        .reduce((count, replies) => 
          count + replies.filter(r => !r.seen).length, 
        0);
      setUnreadCount(totalUnread);

    } catch (error) {
      console.error('Error fetching profile data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load profile data');
    } finally {
      setTabLoading('profile', false);
    }
  }, [username, activeTab]);

  // Update the useEffect to use this function
  useEffect(() => {
    if (activeTab === 'profile' && username) {
      fetchProfileData();
    }
  }, [activeTab, username, fetchProfileData]);

  // Helper function for time filter
  const getTimeFilter = (range: string) => {
    const now = Math.floor(Date.now() / 1000);
    switch (range) {
      case '24h': return `&numericFilters=created_at_i>${now - 86400}`;
      case '7d': return `&numericFilters=created_at_i>${now - 604800}`;
      case '30d': return `&numericFilters=created_at_i>${now - 2592000}`;
      default: return '';
    }
  };

  // Add this effect after the existing effects
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

  // Add this effect to fetch initial feed items when tab changes
  useEffect(() => {
    if (activeTab === 'feed') {
      console.log('Feed tab activated, following:', following); // Debug
      fetchFeedItems(0);
    }
  }, [activeTab, fetchFeedItems]);

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

  // Update the service worker effect
  useEffect(() => {
    if (!username || activeTab !== 'profile') return;

    let isSubscribed = true;

    const messageHandler = (event: MessageEvent<{
      type: string;
      data: MessageHandlerData;
    }>) => {
      if (!isSubscribed) return;
      
      if (event.data.type === 'updateCommentTracker') {
        const { trackerData: newTrackerData, newReplies, isFirstLoad } = event.data.data;
        
        if (isSubscribed) {
          setTrackerData(newTrackerData);

          if (!isFirstLoad) {
            const existingNewReplies = getLocalStorageData('hn-new-replies', {}) as Record<string, NewReply[]>;
            const mergedNewReplies = { ...existingNewReplies };
            
            Object.entries(newReplies).forEach(([commentId, replies]) => {
              if (!mergedNewReplies[commentId]) {
                mergedNewReplies[commentId] = [];
              }
              
              const existingIds = new Set(mergedNewReplies[commentId].map(r => r.id));
              const uniqueNewReplies = replies.map(reply => ({
                ...reply,
                created_at: safeDate(reply.created_at || Date.now())
              })).filter(reply => !existingIds.has(reply.id));
              
              mergedNewReplies[commentId] = [
                ...mergedNewReplies[commentId],
                ...uniqueNewReplies
              ];
            });

            localStorage.setItem('hn-new-replies', JSON.stringify(mergedNewReplies));
            
            const totalUnreadCount = Object.values(mergedNewReplies)
              .reduce((count, replies) => 
                count + replies.filter((r: NewReply) => !r.seen).length, 
            0
          );
            
            localStorage.setItem('hn-unread-count', totalUnreadCount.toString());
            setUnreadCount(totalUnreadCount);
          }
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', messageHandler);
      
      // Start tracking
      navigator.serviceWorker.ready.then(registration => {
        if (isSubscribed && registration.active) {
          registration.active.postMessage({
            type: 'startTracking',
            username
          });
        }
      });
    }

    return () => {
      isSubscribed = false;
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      }
    };
  }, [username, activeTab]);

  // Update the tab change effect
  useEffect(() => {
    // Only abort previous requests when switching away from feed tab
    if (activeTab !== 'feed') {
      abortControllerRef.current?.abort();
    }

    setError(null);
    setLoading(true);

    const loadTabData = async () => {
      try {
        switch (activeTab) {
          case 'feed':
            setFeedItems([]);
            setPage(0);
            await fetchFeedItems(0);
            break;
          
          case 'bookmarks':
            setBookmarks([]);
            setHasMore(false);
            await fetchBookmarks();
            break;
          
          case 'profile':
            setComments([]);
            if (username) {
              await fetchProfileData();
            }
            break;
          
          case 'following':
          case 'tags':
            setLoading(false);
            break;
        }
      } catch (error) {
        console.error('Error loading tab data:', error);
        if (!(error instanceof Error && error.name === 'AbortError')) {
          setError(error instanceof Error ? error.message : 'Failed to load data');
        }
      } finally {
        setLoading(false);
      }
    };

    loadTabData();
  }, [activeTab, username, fetchFeedItems, fetchBookmarks, fetchProfileData]);

  // Update loading handlers
  const setTabLoading = (tab: Tab, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [tab]: isLoading
    }));
  };

  // Update the localStorage access
  const getLocalStorageData = <T,>(key: string, defaultValue: T): T => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error(`Error reading ${key} from localStorage:`, e);
      return defaultValue;
    }
  };

  // Add memoized comment grouping
  const commentGroups = useMemo(() => {
    if (!username) return [];
    
    return comments.reduce<CommentGroup[]>((groups, comment) => {
      const isUserComment = comment.author === username;
      
      if (isUserComment) {
        groups.push({
          originalComment: {
            ...comment,
            isUserComment: true
          },
          replies: comment.replies || [],
          hasUnread: comment.hasUnread
        });
      }
      
      return groups;
    }, []).sort((a, b) => {
      // Sort by unread first, then by date
      if (a.hasUnread && !b.hasUnread) return -1;
      if (!a.hasUnread && b.hasUnread) return 1;
      return new Date(b.originalComment.created_at).getTime() - 
             new Date(a.originalComment.created_at).getTime();
    });
  }, [comments, username]);

  // Add handleMarkAsRead function
  const handleMarkAsRead = (commentId: string) => {
    const newReplies = JSON.parse(localStorage.getItem('hn-new-replies') || '{}') as Record<string, NewReply[]>;
    if (newReplies[commentId]) {
      // Mark all replies for this comment as seen
      newReplies[commentId] = newReplies[commentId].map(reply => ({
        ...reply,
        seen: true
      }));
      
      // Calculate new total unread count
      const totalUnreadCount = Object.values(newReplies)
        .reduce((count: number, replies: NewReply[]) => 
          count + replies.filter(r => !r.seen).length, 
        0);
      
      // Update localStorage and state
      localStorage.setItem('hn-new-replies', JSON.stringify(newReplies));
      localStorage.setItem('hn-unread-count', totalUnreadCount.toString());
      setUnreadCount(totalUnreadCount);
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('unreadCountChange', {
        detail: { unreadCount: totalUnreadCount }
      }));
    }
  };

  return (
    <ErrorBoundary>
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
        <div ref={containerRef} className="h-full overflow-y-auto p-4 pb-20">
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
                  / DASHBOARD
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

          <div className="max-w-3xl mx-auto mb-8">
            <div className="flex items-center gap-4 overflow-x-auto pb-2">
              {TAB_ORDER.map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap hover:opacity-100 ${
                    activeTab === tab 
                      ? theme === 'green' 
                        ? 'text-green-500' 
                        : 'text-[#ff6600]'
                      : 'opacity-50'
                  }`}
                >
                  [{tab.toUpperCase()}]
                </button>
              ))}
            </div>
          </div>

          <div className="max-w-3xl mx-auto">
            {renderTabContent()}
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
          username={username || null}
        />
      </div>
    </ErrorBoundary>
  );
} 