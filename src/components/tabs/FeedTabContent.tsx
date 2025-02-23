import { useNavigate } from 'react-router-dom';

interface FeedFilters {
  type: 'all' | 'stories' | 'comments';
  timeRange: '24h' | '7d' | '30d' | 'all';
  sortBy: 'date' | 'points';
}

interface FeedTabContentProps {
  theme: 'green' | 'og' | 'dog';
  filters: FeedFilters;
  setFilters: (filters: FeedFilters) => void;
  feedItems: any[];
  loading: boolean;
  hasMore: boolean;
  loadingRef: React.RefObject<HTMLDivElement>;
  onUserClick: (username: string) => void;
}

export function FeedTabContent({
  theme,
  filters,
  setFilters,
  feedItems,
  loading,
  hasMore,
  loadingRef,
  onUserClick
}: FeedTabContentProps) {
  const navigate = useNavigate();
  
  // Add check for following data
  const following = JSON.parse(localStorage.getItem('hn-following') || '[]');
  const hasFollowing = following.length > 0;

  return (
    <div>
      {/* Only show filters if we have followed users */}
      {hasFollowing && (
        <div className="mb-8">
          <div className="flex flex-wrap gap-4">
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as 'all' | 'stories' | 'comments' })}
              className={`px-2 py-1 rounded text-sm ${
                theme === 'green'
                  ? 'bg-black border border-green-500/30 text-green-400'
                  : theme === 'og'
                  ? 'bg-[#f6f6ef] border border-[#ff6600]/30 text-[#828282]'
                  : 'bg-[#1a1a1a] border border-[#828282]/30 text-[#828282]'
              }`}
            >
              <option value="all">All Items</option>
              <option value="stories">Stories Only</option>
              <option value="comments">Comments Only</option>
            </select>

            {/* Time Range Filter */}
            <select
              value={filters.timeRange}
              onChange={(e) => setFilters({ ...filters, timeRange: e.target.value as '24h' | '7d' | '30d' | 'all' })}
              className={`px-2 py-1 rounded text-sm ${
                theme === 'green'
                  ? 'bg-black border border-green-500/30 text-green-400'
                  : theme === 'og'
                  ? 'bg-[#f6f6ef] border border-[#ff6600]/30 text-[#828282]'
                  : 'bg-[#1a1a1a] border border-[#828282]/30 text-[#828282]'
              }`}
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>

            {/* Sort Filter */}
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as 'date' | 'points' })}
              className={`px-2 py-1 rounded text-sm ${
                theme === 'green'
                  ? 'bg-black border border-green-500/30 text-green-400'
                  : theme === 'og'
                  ? 'bg-[#f6f6ef] border border-[#ff6600]/30 text-[#828282]'
                  : 'bg-[#1a1a1a] border border-[#828282]/30 text-[#828282]'
              }`}
            >
              <option value="date">Sort by Date</option>
              <option value="points">Sort by Points</option>
            </select>
          </div>
        </div>
      )}

      {!hasFollowing ? (
        <div className="text-center py-8 opacity-75">
          <div>No followed users yet</div>
          <div className="mt-2 text-sm">
            Click on usernames to follow users and see their stories and comments here
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/user/pg')}
              className={`text-sm ${
                theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
              } hover:opacity-75`}
            >
              Try following pg to get started →
            </button>
          </div>
        </div>
      ) : feedItems.length === 0 ? (
        <div className="text-center py-8 opacity-75">
          {loading ? "Loading feed..." : "No items found for the selected filters"}
        </div>
      ) : (
        <div className="space-y-6">
          {feedItems.map(item => (
            <div key={item.id} className="space-y-2">
              {/* Item Header */}
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => onUserClick(item.by)}
                  className={`hover:opacity-75 ${
                    theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
                  }`}
                >
                  {item.by}
                </button>
                <span className="opacity-75">·</span>
                <a
                  href={`/item/${item.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(item.type === 'comment' ? `/item/${item.parent}/comment/${item.id}` : `/item/${item.id}`);
                  }}
                  className="opacity-75 hover:opacity-100"
                >
                  {formatTimeAgo(item.time)}
                </a>
              </div>

              {/* Item Content */}
              {item.type === 'comment' ? (
                <CommentContent item={item} theme={theme} navigate={navigate} />
              ) : (
                <StoryContent item={item} theme={theme} navigate={navigate} />
              )}
            </div>
          ))}

          {/* Loading Indicator & Infinite Scroll */}
          <div ref={loadingRef} className="py-4 text-center">
            {loading ? (
              <div className="opacity-75">Loading more...</div>
            ) : !hasMore && filters.timeRange !== 'all' ? (
              <div className="opacity-75 space-y-2">
                <div>No more items in this time range.</div>
                <div className="text-sm">
                  Try adjusting the time filter to see more content.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Components
function CommentContent({ item, theme, navigate }: { item: any; theme: string; navigate: any }) {
  return (
    <div>
      <div 
        className="prose prose-sm max-w-none break-words
          [&>*]:max-w-full [&>*]:break-words
          [&_a]:inline-block [&_a]:max-w-full [&_a]:overflow-hidden [&_a]:text-ellipsis
          [&_p]:max-w-full [&_p]:break-words
          [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap
          [&_code]:max-w-full [&_code]:break-words"
        dangerouslySetInnerHTML={{ __html: item.text }}
      />
      <div className="text-sm mt-2">
        <span className="opacity-75">on: </span>
        <a
          href={`/item/${item.parent}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/item/${item.parent}`);
          }}
          className="hover:opacity-75 break-words"
        >
          {item.title}
        </a>
      </div>
    </div>
  );
}

function StoryContent({ item, theme, navigate }: { item: any; theme: string; navigate: any }) {
  return (
    <div className="break-words">
      <a
        href={item.url || `/item/${item.id}`}
        onClick={(e) => {
          if (!item.url) {
            e.preventDefault();
            navigate(`/item/${item.id}`);
          }
        }}
        className="hover:opacity-75 break-all inline-block max-w-full"
        target={item.url ? "_blank" : undefined}
        rel={item.url ? "noopener noreferrer" : undefined}
      >
        {item.title}
      </a>
      {item.url && (
        <span className="ml-2 opacity-50 text-sm break-all">
          ({new URL(item.url).hostname})
        </span>
      )}
    </div>
  );
}

// Helper function
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return 'just now';
} 