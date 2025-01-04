import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface UserModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  theme: 'green' | 'og' | 'dog';
  fontSize: 'xs' | 'sm' | 'base';
}

interface HNUser {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}

interface HNItem {
  id: number;
  type: 'story' | 'comment';
  title?: string;
  text?: string;
  by: string;
  time: number;
  url?: string;
  parent?: number;
  dead?: boolean;
  deleted?: boolean;
}

export function UserModal({ userId, isOpen, onClose, theme, fontSize }: UserModalProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<HNUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<HNItem | null>(null);
  const [parentStory, setParentStory] = useState<HNItem | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Add focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Focus the modal when it opens
      modalRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchUser = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://hacker-news.firebaseio.com/v0/user/${userId}.json`);
        if (!response.ok) {
          throw new Error('User not found');
        }
        const userData = await response.json();
        setUser(userData);

        if (userData.submitted && userData.submitted.length > 0) {
          for (const itemId of userData.submitted.slice(0, 10)) {
            const itemResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`);
            const itemData = await itemResponse.json();
            
            if (itemData && !itemData.dead && !itemData.deleted) {
              setRecentActivity(itemData);

              if (itemData.type === 'comment' && itemData.parent) {
                const parentResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${itemData.parent}.json`);
                const parentData = await parentResponse.json();
                setParentStory(parentData);
              }
              break;
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId, isOpen]);

  // Add keyboard event handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault(); // Prevent any parent handlers
        e.stopPropagation(); // Stop event bubbling
        onClose();
      }
    };

    // Add event listener when modal opens
    window.addEventListener('keydown', handleEscape);

    // Clean up event listener when modal closes or component unmounts
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Keep existing helper functions
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      onFocus={(e) => {
        if (!modalRef.current?.contains(e.target as Node)) {
          modalRef.current?.focus();
        }
      }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Modal */}
      <div 
        className={`
          relative w-full max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-lg p-6
          ${theme === 'green' 
            ? 'bg-black text-green-400 border border-green-500/30' 
            : theme === 'og'
            ? 'bg-[#f6f6ef] text-[#828282] border border-[#ff6600]/30'
            : 'bg-[#1a1a1a] text-[#828282] border border-[#828282]/30'
          }
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 opacity-75 hover:opacity-100"
        >
          [ESC]
        </button>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            Loading user profile...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-32 space-y-4">
            <div className="text-red-500">{error}</div>
          </div>
        ) : user && (
          <div className="space-y-6">
            {/* User Info */}
            <div className="space-y-4">
              <div className="flex items-baseline gap-4">
                <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} text-xl font-bold`}>
                  {user.id}
                </h2>
                <a 
                  href={`https://news.ycombinator.com/user?id=${user.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm opacity-50 hover:opacity-75"
                >
                  [view on HN]
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm opacity-75">Joined</div>
                  <div>{formatDate(user.created)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm opacity-75">Karma</div>
                  <div>{user.karma.toLocaleString()}</div>
                </div>
              </div>

              {user.about && (
                <div className="space-y-2 max-w-full">
                  <div className="text-sm opacity-75">About</div>
                  <div 
                    className="prose prose-invert max-w-full break-words overflow-hidden
                    [&>*]:max-w-full [&>*]:overflow-hidden [&>*]:break-words
                    [&_a]:inline-block [&_a]:max-w-full [&_a]:overflow-hidden [&_a]:text-ellipsis
                    [&_p]:max-w-full [&_p]:overflow-hidden [&_p]:break-words
                    [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap
                    [&_code]:max-w-full [&_code]:overflow-hidden [&_code]:break-words"
                    style={{
                      width: '100%',
                      maxWidth: '100%',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'pre-wrap'
                    }}
                    dangerouslySetInnerHTML={{ 
                      __html: user.about.replace(/<p>/g, '<p style="max-width: 100%; overflow-wrap: break-word;">')
                    }}
                  />
                </div>
              )}
            </div>

            {/* Recent Activity */}
            {recentActivity && (
              <div className="space-y-3">
                <h3 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold`}>
                  Recent Activity
                </h3>
                <div className="space-y-2">
                  <div className="text-sm opacity-75">
                    {formatTimeAgo(recentActivity.time)}
                  </div>
                  {recentActivity.type === 'story' ? (
                    <div>
                      <a
                        href={recentActivity.url || `https://news.ycombinator.com/item?id=${recentActivity.id}`}
                        onClick={(e) => {
                          if (!recentActivity.url) {
                            e.preventDefault();
                            navigate(`/item/${recentActivity.id}`);
                          }
                          onClose();
                        }}
                        className="font-medium hover:opacity-75"
                        target={recentActivity.url ? "_blank" : undefined}
                        rel={recentActivity.url ? "noopener noreferrer" : undefined}
                      >
                        {recentActivity.title}
                      </a>
                      {recentActivity.url && (
                        <span className="ml-2 opacity-50 text-sm">
                          ({new URL(recentActivity.url).hostname})
                        </span>
                      )}
                    </div>
                  ) : (
                    <div>
                      <a
                        href={`/item/${recentActivity.parent}`}
                        onClick={(e) => {
                          e.preventDefault();
                          // First fetch the parent story ID by traversing up the parent chain
                          const fetchParentStory = async () => {
                            let currentItem = recentActivity;
                            while (currentItem.parent) {
                              const response = await fetch(
                                `https://hacker-news.firebaseio.com/v0/item/${currentItem.parent}.json`
                              );
                              currentItem = await response.json();
                              if (currentItem.type === 'story') {
                                // Navigate using the /item/storyId/comment/commentId format
                                navigate(`/item/${currentItem.id}/comment/${recentActivity.id}`);
                                onClose();
                                break;
                              }
                            }
                          };
                          fetchParentStory();
                        }}
                        className="hover:opacity-75"
                      >
                        <div className="opacity-75">{recentActivity.text}</div>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity Summary */}
            {user.submitted && (
              <div className="space-y-2">
                <div className="text-sm opacity-75">
                  {user.submitted.length.toLocaleString()} total submissions
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 