import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { syncBookmarks } from '../services/bookmarks';

interface BookmarkEntry {
  id: number;
  type: 'story' | 'comment';
  storyId?: number;  // Only for comments, to link back to parent story
  timestamp: number;
}

interface CloudBookmark {
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

  const handleSync = async () => {
    if (!user) return;

    try {
      setIsSyncing(true);
      setSyncSuccess(false);
      
      await syncBookmarks();
      
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 2000);
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
          onClick={handleSync}
          disabled={isSyncing}
          className={`opacity-75 hover:opacity-100 transition-opacity ${isSyncing ? 'cursor-not-allowed' : ''}`}
        >
          [{isSyncing ? '...' : syncSuccess ? 'SYNCED!' : 'SYNC'}]
        </button>
      )}
    </div>
  );
} 