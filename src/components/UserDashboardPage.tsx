import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { Following } from '../types/Following';
import { UserTag } from '../types/UserTag';
import { MobileBottomBar } from './MobileBottomBar';
import { FeedTabContent } from './tabs/FeedTabContent';
import { ProfileTabContent } from './tabs/ProfileTabContent';
import { BookmarksTabContent } from './tabs/BookmarksTabContent';
import { HistoryTabContent } from './tabs/HistoryTabContent';
import { BookmarkEntry } from '../types/bookmarks';
import { 
  DashboardComment, 
  AlgoliaResponse, 
  AlgoliaHit, 
  FeedFilters,
  NewReply,
  MessageHandlerData,
  FeedItem,
  Bookmark,
  CommentGroup
} from '../types/dashboardTypes';
import { ErrorBoundary } from './ErrorBoundary';
import { syncFollowing } from '../services/following';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../types/auth';

type FontOption = 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';
type Tab = 'profile' | 'bookmarks' | 'feed' | 'following' | 'tags' | 'history';

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

// Add proper types for tracker data
interface TrackerComment {
  id: string;
  replyIds: string[];
  timestamp: number;
}

interface TrackerData {
  lastChecked: number;
  comments: TrackerComment[];
  lastSeenReplies: Record<string, string[]>;
}

interface AlgoliaReply {
  objectID: string;
  comment_text?: string;
  author: string;
  created_at_i: number;
  parent_id?: string;
  story_id?: string;
  parent?: string;
  story_title?: string;
}

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
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('tab') as Tab) || 'profile';
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const [following, setFollowing] = useState<Following[]>(() => {
    try {
      const savedFollowing = localStorage.getItem('hn-following');
      // Sort by timestamp, most recent first
      const followingData = savedFollowing ? JSON.parse(savedFollowing) : [];
      return followingData.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error loading following data:', error);
      return [];
    }
  });
  const [userTags, setUserTags] = useState<UserTag[]>(() => {
    return JSON.parse(localStorage.getItem('hn-user-tags') || '[]');
  });
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

  // Add state for sync status
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');

  const TAB_ORDER: Tab[] = ['profile', 'bookmarks', 'feed', 'following', 'tags', 'history'];

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

  const handleUnfollow = async (userId: string) => {
    try {
      // Update local storage first
      const updatedFollowing = following.filter(f => f.userId !== userId);
      localStorage.setItem('hn-following', JSON.stringify(updatedFollowing));
      setFollowing(updatedFollowing);
      
      // If authenticated, remove from cloud
      if (isAuthenticated) {
        const token = localStorage.getItem('hnlive_token');
        if (token) {
          await fetch(`${API_BASE_URL}/api/following/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        }
      }

      // Update feed if no following left
      if (updatedFollowing.length === 0) {
        setFeedItems([]);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error unfollowing user:', error);
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

  // Add scroll position tracking ref at the top with other refs
  const lastScrollPosition = useRef<number>(0);
  const abortControllerRef = useRef<AbortController>();

  // Modify the fetchFeedItems function where we update the state
  const fetchFeedItems = useCallback(async (pageNum: number) => {
    setTabLoading('feed', true);
    console.log('Fetching feed items, page:', pageNum);
    
    // Store current scroll position before fetching if not the first page
    if (pageNum > 0 && containerRef.current) {
      lastScrollPosition.current = containerRef.current.scrollTop;
    }

    // Create new AbortController for this request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    try {
      const currentFollowing = JSON.parse(localStorage.getItem('hn-following') || '[]') as Following[];
      console.log('Current following users:', currentFollowing);

      if (!currentFollowing.length) {
        console.log('No followed users found');
        setFeedItems([]);
        setHasMore(false);
        setTabLoading('feed', false);
        return;
      }

      const authorQuery = currentFollowing.map(f => `author_${f.userId}`).join(',');
      let storiesData: AlgoliaResponse = { hits: [], nbPages: 0, page: 0, hitsPerPage: 20 };
      let commentsData: AlgoliaResponse = { hits: [], nbPages: 0, page: 0, hitsPerPage: 20 };
      
      // Separate API calls based on filter type
      if (filters.type === 'stories' || filters.type === 'all') {
        const storiesRes = await fetch(
          `https://hn.algolia.com/api/v1/search_by_date?tags=story,(${authorQuery})${getTimeFilter(filters.timeRange)}&page=${pageNum}`,
          { signal: abortControllerRef.current.signal }
        );
        if (!storiesRes.ok) throw new Error('Failed to fetch stories');
        storiesData = await storiesRes.json();
      }

      if (filters.type === 'comments' || filters.type === 'all') {
        const commentsRes = await fetch(
          `https://hn.algolia.com/api/v1/search_by_date?tags=comment,(${authorQuery})${getTimeFilter(filters.timeRange)}&page=${pageNum}`,
          { signal: abortControllerRef.current.signal }
        );
        if (!commentsRes.ok) throw new Error('Failed to fetch comments');
        commentsData = await commentsRes.json();
      }

      // Only update state if the request wasn't aborted
      if (!abortControllerRef.current.signal.aborted) {
        // Process and combine the items
        const newItems: FeedItem[] = [
          ...storiesData.hits.map((item: AlgoliaHit) => ({
            id: item.objectID,
            type: 'story' as const,
            title: item.title || '',
            url: item.url,
            by: item.author,
            time: item.created_at_i,
            score: item.points || 0,
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

        // Sort items
        if (filters.sortBy === 'date') {
          newItems.sort((a, b) => b.time - a.time);
        } else if (filters.sortBy === 'points') {
          newItems.sort((a, b) => {
            const pointsA = a.type === 'story' ? a.score || 0 : 0;
            const pointsB = b.type === 'story' ? b.score || 0 : 0;
            return pointsB - pointsA;
          });
        }

        // Update state and restore scroll position
        setFeedItems(prev => {
          const updatedItems = pageNum === 0 ? newItems : [...prev, ...newItems];
          
          // Restore scroll position after state update, but only for pagination
          if (pageNum > 0) {
            requestAnimationFrame(() => {
              if (containerRef.current) {
                containerRef.current.scrollTop = lastScrollPosition.current;
              }
            });
          }
          
          return updatedItems;
        });

        setHasMore(pageNum < Math.max(storiesData.nbPages, commentsData.nbPages) - 1);
        setPage(pageNum);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('Request aborted');
          return;
        }
        handleNetworkError(error, 'Failed to load feed items');
      }
    } finally {
      setTabLoading('feed', false);
    }
  }, [filters, handleNetworkError]);

  // Add time filter helper
  const getTimeFilter = (range: string): string => {
    const now = Math.floor(Date.now() / 1000);
    switch (range) {
      case '24h': return `&numericFilters=created_at_i>${now - 86400}`;
      case '7d': return `&numericFilters=created_at_i>${now - 604800}`;
      case '30d': return `&numericFilters=created_at_i>${now - 2592000}`;
      default: return '';
    }
  };

  // Add auto-refresh effect after existing effects
  useEffect(() => {
    if (!isRunning || activeTab !== 'feed') return;
    
    const interval = setInterval(() => {
      if (activeTab === 'feed') {
        fetchFeedItems(0);
      }
    }, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [isRunning, activeTab, fetchFeedItems]);

  // Update the fetchProfileData function with proper types
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
      const trackerData = getLocalStorageData<TrackerData>('hn-comment-tracker', { 
        lastChecked: 0,
        comments: [],
        lastSeenReplies: {}
      });

      // Get ALL reply IDs from tracker
      const replyIds = trackerData.comments
        .filter(comment => commentIds.includes(comment.id))
        .reduce<string[]>((ids, comment) => [...ids, ...comment.replyIds], []);

      // Fetch ALL replies
      let repliesData: { hits: AlgoliaReply[] } = { hits: [] };
      if (replyIds.length > 0) {
        const repliesResponse = await fetch(
          `https://hn.algolia.com/api/v1/search_by_date?tags=comment&numericFilters=created_at_i>0&filters=${
            encodeURIComponent(replyIds.map(id => `objectID:${id}`).join(' OR '))
          }&hitsPerPage=${replyIds.length}`
        );

        if (repliesResponse.ok) {
          repliesData = await repliesResponse.json();
        }
      }

      // Get the new replies data to check unread status
      const newReplies = JSON.parse(localStorage.getItem('hn-new-replies') || '{}') as Record<string, NewReply[]>;

      // Create a map of parent IDs to replies
      const replyMap: Record<string, AlgoliaReply[]> = repliesData.hits.reduce((map, reply) => {
        const parentId = reply.parent_id || reply.parent || reply.story_id || '';
        if (!map[parentId]) {
          map[parentId] = [];
        }
        map[parentId].push(reply);
        return map;
      }, {} as Record<string, AlgoliaReply[]>);

      // Then use the map when processing comments
      const processedComments = data.hits.map((comment: AlgoliaHit) => {
        const commentReplies = (replyMap[comment.objectID] || [])
          .map((reply: AlgoliaReply) => ({
            id: reply.objectID,
            text: reply.comment_text || '',
            author: reply.author,
            created_at: safeDate(reply.created_at_i),
            seen: !newReplies[comment.objectID]?.find((r: NewReply) => r.id === reply.objectID)?.seen,
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
            newReplies[comment.objectID]?.find((r: NewReply) => r.id === reply.id && !r.seen)
          ),
          isUserComment: true
        };
      });

      // Filter out comments without replies
      const commentsWithReplies = processedComments.filter((comment: DashboardComment) => 
        comment.replies && comment.replies.length > 0
      );

      setComments(commentsWithReplies);

      // Calculate total unread count from newReplies
      const totalUnread = Object.values(newReplies)
        .reduce((count, replies) => 
          count + replies.filter((r: NewReply) => !r.seen).length, 
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

  // Update the infinite scroll effect
  useEffect(() => {
    if (!hasMore || loadingStates.feed || activeTab !== 'feed') return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Check if the loading element is visible and we're not already loading
        if (entries[0].isIntersecting && !loadingStates.feed) {
          console.log('Loading more items, current page:', page); // Debug
          fetchFeedItems(page + 1);
        }
      },
      { threshold: 0.1 }
    );

    const loadingElement = loadingRef.current;
    if (loadingElement) {
      observer.observe(loadingElement);
    }

    return () => {
      if (loadingElement) {
        observer.disconnect();
      }
    };
  }, [hasMore, loadingStates.feed, page, activeTab, fetchFeedItems]);

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

  // Move fetchBookmarks before the useEffect that uses it
  const fetchBookmarks = useCallback(async () => {
    try {
      // Get core bookmark data
      const bookmarkEntries: BookmarkEntry[] = JSON.parse(localStorage.getItem('hn-bookmarks') || '[]');
      
      // Sort by timestamp (newest first)
      bookmarkEntries.sort((a, b) => b.timestamp - a.timestamp);

      // Get or initialize cache
      let bookmarkCache = JSON.parse(localStorage.getItem('hn-bookmark-cache') || '{}');

      // Fetch items not in cache
      const itemsToFetch = bookmarkEntries.filter(b => !bookmarkCache[b.id]);
      
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
          if (item) {
            bookmarkCache[item.id] = item;
          }
        });
        
        // Save updated cache
        localStorage.setItem('hn-bookmark-cache', JSON.stringify(bookmarkCache));
      }

      // For comments, fetch their parent stories if not in cache
      const itemsWithStories = await Promise.all(
        bookmarkEntries.map(async (entry) => {
          const item = bookmarkCache[entry.id];
          if (item && entry.type === 'comment' && entry.storyId) {
            if (!bookmarkCache[entry.storyId]) {
              const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${entry.storyId}.json`);
              const story = await storyResponse.json();
              bookmarkCache[entry.storyId] = story;
              localStorage.setItem('hn-bookmark-cache', JSON.stringify(bookmarkCache));
              return { ...item, story };
            }
            return { ...item, story: bookmarkCache[entry.storyId] };
          }
          return item;
        })
      );

      setBookmarks(itemsWithStories.filter(Boolean));
      setHasMore(false); // For now, no pagination in bookmarks
    } catch (error) {
      handleNetworkError(error, 'Failed to load bookmarks');
    }
  }, [handleNetworkError]);

  // Update the useEffect that handles tab changes
  useEffect(() => {
    const loadTabData = () => {
      if (activeTab === 'feed') {
        fetchFeedItems(0);
      } else if (activeTab === 'bookmarks') {
        fetchBookmarks();
      } else if (activeTab === 'profile' && username) {
        fetchProfileData();
      } else if (activeTab === 'tags') {
        // Update tags from localStorage
        const savedTags = JSON.parse(localStorage.getItem('hn-user-tags') || '[]');
        setUserTags(savedTags);
      } else if (activeTab === 'history') {
        // Fetch history data
        // Implementation needed
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

  // Add these functions before renderTabContent
  const handleExportFollowing = () => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const content = JSON.stringify(following, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `hn.live-following-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      handleNetworkError(error, 'Failed to export following data');
    }
  };

  const handleExportTags = () => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const content = JSON.stringify(userTags, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `hn.live-tags-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      handleNetworkError(error, 'Failed to export tags data');
    }
  };

  // Add this function before the return statement
  const renderTabContent = () => {
    switch (activeTab) {
      case 'feed':
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

      case 'bookmarks':
        return (
          <BookmarksTabContent
            theme={theme}
            bookmarks={bookmarks}
            loading={loadingStates.bookmarks}
            hasMore={hasMore}
            loadingRef={loadingRef}
            onDeleteBookmark={handleDeleteBookmark}
            navigate={navigate}
          />
        );

      case 'profile':
        return (
          <ProfileTabContent
            theme={theme}
            hnUsername={username || null}
            onShowSettings={onShowSettings}
            onUpdateHnUsername={onUpdateHnUsername}
            comments={comments}
            loading={loadingStates.profile}
            unreadCount={unreadCount}
            onMarkAllAsRead={handleMarkAllAsRead}
            onUserClick={onUserClick}
            commentGroups={commentGroups}
            handleMarkAsRead={handleMarkAsRead}
          />
        );

      case 'following':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="opacity-75">
                {following.length} followed user{following.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-4">
                {following.length > 0 && (
                  <button
                    onClick={handleExportFollowing}
                    className="opacity-75 hover:opacity-100"
                  >
                    [EXPORT]
                  </button>
                )}
                {isAuthenticated && (
                  <button
                    onClick={handleSync}
                    className="opacity-75 hover:opacity-100"
                  >
                    {syncStatus === 'syncing' ? '[SYNCING...]' :
                     syncStatus === 'success' ? '[SYNCED!]' :
                     '[SYNC]'}
                  </button>
                )}
              </div>
            </div>

            <div className="text-sm opacity-75">
              Note: Following data is stored locally. Use [EXPORT] to save them, or create an HN Live account for automatic cloud sync.
            </div>

            {following.length === 0 && (
              <div className="text-center py-8 opacity-75">
                <div>No followed users yet. Click on usernames to follow users.</div>
                <div className="mt-2 text-sm">
                  Following users lets you see their stories and comments in your personalized feed.
                </div>
              </div>
            )}

            {following.map(follow => (
              <div 
                key={follow.userId}
                className={`p-4 rounded ${
                  theme === 'green' 
                    ? 'bg-green-500/5'
                    : theme === 'og'
                    ? 'bg-[#f6f6ef]'
                    : 'bg-[#828282]/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => onUserClick(follow.userId)}
                    className={`${
                      theme === 'green'
                        ? 'text-green-500'
                        : 'text-[#ff6600]'
                    } hover:opacity-75`}
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
            ))}
          </div>
        );

      case 'tags':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="opacity-75">
                {userTags.length} tagged user{userTags.length !== 1 ? 's' : ''}
              </div>
              {userTags.length > 0 && (
                <button
                  onClick={handleExportTags}
                  className="opacity-75 hover:opacity-100"
                >
                  [EXPORT]
                </button>
              )}
            </div>

            <div className="text-sm opacity-75">
              Note: Tags are stored locally. Use [EXPORT] to save them.
            </div>

            {userTags.length === 0 ? (
              <div className="text-center py-8 opacity-75">
                <div>No tagged users yet. Click on usernames to add tags.</div>
                <div className="mt-2 text-sm">
                  Tagging users helps you organize and remember users.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {userTags.map(tag => (
                  <div key={tag.userId} className="space-y-2">
                    <button
                      onClick={() => onUserClick(tag.userId)}
                      className={`${
                        theme === 'green'
                          ? 'text-green-500'
                          : 'text-[#ff6600]'
                      } hover:opacity-75`}
                    >
                      {tag.userId}
                    </button>
                    <div className="flex flex-wrap gap-2">
                      {tag.tags.map(tagName => (
                        <span
                          key={tagName}
                          className="
                            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm
                            bg-[#828282]/10 border border-[#828282]/30
                          "
                        >
                          {tagName}
                          <button
                            onClick={() => handleRemoveTag(tag.userId, tagName)}
                            className="opacity-75 hover:opacity-100 ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'history':
        return (
          <HistoryTabContent
            theme={theme}
            navigate={navigate}
          />
        );

      default:
        return null;
    }
  };

  // Add effect to handle bookmark sync events
  useEffect(() => {
    const handleBookmarkSync = () => {
      if (activeTab === 'bookmarks') {
        // Store current scroll position
        const currentScrollTop = containerRef.current?.scrollTop || 0;
        
        // Reset states and fetch fresh data
        setLoadingStates(prev => ({ ...prev, bookmarks: true }));
        setPage(0);
        setHasMore(true);
        setBookmarks([]);
        
        // Refetch bookmarks
        fetchBookmarks().finally(() => {
          setLoadingStates(prev => ({ ...prev, bookmarks: false }));
          
          // Restore scroll position
          if (currentScrollTop > 0) {
            requestAnimationFrame(() => {
              if (containerRef.current) {
                containerRef.current.scrollTop = currentScrollTop;
              }
            });
          }
        });
      }
    };

    window.addEventListener('bookmarks-synced', handleBookmarkSync);
    return () => window.removeEventListener('bookmarks-synced', handleBookmarkSync);
  }, [activeTab, fetchBookmarks]);

  // Add effect to handle tag updates
  useEffect(() => {
    const handleTagsUpdate = () => {
      // Update tags from localStorage
      const savedTags = JSON.parse(localStorage.getItem('hn-user-tags') || '[]');
      setUserTags(savedTags);
    };

    window.addEventListener('tags-updated', handleTagsUpdate);
    return () => window.removeEventListener('tags-updated', handleTagsUpdate);
  }, []);

  // Add function to handle tab changes
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    // Update URL without reloading
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  // Add a function to fetch following data
  const fetchFollowing = useCallback(() => {
    try {
      const savedFollowing = localStorage.getItem('hn-following');
      const followingData = savedFollowing ? JSON.parse(savedFollowing) : [];
      // Sort by timestamp, most recent first
      const sortedFollowing = followingData.sort((a: Following, b: Following) => 
        b.timestamp - a.timestamp
      );
      setFollowing(sortedFollowing);
    } catch (error) {
      console.error('Error loading following data:', error);
    }
  }, []);

  // Update handleSync function
  const handleSync = async () => {
    if (!isAuthenticated) return;
    
    try {
      setSyncStatus('syncing');
      await syncFollowing();
      // Dispatch sync event
      window.dispatchEvent(new Event('following-synced'));
      // Refresh following data after sync
      fetchFollowing();
      // Show success status
      setSyncStatus('success');
      // Reset status after delay
      setTimeout(() => setSyncStatus('idle'), 2000);
    } catch (error) {
      console.error('Error syncing following:', error);
      setSyncStatus('idle');
    }
  };

  // Add event listener for sync events
  useEffect(() => {
    const handleFollowingSync = () => {
      if (activeTab === 'following') {
        // Store current scroll position
        const currentScrollTop = containerRef.current?.scrollTop || 0;
        
        // Refresh data
        fetchFollowing();
        
        // Restore scroll position
        if (currentScrollTop > 0) {
          requestAnimationFrame(() => {
            if (containerRef.current) {
              containerRef.current.scrollTop = currentScrollTop;
            }
          });
        }
      }
    };

    window.addEventListener('following-synced', handleFollowingSync);
    return () => window.removeEventListener('following-synced', handleFollowingSync);
  }, [activeTab, fetchFollowing]);

  // Add effect to refresh following list when tab changes
  useEffect(() => {
    if (activeTab === 'following') {
      // Fetch latest following data when switching to following tab
      fetchFollowing();
    }
  }, [activeTab, fetchFollowing]);

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
              
              {/* Add Settings button for desktop only */}
              <div className="flex items-center gap-4">
                <button 
                  onClick={onShowSettings}
                  className="hidden sm:block opacity-75 hover:opacity-100"
                >
                  [SETTINGS]
                </button>
                <button 
                  onClick={() => navigate(-1)}
                  className="opacity-75 hover:opacity-100"
                >
                  [ESC]
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-3xl mx-auto mb-8">
            <div className="flex items-center gap-4 overflow-x-auto pb-2">
              {TAB_ORDER.map(tab => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
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