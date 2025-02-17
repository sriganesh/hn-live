import { useNavigate, NavigateFunction } from 'react-router-dom';

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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="opacity-75">
          {bookmarks.length} bookmarked item{bookmarks.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={() => {
            const timestamp = Math.floor(Date.now() / 1000);
            const content = JSON.stringify(bookmarks, null, 2);
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hn.live-bookmarks-${timestamp}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="opacity-75 hover:opacity-100"
        >
          [EXPORT]
        </button>
      </div>

      {bookmarks.length === 0 ? (
        <div className="text-center py-8 opacity-75">
          <div>No bookmarked items yet.</div>
          <div className="mt-2 text-sm">
            Bookmarks are private to you and stored locally in your browser.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map(item => (
            <div key={item.id} className="leading-relaxed">
              {item.type === 'comment' ? (
                <CommentBookmark item={item} theme={theme} navigate={navigate} onDelete={onDeleteBookmark} />
              ) : (
                <StoryBookmark item={item} theme={theme} navigate={navigate} onDelete={onDeleteBookmark} />
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {(hasMore || loading) && (
            <div ref={loadingRef} className="py-4 text-center opacity-75">
              {loading ? 'Loading more bookmarks...' : 'Scroll for more'}
            </div>
          )}
        </div>
      )}
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
    <>
      <span className="opacity-50">{formatTimeAgo(item.time)}</span>
      {' | '}
      <a
        href={`/item/${item.storyId}/comment/${item.id}`}
        onClick={(e) => {
          e.preventDefault();
          navigate(`/item/${item.storyId}/comment/${item.id}`);
        }}
        className="hover:opacity-75"
      >
        {item.text}
      </a>
      {' | re: '}
      <a
        href={`/item/${item.storyId}`}
        onClick={(e) => {
          e.preventDefault();
          navigate(`/item/${item.storyId}`);
        }}
        className="hover:opacity-75"
      >
        {item.story?.title}
      </a>
      {' '}
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-50 hover:opacity-100"
      >
        [remove]
      </button>
    </>
  );
}

function StoryBookmark({ item, theme, navigate, onDelete }: {
  item: any;
  theme: string;
  navigate: NavigateFunction;
  onDelete: (id: number) => void;
}) {
  return (
    <>
      <span className="opacity-50">{formatTimeAgo(item.time)}</span>
      {' | '}
      <a
        href={`/item/${item.id}`}
        onClick={(e) => {
          e.preventDefault();
          navigate(`/item/${item.id}`);
        }}
        className="hover:opacity-75"
      >
        {item.title}
      </a>
      {' '}
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-50 hover:opacity-100"
      >
        [remove]
      </button>
    </>
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