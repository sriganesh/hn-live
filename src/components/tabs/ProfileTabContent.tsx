import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useProfile } from '../../hooks/useProfile';

interface ProfileTabContentProps {
  theme: 'green' | 'og' | 'dog';
  hnUsername: string | null;
  onShowSettings: () => void;
  onUpdateHnUsername: (username: string | null) => void;
  onUserClick: (username: string) => void;
}

// Add a helper function to safely format dates
const formatDate = (dateString: string) => {
  try {
    let date: Date;
    if (typeof dateString === 'number') {
      date = new Date(dateString * 1000);
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      return 'recently';
    }
    
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'recently';
  }
};

export function ProfileTabContent({
  theme,
  hnUsername,
  onShowSettings,
  onUpdateHnUsername,
  onUserClick
}: ProfileTabContentProps) {
  const navigate = useNavigate();
  const { 
    loading, 
    error, 
    unreadCount, 
    commentGroups, 
    markAllAsRead, 
    markAsRead 
  } = useProfile(hnUsername || undefined);

  if (!hnUsername) {
    return (
      <div className="text-center py-8">
        <div className="mb-4">
          Connect your HN username to track replies locally in your browser
          <span className="block mt-1 text-sm opacity-75">
            (Beta feature - notifications may be delayed or intermittent)
          </span>
        </div>
        <button
          onClick={onShowSettings}
          className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} hover:opacity-75`}
        >
          [CONNECT USERNAME]
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className={`text-center py-8 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}>Loading comments...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-2">Error: {error}</div>;
  }

  return (
    <div>
      {/* Profile Header */}
      <div className={`mb-8 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="opacity-75">Connected as </span>
              <button 
                onClick={() => onUserClick(hnUsername)}
                className={`${
                  theme === 'green' 
                    ? 'text-green-500' 
                    : 'text-[#ff6600]'
                } hover:underline`}
              >
                {hnUsername}
              </button>
              <span className="text-xs opacity-75">(Beta)</span>
            </div>
            <div className="text-xs opacity-75 mt-1">
              Notifications may be delayed or intermittent
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                localStorage.removeItem('hn-username');
                localStorage.removeItem('hn-new-replies');
                localStorage.removeItem('hn-unread-count');
                localStorage.removeItem('hn-comment-tracker');
                onUpdateHnUsername(null);
                onShowSettings();
              }}
              className={`text-sm opacity-75 hover:opacity-100 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}
            >
              [disconnect]
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`text-lg font-semibold inline-block ${theme === 'green' ? '' : 'text-[#828282]'}`}>
            Recent Comments and Replies
          </h2>
          <span className="text-xs opacity-75 ml-2">(Beta)</span>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={markAllAsRead}
            className={`text-xs opacity-75 hover:opacity-100 ${
              theme === 'green' ? 'text-green-400' : 'text-[#828282]'
            }`}
          >
            [mark all as read]
          </button>
        )}
      </div>

      {/* Comments List */}
      {commentGroups.length === 0 ? (
        <div className={`text-center py-8 opacity-75 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}>
          No replies found for your recent comments
        </div>
      ) : (
        <div className="space-y-8">
          {commentGroups.map(group => (
            <div key={group.originalComment.id} className="border-b border-current/10 pb-6 last:border-0">
              {/* Story Title */}
              <div className="mb-4">
                <a
                  href={group.originalComment.story_url || `https://news.ycombinator.com/item?id=${group.originalComment.story_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm hover:underline break-words ${
                    theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
                  }`}
                >
                  {group.originalComment.story_title || 'Unknown Story'}
                </a>
              </div>

              {/* Replies Section - Now shown first */}
              {group.replies.length > 0 && (
                <div className="mb-4">
                  {group.replies.map(reply => (
                    <div key={reply.id} className="mb-6 border-l-2 border-current/10 pl-4">
                      <div className="text-xs opacity-70 mb-2">
                        <a
                          href={`#user-${reply.author}`}
                          onClick={(e) => {
                            e.preventDefault();
                            onUserClick(reply.author);
                          }}
                          className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} hover:underline`}
                        >
                          {reply.author}
                        </a>
                        {' replied '}
                        <a
                          href={`/item/${reply.parent_id ?? group.originalComment.id}/comment/${reply.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/item/${reply.parent_id ?? group.originalComment.id}/comment/${reply.id}`);
                          }}
                          className="hover:underline break-words"
                        >
                          {formatDate(reply.created_at)}
                        </a>
                      </div>
                      <div 
                        className={`prose prose-sm max-w-none break-words ${
                          theme === 'green' ? '' : 'text-[#828282]'
                        }`}
                        dangerouslySetInnerHTML={{ __html: reply.text }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* "In response to" text */}
              <div className="text-xs opacity-70 mb-2">
                in response to:
              </div>

              {/* Original Comment - Now shown last */}
              <div className="bg-current/5 p-4 rounded">
                <div 
                  className={`prose prose-sm max-w-none mb-2 break-words ${
                    theme === 'green' ? '' : 'text-[#828282]'
                  }`}
                  dangerouslySetInnerHTML={{ __html: group.originalComment.comment_text }}
                />
                <div className={`text-xs ${
                  theme === 'green' ? 'text-green-400/70' : 'text-[#828282]/70'
                }`}>
                  <a
                    href={`/item/${group.originalComment.story_id}/comment/${group.originalComment.objectID}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/item/${group.originalComment.story_id}/comment/${group.originalComment.objectID}`);
                    }}
                    className="hover:underline"
                  >
                    {formatDate(group.originalComment.created_at)}
                  </a>
                </div>
              </div>

              {/* Mark as Read Button */}
              {group.hasUnread && (
                <div className="mt-2 text-right">
                  <button 
                    onClick={() => markAsRead(group.originalComment.id)}
                    className={`text-xs opacity-75 hover:opacity-100 ${
                      theme === 'green' ? 'text-green-400' : 'text-[#828282]'
                    }`}
                  >
                    [mark as read]
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 