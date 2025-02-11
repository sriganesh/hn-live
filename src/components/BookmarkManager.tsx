import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AUTH_TOKEN_KEY, API_BASE_URL } from '../types/auth';

interface BookmarkEntry {
  id: number;
  type: 'story' | 'comment';
  storyId?: number;  // Only for comments, to link back to parent story
  timestamp: number;
}

interface CloudBookmark {
  id: string;
  user_id: string;
  item_id: string;
  type: 'story' | 'comment';
  story_id: string;
  created_at: string;
}

interface BookmarkManagerProps {
  theme: 'green' | 'og' | 'dog';
}

export function BookmarkManager({ theme }: BookmarkManagerProps) {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const exportBookmarks = () => {
    // Just get the raw bookmarks data from localStorage
    const bookmarks: BookmarkEntry[] = JSON.parse(localStorage.getItem('hn-bookmarks') || '[]');
    
    // Get Unix timestamp for filename
    const timestamp = Math.floor(Date.now() / 1000);

    // Create and download JSON file with timestamp
    const content = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hn.live-bookmarks-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncBookmarks = async () => {
    if (!user) return;

    try {
      setIsSyncing(true);
      setSyncSuccess(false);
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        throw new Error('No auth token found');
      }

      // First, get cloud bookmarks
      const cloudResponse = await fetch(`${API_BASE_URL}/api/bookmarks`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!cloudResponse.ok) {
        const error = await cloudResponse.json();
        throw new Error(error.error || 'Failed to fetch cloud bookmarks');
      }

      const { bookmarks: cloudBookmarks } = await cloudResponse.json() as { bookmarks: CloudBookmark[] };

      // Get local bookmarks
      const localBookmarks: BookmarkEntry[] = JSON.parse(localStorage.getItem('hn-bookmarks') || '[]');

      // Convert cloud bookmarks to local format
      const cloudConverted = cloudBookmarks.map(bookmark => ({
        id: parseInt(bookmark.item_id),
        type: bookmark.type as 'story' | 'comment',
        storyId: parseInt(bookmark.story_id),
        timestamp: new Date(bookmark.created_at).getTime()
      }));

      // Merge local and cloud bookmarks
      // Use a Map to deduplicate by id while keeping the most recent version
      const mergedMap = new Map<number, BookmarkEntry>();
      
      // Add local bookmarks to map
      localBookmarks.forEach(bookmark => {
        mergedMap.set(bookmark.id, bookmark);
      });

      // Add cloud bookmarks to map, keeping the most recent version based on timestamp
      cloudConverted.forEach(bookmark => {
        const existingBookmark = mergedMap.get(bookmark.id);
        if (!existingBookmark || bookmark.timestamp > existingBookmark.timestamp) {
          mergedMap.set(bookmark.id, bookmark);
        }
      });

      // Convert map back to array and sort by timestamp (newest first)
      const mergedBookmarks = Array.from(mergedMap.values())
        .sort((a, b) => b.timestamp - a.timestamp);

      // Update local storage with merged bookmarks
      localStorage.setItem('hn-bookmarks', JSON.stringify(mergedBookmarks));

      // Sync merged bookmarks back to cloud
      const syncRequest = {
        bookmarks: mergedBookmarks.map(bookmark => ({
          item_id: bookmark.id.toString(),
          type: bookmark.type,
          story_id: (bookmark.storyId || bookmark.id).toString(),
          created_at: new Date(bookmark.timestamp).toISOString()
        }))
      };

      // Send sync request
      const syncResponse = await fetch(`${API_BASE_URL}/api/bookmarks/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(syncRequest)
      });

      if (!syncResponse.ok) {
        const error = await syncResponse.json();
        throw new Error(error.error || 'Failed to sync bookmarks');
      }

      console.log('Bookmarks synced successfully');
      setSyncSuccess(true);
      
      // Reset success message after 2 seconds
      setTimeout(() => {
        setSyncSuccess(false);
      }, 2000);
      
      // Dispatch custom event to trigger bookmarks refresh
      window.dispatchEvent(new CustomEvent('bookmarks-synced'));
    } catch (error) {
      console.error('Error syncing bookmarks:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportBookmarks}
        className="opacity-75 hover:opacity-100 transition-opacity"
      >
        [EXPORT]
      </button>
      {user && (
        <button
          onClick={syncBookmarks}
          disabled={isSyncing}
          className={`opacity-75 hover:opacity-100 transition-opacity ${isSyncing ? 'cursor-not-allowed' : ''}`}
        >
          [{isSyncing ? '...' : syncSuccess ? 'SYNCED!' : 'SYNC'}]
        </button>
      )}
    </div>
  );
} 