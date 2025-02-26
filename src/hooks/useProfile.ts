import { useState, useEffect, useCallback } from 'react';
import { DashboardComment, CommentGroup, NewReply, MessageHandlerData } from '../types/dashboardTypes';

// Helper function for localStorage operations
const getLocalStorageData = <T,>(key: string, defaultValue: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
};

// Helper function to safely handle dates
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

// Types for tracker data
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

interface AlgoliaHit {
  objectID: string;
  comment_text?: string;
  author: string;
  created_at_i: number;
  story_id?: string;
  story_title?: string;
  url?: string;
  points?: number;
  parent_id?: string;
}

export function useProfile(username: string | undefined) {
  const [comments, setComments] = useState<DashboardComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [trackerData, setTrackerData] = useState<TrackerData>({
    lastChecked: 0,
    comments: [],
    lastSeenReplies: {}
  });

  // Function to handle network errors
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

  // Fetch profile data
  const fetchProfileData = useCallback(async () => {
    if (!username) {
      setLoading(false);
      return;
    }

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
      setTrackerData(trackerData);

    } catch (error) {
      console.error('Error fetching profile data:', error);
      handleNetworkError(error, 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [username, handleNetworkError]);

  // Mark all replies as read
  const markAllAsRead = useCallback(() => {
    localStorage.setItem('hn-new-replies', '{}');
    localStorage.setItem('hn-unread-count', '0');
    setUnreadCount(0);
    window.dispatchEvent(new CustomEvent('unreadCountChange', {
      detail: { unreadCount: 0 }
    }));
  }, []);

  // Mark a specific comment's replies as read
  const markAsRead = useCallback((commentId: string) => {
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
  }, []);

  // Group comments by their replies
  const commentGroups = useCallback(() => {
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

  // Set up service worker for comment tracking
  useEffect(() => {
    if (!username) return;

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
              0);
            
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
  }, [username]);

  // Initial fetch
  useEffect(() => {
    if (username) {
      fetchProfileData();
    }
  }, [username, fetchProfileData]);

  return {
    comments,
    loading,
    error,
    unreadCount,
    commentGroups: commentGroups(),
    markAllAsRead,
    markAsRead,
    refreshProfile: fetchProfileData
  };
} 