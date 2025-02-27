import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { topUsers } from '../data/top-users.json';
import { UserTag } from '../types/UserTag';
import { FollowButton } from './FollowButton';
import { STORAGE_KEYS } from '../config/constants';

interface UserModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
}

interface HNUser {
  id: string;
  created: number;
  karma: number;
  about?: string;
  submitted?: number[];
}

export function UserModal({ userId, isOpen, onClose, theme, fontSize }: UserModalProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<HNUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTags, setUserTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
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

  // Add function to check if user is in top 100
  const isTopUser = (userId: string) => topUsers.includes(userId);

  const addTag = () => {
    if (!newTag.trim()) return;
    
    try {
      const tags: UserTag[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_TAGS) || '[]');
      
      // Check if this user already has this tag
      const existingTagIndex = tags.findIndex(t => t.userId === userId && t.tag === newTag.trim());
      
      if (existingTagIndex === -1) {
        // Add new tag
        tags.push({
          userId,
          tag: newTag.trim(),
          timestamp: Date.now()
        });
        
        // Update localStorage
        localStorage.setItem(STORAGE_KEYS.USER_TAGS, JSON.stringify(tags));
        
        // Update state
        setUserTags(prev => [...prev, newTag.trim()]);
        setNewTag('');
      }
    } catch (e) {
      console.error('Error adding tag:', e);
    }
  };

  const removeTag = (tagToRemove: string) => {
    try {
      const tags: UserTag[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_TAGS) || '[]');
      
      // Filter out the tag to remove
      const updatedTags = tags.filter(
        t => !(t.userId === userId && t.tag === tagToRemove)
      );
      
      // Update localStorage
      localStorage.setItem(STORAGE_KEYS.USER_TAGS, JSON.stringify(updatedTags));
      
      // Update state
      setUserTags(prev => prev.filter(tag => tag !== tagToRemove));
    } catch (e) {
      console.error('Error removing tag:', e);
    }
  };

  // Load user tags
  useEffect(() => {
    if (userId) {
      try {
        const tags = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_TAGS) || '[]')
          .filter((t: UserTag) => t.userId === userId)
          .map((t: UserTag) => t.tag);
        
        setUserTags(tags);
      } catch (e) {
        console.error('Error loading user tags:', e);
      }
    }
  }, [userId]);

  // Add the date check functions
  const isUserAnniversary = (createdTimestamp: number): boolean => {
    const created = new Date(createdTimestamp * 1000);
    const today = new Date();
    
    // Only show cake if at least one year has passed
    return created.getDate() === today.getDate() && 
           created.getMonth() === today.getMonth() &&
           created.getFullYear() < today.getFullYear();
  };

  const isCreatedToday = (createdTimestamp: number): boolean => {
    const created = new Date(createdTimestamp * 1000);
    const today = new Date();
    
    return created.getDate() === today.getDate() && 
           created.getMonth() === today.getMonth() &&
           created.getFullYear() === today.getFullYear();
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
            {/* User Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} text-xl font-bold`}>
                      {user.id}
                    </h2>
                    <FollowButton userId={userId} theme={theme} />
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
                  <div className="space-y-2">
                    <a
                      href={`/user/${user.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        onClose();
                        navigate(`/user/${user.id}`);
                      }}
                      className="text-sm opacity-50 hover:opacity-75 block"
                    >
                      [view full profile]
                    </a>
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className={`px-2 hover:opacity-75 ${
                  theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
                }`}
              >
                [x]
              </button>
            </div>

            {/* User Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm opacity-75">Joined</div>
                  <div className="flex items-center flex-wrap gap-2">
                    {formatDate(user.created)}
                    {user.created < 1202860800 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        theme === 'green' 
                          ? 'border-green-500/30 text-green-400' 
                          : 'border-[#ff6600]/30 text-[#ff6600]'
                      }`}>
                        Early User
                      </span>
                    )}
                    {isUserAnniversary(user.created) && (
                      <span className="text-lg">🎂</span>
                    )}
                    {isCreatedToday(user.created) && (
                      <span className="text-lg">👶</span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
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
            </div>

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