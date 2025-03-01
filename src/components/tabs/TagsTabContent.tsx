import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeOption } from '../../types/common';
import { LoadingIndicator } from '../common/LoadingIndicator';

// Define the actual format of tags in localStorage
interface StoredTag {
  userId: string;
  tag: string;
  timestamp: number;
}

// Format we'll use for display
interface GroupedUserTag {
  userId: string;
  tags: string[];
}

interface TagsTabContentProps {
  theme: ThemeOption;
  onViewTag: (tag: string) => void;
  onUserClick?: (userId: string) => void;
}

// The correct localStorage key for user tags
const USER_TAGS_KEY = 'hn-live-user-tags';

export const TagsTabContent: React.FC<TagsTabContentProps> = ({
  theme,
  onViewTag,
  onUserClick
}) => {
  const { isAuthenticated } = useAuth();
  const [userTags, setUserTags] = useState<GroupedUserTag[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user tags from localStorage and group by userId
  useEffect(() => {
    setLoading(true);
    try {
      // Get user tags from localStorage using the correct key
      const storedTags: StoredTag[] = JSON.parse(localStorage.getItem(USER_TAGS_KEY) || '[]');
      
      // Group tags by userId
      const userTagMap: Record<string, string[]> = {};
      
      storedTags.forEach(item => {
        if (!userTagMap[item.userId]) {
          userTagMap[item.userId] = [];
        }
        if (!userTagMap[item.userId].includes(item.tag)) {
          userTagMap[item.userId].push(item.tag);
        }
      });
      
      // Convert to array format
      const groupedTags: GroupedUserTag[] = Object.keys(userTagMap).map(userId => ({
        userId,
        tags: userTagMap[userId]
      }));
      
      setUserTags(groupedTags);
    } catch (error) {
      console.error('Error loading user tags from localStorage:', error);
      setUserTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle removing a tag from a user
  const handleRemoveTag = (userId: string, tagToRemove: string) => {
    try {
      // Get current tags
      const storedTags: StoredTag[] = JSON.parse(localStorage.getItem(USER_TAGS_KEY) || '[]');
      
      // Filter out the tag to remove
      const updatedTags = storedTags.filter(
        item => !(item.userId === userId && item.tag === tagToRemove)
      );
      
      // Save back to localStorage
      localStorage.setItem(USER_TAGS_KEY, JSON.stringify(updatedTags));
      
      // Update state by removing the tag
      setUserTags(prev => 
        prev.map(userTag => {
          if (userTag.userId === userId) {
            return {
              ...userTag,
              tags: userTag.tags.filter(tag => tag !== tagToRemove)
            };
          }
          return userTag;
        }).filter(userTag => userTag.tags.length > 0)
      );
    } catch (error) {
      console.error('Error removing tag:', error);
    }
  };

  // Export tags function
  const handleExportTags = () => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const storedTags = localStorage.getItem(USER_TAGS_KEY) || '[]';
      const blob = new Blob([storedTags], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `hn-live-tags-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting tags:', error);
    }
  };

  if (loading) {
    return <LoadingIndicator theme={theme} message="Loading tags..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className={`opacity-75 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}>
          {userTags.length} tagged user{userTags.length !== 1 ? 's' : ''}
        </div>
        {userTags.length > 0 && (
          <button
            onClick={handleExportTags}
            className={`opacity-75 hover:opacity-100 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}
          >
            [EXPORT]
          </button>
        )}
      </div>

      <div className={`text-sm opacity-75 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}>
        Note: Tags are stored locally. Use [EXPORT] to save them.
      </div>

      {userTags.length === 0 ? (
        <div className={`text-center py-8 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}>
          <div>No tagged users yet</div>
          <div className="mt-2 text-sm opacity-75">
            Click on usernames to add tags and organize users
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {userTags.map(userTag => (
            <div key={userTag.userId} className="space-y-2">
              <button
                onClick={() => onUserClick && onUserClick(userTag.userId)}
                className={`${
                  theme === 'green'
                    ? 'text-green-500'
                    : 'text-[#ff6600]'
                } hover:opacity-75`}
              >
                {userTag.userId}
              </button>
              <div className="flex flex-wrap gap-2">
                {userTag.tags.map(tagName => (
                  <span
                    key={tagName}
                    className={`
                      inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm
                      bg-[#828282]/10 border border-[#828282]/30
                      ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}
                    `}
                  >
                    {tagName}
                    <button
                      onClick={() => handleRemoveTag(userTag.userId, tagName)}
                      className="opacity-75 hover:opacity-100 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 