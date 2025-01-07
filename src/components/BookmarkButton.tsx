import { useState, useEffect } from 'react';

interface BookmarkEntry {
  id: number;
  type: 'story' | 'comment';
  storyId?: number;
  timestamp: number;
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

  useEffect(() => {
    const bookmarks: BookmarkEntry[] = JSON.parse(localStorage.getItem('hn-bookmarks') || '[]');
    setIsBookmarked(bookmarks.some(b => b.id === item.id));
  }, [item.id]);

  const toggleBookmark = () => {
    const bookmarks: BookmarkEntry[] = JSON.parse(localStorage.getItem('hn-bookmarks') || '[]');
    
    if (isBookmarked) {
      const updatedBookmarks = bookmarks.filter(b => b.id !== item.id);
      localStorage.setItem('hn-bookmarks', JSON.stringify(updatedBookmarks));
      setIsBookmarked(false);
    } else {
      const newBookmark: BookmarkEntry = {
        id: item.id,
        type: item.type,
        storyId: item.type === 'comment' ? storyId : undefined,
        timestamp: Date.now()
      };
      localStorage.setItem('hn-bookmarks', JSON.stringify([...bookmarks, newBookmark]));
      setIsBookmarked(true);
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
      className={`hover:opacity-75 transition-opacity ${
        isBookmarked 
          ? theme === 'green'
            ? 'text-green-500'
            : 'text-[#ff6600]'
          : 'opacity-50'
      }`}
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      {isBookmarked ? '[★]' : '[☆]'}
    </button>
  );
} 