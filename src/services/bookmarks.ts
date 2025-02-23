import { AUTH_TOKEN_KEY, API_BASE_URL } from '../types/auth';

interface BookmarkEntry {
  id: number;
  type: 'story' | 'comment';
  storyId?: number;
  timestamp: number;
}

interface CloudBookmark {
  item_id: string;
  type: 'story' | 'comment';
  story_id: string;
  created_at: string;
}

export async function syncBookmarks() {
  try {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
      throw new Error('No auth token found');
    }

    // Fetch cloud bookmarks
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

    // Merge bookmarks
    const mergedMap = new Map<number, BookmarkEntry>();
    
    localBookmarks.forEach(bookmark => {
      mergedMap.set(bookmark.id, bookmark);
    });

    cloudConverted.forEach(bookmark => {
      const existingBookmark = mergedMap.get(bookmark.id);
      if (!existingBookmark || bookmark.timestamp > existingBookmark.timestamp) {
        mergedMap.set(bookmark.id, bookmark);
      }
    });

    const mergedBookmarks = Array.from(mergedMap.values())
      .sort((a, b) => b.timestamp - a.timestamp);

    // Update local storage
    localStorage.setItem('hn-bookmarks', JSON.stringify(mergedBookmarks));

    // Sync back to cloud
    const syncRequest = {
      bookmarks: mergedBookmarks.map(bookmark => ({
        item_id: bookmark.id.toString(),
        type: bookmark.type,
        story_id: (bookmark.storyId || bookmark.id).toString(),
        created_at: new Date(bookmark.timestamp).toISOString()
      }))
    };

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

    // Dispatch event to notify components
    window.dispatchEvent(new CustomEvent('bookmarks-synced'));
    
    return true;
  } catch (error) {
    console.error('Error syncing bookmarks:', error);
    return false;
  }
} 