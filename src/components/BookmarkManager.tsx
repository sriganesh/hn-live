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

  // Get theme-specific styles
  const getThemeStyles = () => {
    switch (theme) {
      case 'green':
        return {
          text: 'text-green-400',
          accent: 'text-green-500',
          buttonText: 'opacity-75 hover:opacity-100 text-green-400 hover:text-green-300'
        };
      case 'og':
        return {
          text: 'text-[#111]',
          accent: 'text-[#111]',
          buttonText: 'opacity-75 hover:opacity-100 text-[#111]'
        };
      case 'dog':
        return {
          text: 'text-[#c9d1d9]',
          accent: 'text-[#c9d1d9]',
          buttonText: 'opacity-75 hover:opacity-100 text-[#c9d1d9] hover:text-white'
        };
      default:
        return {
          text: 'text-green-400',
          accent: 'text-green-500',
          buttonText: 'opacity-75 hover:opacity-100 text-green-400 hover:text-green-300'
        };
    }
  };

  const themeStyles = getThemeStyles();

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
        className={themeStyles.buttonText}
      >
        [EXPORT]
      </button>
      {user && (
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`${themeStyles.buttonText} ${isSyncing ? 'cursor-not-allowed' : ''}`}
        >
          [{isSyncing ? '...' : syncSuccess ? 'SYNCED!' : 'SYNC'}]
        </button>
      )}
    </div>
  );
} 