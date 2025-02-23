import { useNavigate, NavigateFunction } from 'react-router-dom';
import { BookmarkManager } from '../BookmarkManager';
import { AUTH_TOKEN_KEY, API_BASE_URL } from '../../types/auth';

interface BookmarksTabContentProps {
  theme: 'green' | 'og' | 'dog';
  bookmarks: any[];
  loading: boolean;
  hasMore: boolean;
  loadingRef: React.RefObject<HTMLDivElement>;
  onDeleteBookmark: (id: number) => void;
  navigate: NavigateFunction;
}

export function BookmarksTabContent({
  theme,
  bookmarks,
  loading,
  hasMore,
  loadingRef,
  onDeleteBookmark,
  navigate
}: BookmarksTabContentProps) {
  // Add cloud sync delete handler
  const handleDeleteBookmark = async (bookmarkId: number) => {
    try {
      // First delete locally
      onDeleteBookmark(bookmarkId);

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
      console.error('Error deleting bookmark:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="opacity-75">
          {bookmarks.length} bookmarked item{bookmarks.length !== 1 ? 's' : ''}
        </div>
        <BookmarkManager theme={theme} />
      </div>

      <div className="text-sm opacity-75">
        Note: Bookmarks are stored locally. Use [EXPORT] to save them, or create an HN Live account for automatic cloud sync.
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-8 opacity-75">
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
              className="leading-relaxed break-words overflow-hidden"
            >
              {item.type === 'comment' ? (
                <CommentBookmark 
                  key={`comment-${item.id}`} 
                  item={item} 
                  theme={theme} 
                  navigate={navigate} 
                  onDelete={handleDeleteBookmark} 
                />
              ) : (
                <StoryBookmark 
                  key={`story-${item.id}`} 
                  item={item} 
                  theme={theme} 
                  navigate={navigate} 
                  onDelete={handleDeleteBookmark} 
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StoryBookmark({ item, theme, navigate, onDelete }: {
  item: any;
  theme: string;
  navigate: NavigateFunction;
  onDelete: (id: number) => void;
}) {
  return (
    <div>
      {formatTimeAgo(item.time)} | <a
        href={`/item/${item.id}`}
        onClick={(e) => {
          e.preventDefault();
          navigate(`/item/${item.id}`);
        }}
        className="hover:opacity-75"
      >
        {item.title}
      </a> <button
        onClick={() => onDelete(item.id)}
        className="opacity-50 hover:opacity-100"
      >
        [remove]
      </button>
    </div>
  );
}

function CommentBookmark({ item, theme, navigate, onDelete }: { 
  item: any; 
  theme: string; 
  navigate: NavigateFunction;
  onDelete: (id: number) => void;
}) {
  return (
    <div>
      {formatTimeAgo(item.time)} | <a
        href={`/item/${item.storyId}/comment/${item.id}`}
        onClick={(e) => {
          e.preventDefault();
          navigate(`/item/${item.storyId}/comment/${item.id}`);
        }}
        className="hover:opacity-75"
      >
        {item.text}
      </a> | re: <a
        href={`/item/${item.storyId}`}
        onClick={(e) => {
          e.preventDefault();
          navigate(`/item/${item.storyId}`);
        }}
        className="hover:opacity-75"
      >
        {item.story?.title}
      </a> <button
        onClick={() => onDelete(item.id)}
        className="opacity-50 hover:opacity-100"
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