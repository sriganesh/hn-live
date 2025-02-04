import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MobileBottomBar } from './MobileBottomBar';
import { UserTag } from '../types/UserTag';
import { FollowButton } from './FollowButton';
import { topUsers } from '../data/top-users.json';

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

const isTopUser = (userId: string) => topUsers.includes(userId);

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
          <div className="max-w-3xl mx-auto mb-8">
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
                  / USER
                </span>
                <span className="opacity-75">/ {userId}</span>
              </div>
              <button onClick={() => navigate(-1)} className="opacity-75 hover:opacity-100">
                [ESC]
              </button>
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
            <div className="max-w-3xl mx-auto">
              {/* User Header Section */}
              <div className={`
                p-6 rounded-lg mb-8
                ${theme === 'green'
                  ? 'bg-green-500/5'
                  : theme === 'og'
                  ? 'bg-[#ff6600]/5'
                  : 'bg-[#828282]/5'}
              `}>
                {/* Username and Actions */}
                <div className="space-y-1 mb-6">
                  <div className="flex items-center gap-4">
                    <h1 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} text-2xl font-bold`}>
                      {user.id}
                    </h1>
                    <FollowButton userId={userId || ''} theme={theme} />
                    {isTopUser(user.id) && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        theme === 'green' 
                          ? 'border-green-500/30 text-green-400' 
                          : 'border-[#ff6600]/30 text-[#ff6600]'
                      }`}>
                        Top 100
                      </span>
                    )}
                  </div>
                  <a 
                    href={`https://news.ycombinator.com/user?id=${user.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm opacity-50 hover:opacity-75 block"
                  >
                    [view on HN]
                  </a>
                </div>

                {/* User Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="text-sm opacity-75">Joined</div>
                    <div className="text-lg">{formatDate(user.created)}</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm opacity-75">Karma</div>
                    <div className="text-lg">{user.karma.toLocaleString()}</div>
                  </div>
                </div>

                {/* About Section */}
                {user.about && (
                  <div className="mt-6 space-y-2">
                    <div className="text-sm opacity-75">About</div>
                    <div 
                      className="prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: user.about }}
                    />
                  </div>
                )}
              </div>

              {/* Tags Section */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
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
                      px-3 py-2 rounded text-sm w-full max-w-xs
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
                          inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm
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

              {/* Recent Activity Section */}
              {recentActivity && (
                <div className="space-y-4">
                  <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} text-lg font-bold`}>
                    Recent Activity
                  </h2>
                  <div className="space-y-2">
                    <div className="text-sm opacity-75">
                      <a
                        href={recentActivity.type === 'comment'
                          ? `/item/${recentActivity.parent}/comment/${recentActivity.id}`
                          : `/item/${recentActivity.id}`
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(recentActivity.type === 'comment'
                            ? `/item/${recentActivity.parent}/comment/${recentActivity.id}`
                            : `/item/${recentActivity.id}`
                          );
                        }}
                        className="hover:opacity-75"
                      >
                        {formatTimeAgo(recentActivity.time)}
                      </a>
                    </div>
                    {recentActivity.type === 'story' ? (
                      <div>
                        <a
                          href={recentActivity.url || `https://news.ycombinator.com/item?id=${recentActivity.id}`}
                          className="hover:opacity-75"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {recentActivity.title}
                        </a>
                      </div>
                    ) : (
                      <div 
                        className="prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: recentActivity.text || '' }}
                      />
                    )}
                  </div>
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