import { useState, useEffect, useCallback, useRef } from 'react';
import { Following } from '../types/Following';
import { STORAGE_KEYS } from '../config/constants';

export interface FeedFilters {
  type: 'all' | 'stories' | 'comments';
  timeRange: '24h' | '7d' | '30d' | 'all';
  sortBy: 'date' | 'points';
}

export interface FeedItem {
  id: string;
  type: 'story' | 'comment';
  title?: string;
  text?: string;
  by: string;
  time: number;
  url?: string;
  score?: number;
  parent?: string;
}

interface AlgoliaHit {
  objectID: string;
  title?: string;
  story_text?: string;
  comment_text?: string;
  author: string;
  created_at_i: number;
  url?: string;
  points?: number;
  parent_id?: string;
  story_id?: string;
  story_title?: string;
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbPages: number;
  page: number;
  hitsPerPage: number;
}

export function useFeed() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<FeedFilters>({
    type: 'all',
    timeRange: '24h',
    sortBy: 'date'
  });

  // Refs for managing requests and scroll position
  const abortControllerRef = useRef<AbortController>();
  const lastScrollPosition = useRef<number>(0);

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

  // Helper function to get time filter string
  const getTimeFilter = useCallback((range: string): string => {
    const now = Math.floor(Date.now() / 1000);
    switch (range) {
      case '24h': return `&numericFilters=created_at_i>${now - 86400}`;
      case '7d': return `&numericFilters=created_at_i>${now - 604800}`;
      case '30d': return `&numericFilters=created_at_i>${now - 2592000}`;
      default: return '';
    }
  }, []);

  // Fetch feed items
  const fetchFeedItems = useCallback(async (pageNum: number, scrollContainer?: HTMLElement | null) => {
    setLoading(true);
    setError(null);
    
    // Store current scroll position before fetching if not the first page
    if (pageNum > 0 && scrollContainer) {
      lastScrollPosition.current = scrollContainer.scrollTop;
    }

    // Create new AbortController for this request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    try {
      const currentFollowing = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWING) || '[]') as Following[];

      if (!currentFollowing.length) {
        setFeedItems([]);
        setHasMore(false);
        setLoading(false);
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
          if (pageNum > 0 && scrollContainer) {
            requestAnimationFrame(() => {
              if (scrollContainer) {
                scrollContainer.scrollTop = lastScrollPosition.current;
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
      setLoading(false);
    }
  }, [filters, getTimeFilter, handleNetworkError]);

  // Load more items
  const loadMore = useCallback((scrollContainer?: HTMLElement | null) => {
    if (!loading && hasMore) {
      fetchFeedItems(page + 1, scrollContainer);
    }
  }, [fetchFeedItems, hasMore, loading, page]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<FeedFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(0);
    setFeedItems([]);
    setHasMore(true);
  }, []);

  // Effect to fetch items when filters change
  useEffect(() => {
    fetchFeedItems(0);
  }, [filters, fetchFeedItems]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    feedItems,
    loading,
    error,
    hasMore,
    filters,
    updateFilters,
    loadMore,
    refreshFeed: () => fetchFeedItems(0)
  };
} 