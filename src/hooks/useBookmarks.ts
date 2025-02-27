import { useState, useEffect, useCallback } from 'react';
import { syncBookmarks } from '../services/bookmarks';
import { AUTH_TOKEN_KEY, API_BASE_URL } from '../types/auth';
import { BookmarkEntry } from '../types/bookmarks';
import { STORAGE_KEYS } from '../config/constants';

interface Bookmark {
  id: number;
  type: 'story' | 'comment';
  title?: string;
  text?: string;
  by?: string;
  time?: number;
  url?: string;
  score?: number;
  storyId?: number;
  story?: {
    id: number;
    title?: string;
    by?: string;
    time?: number;
    url?: string;
  };
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

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

  // Fetch bookmarks from local storage and API
  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get core bookmark data
      const bookmarkEntries: BookmarkEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]');
      
      // Sort by timestamp (newest first)
      bookmarkEntries.sort((a, b) => b.timestamp - a.timestamp);

      // Get or initialize cache
      const bookmarkCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARK_CACHE) || '{}');

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
        localStorage.setItem(STORAGE_KEYS.BOOKMARK_CACHE, JSON.stringify(bookmarkCache));
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
              localStorage.setItem(STORAGE_KEYS.BOOKMARK_CACHE, JSON.stringify(bookmarkCache));
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
    } finally {
      setLoading(false);
    }
  }, [handleNetworkError]);

  // Delete a bookmark
  const deleteBookmark = useCallback(async (bookmarkId: number) => {
    try {
      // First delete locally
      const bookmarkEntries: BookmarkEntry[] = JSON.parse(
        localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]'
      );
      const updatedBookmarks = bookmarkEntries.filter(b => b.id !== bookmarkId);
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updatedBookmarks));

      // Remove from cache
      const bookmarkCache = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARK_CACHE) || '{}');
      delete bookmarkCache[bookmarkId];
      localStorage.setItem(STORAGE_KEYS.BOOKMARK_CACHE, JSON.stringify(bookmarkCache));

      // Update UI
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('bookmarks-updated'));

      // Then delete from cloud if user is logged in
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
      handleNetworkError(error, 'Failed to delete bookmark');
    }
  }, [handleNetworkError]);

  // Sync bookmarks with cloud
  const syncBookmarksWithCloud = useCallback(async () => {
    try {
      await syncBookmarks();
      await fetchBookmarks();
      return true;
    } catch (error) {
      handleNetworkError(error, 'Failed to sync bookmarks');
      return false;
    }
  }, [fetchBookmarks, handleNetworkError]);

  // Listen for bookmark sync events
  useEffect(() => {
    const handleBookmarkSync = () => {
      fetchBookmarks();
    };

    window.addEventListener('bookmarks-synced', handleBookmarkSync);
    window.addEventListener('bookmarks-updated', handleBookmarkSync);
    
    return () => {
      window.removeEventListener('bookmarks-synced', handleBookmarkSync);
      window.removeEventListener('bookmarks-updated', handleBookmarkSync);
    };
  }, [fetchBookmarks]);

  // Initial fetch
  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  return {
    bookmarks,
    loading,
    error,
    hasMore,
    deleteBookmark,
    syncBookmarks: syncBookmarksWithCloud,
    refreshBookmarks: fetchBookmarks
  };
} 