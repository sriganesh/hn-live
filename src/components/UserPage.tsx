import { useState, useEffect, useRef, useCallback } from 'react';
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

interface AlgoliaResponse {
  hits: any[];
  nbPages: number;
  page: number;
  hitsPerPage: number;
}

interface UserActivity {
  id: number;
  type: 'story' | 'comment';
  title?: string;
  text?: string;
  url?: string;
  by: string;
  time: number;
  parent?: number;
}

const isTopUser = (userId: string) => topUsers.includes(userId);

export default function UserPage({ theme, fontSize, onShowSearch, onShowSettings }: UserPageProps) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<HNUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activityType, setActivityType] = useState<'all' | 'stories' | 'comments'>('all');
  const observerTarget = useRef<HTMLDivElement>(null);

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

  const fetchUserActivity = useCallback(async (page = 0, append = false) => {
    if (!userId) return;
    
    if (!append) {
      setActivities([]); // Clear activities when not appending
    }
    setIsLoadingMore(true);

    try {
      const typeFilter = activityType === 'stories' 
        ? 'story' 
        : activityType === 'comments' 
        ? 'comment' 
        : '(story,comment)';
      
      const response = await fetch(
        `https://hn.algolia.com/api/v1/search_by_date?tags=${typeFilter},author_${userId}&page=${page}&hitsPerPage=30`
      );

      if (!response.ok) throw new Error('Failed to fetch activity');
      const data: AlgoliaResponse = await response.json();
      
      const hasMorePages = page < data.nbPages - 1 && data.hits.length > 0;
      setHasMore(hasMorePages);

      const newItems = data.hits.map(item => ({
        id: item.objectID,
        type: item.comment_text ? 'comment' : 'story',
        title: item.title || item.story_title,
        text: item.comment_text,
        url: item.url,
        by: item.author,
        time: item.created_at_i,
        parent: item.parent_id
      }));

      setActivities(prev => append ? [...prev, ...newItems] : newItems);
      setCurrentPage(page);
    } catch (e) {
      console.error('Error fetching activity:', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userId, activityType]);

  // Initial fetch when user or activity type changes
  useEffect(() => {
    if (userId) {
      setCurrentPage(0);
      setHasMore(true);
      fetchUserActivity(0, false);
    }
  }, [userId, activityType, fetchUserActivity]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!hasMore || isLoadingMore || !userId) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          fetchUserActivity(currentPage + 1, true);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [currentPage, hasMore, isLoadingMore, userId, fetchUserActivity]);

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
                  {user.submitted && (
                    <div className="space-y-2">
                      <div className="text-sm opacity-75">Total Submissions</div>
                      <div className="text-lg">{user.submitted.length.toLocaleString()}</div>
                    </div>
                  )}
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
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} text-lg font-bold`}>
                    Recent Activity
                  </h2>
                  <select
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as typeof activityType)}
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
                </div>

                <div className="space-y-6">
                  {activities.map(item => (
                    <div key={item.id} className="space-y-2">
                      <div className="text-sm opacity-75">
                        <a
                          href={item.type === 'comment'
                            ? `/item/${item.parent}/comment/${item.id}`
                            : `/item/${item.id}`
                          }
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(item.type === 'comment'
                              ? `/item/${item.parent}/comment/${item.id}`
                              : `/item/${item.id}`
                            );
                          }}
                          className="hover:opacity-75"
                        >
                          {formatTimeAgo(item.time)}
                        </a>
                      </div>
                      {item.type === 'story' ? (
                        <div>
                          <a
                            href={item.url || `https://news.ycombinator.com/item?id=${item.id}`}
                            className="hover:opacity-75"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {item.title}
                          </a>
                        </div>
                      ) : (
                        <div 
                          className="prose prose-invert max-w-none"
                          dangerouslySetInnerHTML={{ __html: item.text || '' }}
                        />
                      )}
                    </div>
                  ))}
                  
                  {/* Infinite scroll observer */}
                  <div ref={observerTarget} style={{ height: '10px' }} />
                  
                  {isLoadingMore && (
                    <div className="py-4 text-center opacity-75">
                      Loading more...
                    </div>
                  )}
                  
                  {!hasMore && activities.length > 0 && (
                    <div className="py-4 text-center opacity-75">
                      <div>That's all from {userId}!</div>
                    </div>
                  )}
                </div>
              </div>
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