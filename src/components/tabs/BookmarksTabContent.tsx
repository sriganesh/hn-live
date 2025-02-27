import React from 'react';
import { useNavigate, NavigateFunction } from 'react-router-dom';
import { BookmarkManager } from '../BookmarkManager';
import { addToHistory } from '../../services/history';
import { useBookmarks } from '../../hooks/useBookmarks';

export interface BookmarksTabContentProps {
  theme: 'green' | 'og' | 'dog';
  onDeleteBookmark: (id: number) => void;
  navigate: NavigateFunction;
  onUserClick?: (username: string) => void;
}

export function BookmarksTabContent({
  theme,
  onDeleteBookmark,
  navigate,
  onUserClick
}: BookmarksTabContentProps) {
  const { 
    bookmarks, 
    loading, 
    error, 
    hasMore, 
    deleteBookmark 
  } = useBookmarks();

  // Create a ref for infinite scrolling if needed in the future
  const loadingRef = React.useRef<HTMLDivElement>(null);

  // Get theme-specific styles
  const getThemeStyles = () => {
    switch (theme) {
      case 'green':
        return {
          text: 'text-green-400',
          accent: 'text-green-500',
          link: 'text-green-500 hover:text-green-400',
          itemBg: 'bg-green-500/5',
          error: 'text-red-500'
        };
      case 'og':
        return {
          text: 'text-[#111]',
          accent: 'text-[#111]',
          link: 'text-[#111] hover:text-[#111]/80 font-medium',
          itemBg: 'bg-[#f6f6ef]',
          error: 'text-red-500'
        };
      case 'dog':
        return {
          text: 'text-[#c9d1d9]',
          accent: 'text-[#c9d1d9]',
          link: 'text-[#c9d1d9] hover:text-white font-medium',
          itemBg: 'bg-[#828282]/5',
          error: 'text-red-500'
        };
      default:
        return {
          text: 'text-green-400',
          accent: 'text-green-500',
          link: 'text-green-500 hover:text-green-400',
          itemBg: 'bg-green-500/5',
          error: 'text-red-500'
        };
    }
  };

  const themeStyles = getThemeStyles();

  // Add a username click handler
  const handleUsernameClick = (username: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (onUserClick) {
      onUserClick(username);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className={`${theme === 'green' ? themeStyles.text : 'text-[#828282]'}`}>
          {bookmarks.length} bookmarked item{bookmarks.length !== 1 ? 's' : ''}
        </div>
        <BookmarkManager theme={theme} />
      </div>

      <div className={`text-sm ${theme === 'green' ? themeStyles.text : 'text-[#828282]'}`}>
        Note: Bookmarks are stored locally. Use [EXPORT] to save them, or create an HN Live account for automatic cloud sync.
      </div>

      {error && (
        <div className={`${themeStyles.error} py-2`}>
          Error: {error}
        </div>
      )}

      {loading && bookmarks.length === 0 ? (
        <div className={`text-center py-8 opacity-75 ${theme === 'green' ? '' : 'text-[#828282]'}`}>
          Loading bookmarks...
        </div>
      ) : bookmarks.length === 0 ? (
        <div className={`text-center py-8 opacity-75 ${theme === 'green' ? '' : 'text-[#828282]'}`}>
          <div>No bookmarked items yet.</div>
          <div className="mt-2 text-sm">
            Bookmarks are private to you and stored locally in your browser.
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-w-full">
          {bookmarks.map((item, index) => (
            <div 
              key={`${item.id}-${index}`} 
              className={`p-4 rounded ${themeStyles.itemBg} leading-relaxed break-words overflow-hidden`}
            >
              {item.type === 'comment' ? (
                <CommentBookmark 
                  key={`comment-${item.id}`} 
                  item={item} 
                  theme={theme} 
                  themeStyles={themeStyles}
                  navigate={navigate} 
                  onDelete={deleteBookmark} 
                />
              ) : (
                <StoryBookmark 
                  key={`story-${item.id}`} 
                  item={item} 
                  theme={theme}
                  themeStyles={themeStyles}
                  navigate={navigate} 
                  onDelete={deleteBookmark} 
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loading indicator for future pagination */}
      <div ref={loadingRef} className="py-4 text-center">
        {loading && bookmarks.length > 0 ? (
          <div className="opacity-75">Loading more...</div>
        ) : null}
      </div>
    </div>
  );
}

function StoryBookmark({ item, theme, themeStyles, navigate, onDelete }: {
  item: any;
  theme: string;
  themeStyles: any;
  navigate: NavigateFunction;
  onDelete: (id: number) => void;
}) {
  const handleStoryClick = () => {
    // Add to history
    addToHistory(item.id, {
      title: item.title,
      by: item.by,
      url: item.url
    });
    navigate(`/item/${item.id}`);
  };

  return (
    <div>
      <span className="opacity-75">{formatTimeAgo(item.time)}</span> | <a
        href={`/item/${item.id}`}
        onClick={(e) => {
          e.preventDefault();
          handleStoryClick();
        }}
        className={`${theme === 'green' ? themeStyles.link : 'text-[#828282] hover:text-[#828282]/80'}`}
      >
        {item.title}
      </a> <button
        onClick={() => onDelete(item.id)}
        className="opacity-50 hover:opacity-100 ml-2"
      >
        [remove]
      </button>
    </div>
  );
}

function CommentBookmark({ item, theme, themeStyles, navigate, onDelete }: { 
  item: any; 
  theme: string;
  themeStyles: any;
  navigate: NavigateFunction;
  onDelete: (id: number) => void;
}) {
  const handleCommentClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Add to history for the parent story
    if (item.storyId) {
      addToHistory(item.storyId, {
        title: item.story?.title,
        by: item.story?.by
      });
    }
    navigate(`/item/${item.storyId}/comment/${item.id}`);
  };

  const handleStoryLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Add to history for the parent story
    if (item.storyId) {
      addToHistory(item.storyId, {
        title: item.story?.title,
        by: item.story?.by
      });
    }
    navigate(`/item/${item.storyId}`);
  };

  return (
    <div>
      <span className="opacity-75">{formatTimeAgo(item.time)}</span> | <a
        href={`/item/${item.storyId}/comment/${item.id}`}
        onClick={handleCommentClick}
        className={`${theme === 'green' ? themeStyles.link : 'text-[#828282] hover:text-[#828282]/80'}`}
      >
        {item.text}
      </a> | <span className="opacity-75">re:</span> <a
        href={`/item/${item.storyId}`}
        onClick={handleStoryLinkClick}
        className={`${theme === 'green' ? themeStyles.link : 'text-[#828282] hover:text-[#828282]/80'}`}
      >
        {item.story?.title}
      </a> <button
        onClick={() => onDelete(item.id)}
        className="opacity-50 hover:opacity-100 ml-2"
      >
        [remove]
      </button>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return '0m';
}