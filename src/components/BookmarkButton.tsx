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
    type?: 'story' | 'comment';
    title?: string;
    text?: string;
    by: string;
    time: number;
    url?: string;
  };
  theme: 'green' | 'og' | 'dog';
  storyId?: number;
  storyTitle?: string;
}

export function BookmarkButton({ item, storyId, theme, variant = 'icon' }: BookmarkButtonProps) {
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