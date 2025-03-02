import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AUTH_TOKEN_KEY, API_BASE_URL } from '../../types/auth';
import { STORAGE_KEYS } from '../../config/constants';

interface BookmarkEntry {
  id: number;
  type: 'story' | 'comment';
  storyId?: number;
  timestamp: number;
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

interface CloudBookmark {
  item_id: string;
  type: 'story' | 'comment';
  story_id: string;
  created_at: string;
}

interface BookmarkButtonProps {
  item: {
    id: number;
    type: 'story' | 'comment';
    title?: string;
    text?: string;
    by: string;
    time: number;
    url?: string;
  };
  storyId?: number;
  storyTitle?: string;
  theme: 'green' | 'og' | 'dog';
  variant?: 'icon' | 'text';
}

export function BookmarkButton({ item, storyId, storyTitle, theme, variant = 'icon' }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const bookmarks: BookmarkEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]');
    setIsBookmarked(bookmarks.some(b => b.id === item.id));
  }, [item.id]);

  const toggleBookmark = async () => {
    const bookmarks: BookmarkEntry[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARKS) || '[]');
    const bookmarkCache: Record<string, HNItem> = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKMARK_CACHE) || '{}');
    
    if (isBookmarked) {
      // Remove from local storage
      const updatedBookmarks = bookmarks.filter(b => b.id !== item.id);
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(updatedBookmarks));
      
      // Remove from cache
      delete bookmarkCache[item.id];
      localStorage.setItem(STORAGE_KEYS.BOOKMARK_CACHE, JSON.stringify(bookmarkCache));
      
      setIsBookmarked(false);

      // If user is logged in, remove from cloud
      if (user) {
        try {
          const token = localStorage.getItem(AUTH_TOKEN_KEY);
          if (!token) return;

          // Try to delete - backend will handle if it doesn't exist
          const deleteResponse = await fetch(`${API_BASE_URL}/api/bookmarks/item/${item.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
            }
          });

          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            console.error('Failed to remove bookmark from cloud');
          }
        } catch (error) {
          console.error('Error removing bookmark from cloud:', error);
        }
      }
    } else {
      // Add to local storage
      const newBookmark: BookmarkEntry = {
        id: item.id,
        type: item.type,
        storyId: item.type === 'comment' ? storyId : undefined,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify([...bookmarks, newBookmark]));

      // Add to cache
      bookmarkCache[item.id] = item;
      localStorage.setItem(STORAGE_KEYS.BOOKMARK_CACHE, JSON.stringify(bookmarkCache));
      
      setIsBookmarked(true);

      // If user is logged in, add to cloud
      if (user) {
        try {
          const token = localStorage.getItem(AUTH_TOKEN_KEY);
          if (!token) return;

          // Try to add - backend will handle if it already exists
          const addResponse = await fetch(`${API_BASE_URL}/api/bookmarks`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              item_id: item.id.toString(),
              type: item.type,
              story_id: (item.type === 'comment' && storyId ? storyId : item.id).toString()
            })
          });

          if (!addResponse.ok && addResponse.status !== 409) {
            console.error('Failed to add bookmark to cloud');
          }
        } catch (error) {
          console.error('Error adding bookmark to cloud:', error);
        }
      }
    }
  };

  if (variant === 'text') {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleBookmark();
        }}
        className={`hover:underline ${
          isBookmarked 
            ? theme === 'green'
              ? 'text-green-500'
              : 'text-[#ff6600]'
            : ''
        }`}
        title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      >
        {isBookmarked ? 'unbookmark' : 'bookmark'}
      </button>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleBookmark();
      }}
      className="hover:opacity-75 transition-opacity flex items-center"
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      {isBookmarked ? (
        <svg 
          className="w-5 h-5" 
          fill="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            d="M7.833 2c-.507 0-.98.216-1.318.576A1.92 1.92 0 0 0 6 3.89V21a1 1 0 0 0 1.625.78L12 18.28l4.375 3.5A1 1 0 0 0 18 21V3.889c0-.481-.178-.954-.515-1.313A1.808 1.808 0 0 0 16.167 2H7.833Z"
          />
        </svg>
      ) : (
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            stroke="currentColor" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="m17 21-5-4-5 4V3.889a.92.92 0 0 1 .244-.629.808.808 0 0 1 .59-.26h8.333a.81.81 0 0 1 .589.26.92.92 0 0 1 .244.63V21Z"
          />
        </svg>
      )}
    </button>
  );
} 