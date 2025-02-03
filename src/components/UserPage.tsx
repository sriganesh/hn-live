import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MobileBottomBar } from './MobileBottomBar';
import { UserTag } from '../types/UserTag';

interface UserPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: 'xs' | 'sm' | 'base';
  onShowSearch: () => void;
  onShowSettings: () => void;
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

export default function UserPage({ theme, fontSize, onShowSearch, onShowSettings }: UserPageProps) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<HNUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<HNItem | null>(null);
  const [userTags, setUserTags] = useState<string[]>(() => {
    try {
      const tags = JSON.parse(localStorage.getItem('hn-user-tags') || '[]');
      const userTag = tags.find((t: UserTag) => t.userId === userId);
      return userTag?.tags || [];
    } catch (e) {
      console.error('Error parsing user tags:', e);
      return [];
    }
  });
  const [newTag, setNewTag] = useState('');

  // Update the ESC key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        navigate(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    const fetchUser = async () => {
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
  }, [userId]);

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

  const themeColors = theme === 'green'
    ? 'text-green-400 bg-black'
    : theme === 'og'
    ? 'text-[#828282] bg-[#f6f6ef]'
    : 'text-[#828282] bg-[#1a1a1a]';

  const addTag = () => {
    if (!newTag.trim()) return;
    
    try {
      const tags: UserTag[] = JSON.parse(localStorage.getItem('hn-user-tags') || '[]');
      const existingTagIndex = tags.findIndex(t => t.userId === userId);
      
      if (existingTagIndex >= 0) {
        if (!tags[existingTagIndex].tags.includes(newTag)) {
          tags[existingTagIndex].tags.push(newTag);
          tags[existingTagIndex].timestamp = Date.now();
        }
      } else {
        tags.push({
          userId: userId!,
          tags: [newTag],
          timestamp: Date.now()
        });
      }
      
      localStorage.setItem('hn-user-tags', JSON.stringify(tags));
      setUserTags(prev => [...prev, newTag]);
      setNewTag('');
    } catch (e) {
      console.error('Error adding tag:', e);
    }
  };

  const removeTag = (tagToRemove: string) => {
    const tags: UserTag[] = JSON.parse(localStorage.getItem('hn-user-tags') || '[]');
    const userTagIndex = tags.findIndex(t => t.userId === userId);
    
    if (userTagIndex >= 0) {
      tags[userTagIndex].tags = tags[userTagIndex].tags.filter(t => t !== tagToRemove);
      tags[userTagIndex].timestamp = Date.now();
      
      if (tags[userTagIndex].tags.length === 0) {
        tags.splice(userTagIndex, 1);
      }
      
      localStorage.setItem('hn-user-tags', JSON.stringify(tags));
      setUserTags(prev => prev.filter(t => t !== tagToRemove));
    }
  };

  return (
    <>
      <div className={`fixed inset-0 z-50 ${themeColors} overflow-hidden text-${fontSize}`}>
        <div className="h-full overflow-y-auto p-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/')}
                  className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold tracking-wider hover:opacity-75 flex items-center`}
                >
                  <span>HN</span>
                  <span className="text-2xl leading-[0] relative top-[1px] mx-[1px]">•</span>
                  <span>LIVE</span>
                </button>
                <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold`}>
                  /user/{userId}
                </span>
              </div>
              
              <div className="hidden sm:flex items-center gap-4">
                <button 
                  onClick={() => navigate('/')}
                  className="opacity-75 hover:opacity-100"
                >
                  [ESC]
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              Loading user profile...
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="text-red-500">{error}</div>
              <button
                onClick={() => navigate(-1)}
                className={`${theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'} hover:opacity-75`}
              >
                ← Go back
              </button>
            </div>
          ) : user && (
            <div className="max-w-3xl mx-auto space-y-8">
              {/* User Info */}
              <div className="space-y-4">
                <div className="flex items-baseline gap-4">
                  <h1 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} text-xl font-bold`}>
                    {user.id}
                  </h1>
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
                  <div className="space-y-2">
                    <div className="text-sm opacity-75">Joined</div>
                    <div>{formatDate(user.created)}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm opacity-75">Karma</div>
                    <div>{user.karma.toLocaleString()}</div>
                  </div>
                </div>

                {user.about && (
                  <div className="space-y-2 pt-4">
                    <div className="text-sm opacity-75">About</div>
                    <div 
                      className="prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: user.about }}
                    />
                  </div>
                )}
              </div>

              {/* User Tags */}
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addTag();
                      }
                    }}
                    placeholder="Add tag..."
                    className={`
                      px-2 py-1 rounded text-sm
                      ${theme === 'green' 
                        ? 'bg-black border border-green-500/30 text-green-400' 
                        : theme === 'og'
                        ? 'bg-[#f6f6ef] border border-[#ff6600]/30 text-[#828282]'
                        : 'bg-[#1a1a1a] border border-[#828282]/30 text-[#828282]'
                      }
                    `}
                  />
                  <button
                    onClick={addTag}
                    className="opacity-75 hover:opacity-100"
                  >
                    [add]
                  </button>
                </div>
                
                {userTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {userTags.map(tag => (
                      <span
                        key={tag}
                        className={`
                          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm
                          ${theme === 'green' 
                            ? 'bg-green-500/10 border border-green-500/30' 
                            : theme === 'og'
                            ? 'bg-[#ff6600]/10 border border-[#ff6600]/30'
                            : 'bg-[#828282]/10 border border-[#828282]/30'
                          }
                        `}
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="opacity-75 hover:opacity-100 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {recentActivity && (
                <div className="space-y-4">
                  <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} text-lg font-bold`}>
                    Recent Activity
                  </h2>
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
                      <div className="space-y-2">
                        <a
                          href={`/item/${recentActivity.id}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/item/${recentActivity.id}`);
                          }}
                          className="opacity-75 hover:opacity-100"
                        >
                          {recentActivity.text}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Activity Summary */}
              {user.submitted && (
                <div className="space-y-4">
                  <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} text-lg font-bold`}>
                    Activity
                  </h2>
                  <div className="text-sm opacity-75">
                    {user.submitted.length.toLocaleString()} submissions
                  </div>
                  {/* We could add a paginated list of their submissions here */}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <MobileBottomBar 
        theme={theme}
        onShowSearch={onShowSearch}
        onShowSettings={onShowSettings}
        onCloseSearch={onShowSearch}
      />
    </>
  );
} 