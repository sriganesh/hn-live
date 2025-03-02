import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeOption } from '../../types/common';
import { LoadingIndicator } from '../common/LoadingIndicator';
import { STORAGE_KEYS } from '../../config/constants';

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
  onViewUser: (userId: string) => void;
}

// Use the centralized constant instead of defining it locally
// const USER_TAGS_KEY = 'hn-live-user-tags';

export const TagsTabContent: React.FC<TagsTabContentProps> = ({
  theme,
  onViewUser
}) => {
  const { isAuthenticated } = useAuth();
  const [userTags, setUserTags] = useState<GroupedUserTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [userId, setUserId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load tags on component mount
  useEffect(() => {
    loadTags();
  }, []);

  // Load tags from localStorage
  const loadTags = () => {
    setLoading(true);
    try {
      // Get user tags from localStorage using the correct key
      const storedTagsRaw = localStorage.getItem(STORAGE_KEYS.USER_TAGS);
      
      if (!storedTagsRaw) {
        setUserTags([]);
        setLoading(false);
        return;
      }
      
      const storedTags = JSON.parse(storedTagsRaw);
      
      if (Array.isArray(storedTags)) {
        // Group tags by userId
        const groupedTags: { [key: string]: string[] } = {};
        
        storedTags.forEach(item => {
          if (!groupedTags[item.userId]) {
            groupedTags[item.userId] = [];
          }
          
          // Only handle the current format with tags array
          if (Array.isArray(item.tags)) {
            item.tags.forEach((tag: string) => {
              if (typeof tag === 'string' && !groupedTags[item.userId].includes(tag)) {
                groupedTags[item.userId].push(tag);
              }
            });
          }
        });
        
        // Convert to array format for rendering
        const formattedTags: GroupedUserTag[] = Object.keys(groupedTags).map(userId => ({
          userId,
          tags: groupedTags[userId]
        })).filter(userTag => userTag.tags.length > 0);
        
        setUserTags(formattedTags);
      } else {
        console.error('Unexpected format for stored tags:', storedTags);
        setUserTags([]);
      }
    } catch (error) {
      console.error('Error loading tags:', error);
      setError('Failed to load tags');
      setUserTags([]);
    }
    setLoading(false);
  };

  // Remove a tag for a user
  const removeTag = (userId: string, tagToRemove: string) => {
    try {
      // Get current tags
      const storedTags = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER_TAGS) || '[]');
      
      // Update tags for the user
      const updatedTags = storedTags.map((item: any) => {
        if (item.userId === userId && Array.isArray(item.tags)) {
          // Remove the tag from the tags array
          return {
            ...item,
            tags: item.tags.filter((tag: string) => tag !== tagToRemove)
          };
        }
        return item;
      }).filter((item: any) => !Array.isArray(item.tags) || item.tags.length > 0);
      
      // Save back to localStorage
      localStorage.setItem(STORAGE_KEYS.USER_TAGS, JSON.stringify(updatedTags));
      
      // Update state by removing the tag
      setUserTags(prevTags => 
        prevTags.map(userTag => {
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
      setError('Failed to remove tag');
    }
  };

  // Export tags as JSON file
  const exportTags = () => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const storedTags = localStorage.getItem(STORAGE_KEYS.USER_TAGS) || '[]';
      const blob = new Blob([storedTags], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `hn-live-user-tags-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting tags:', error);
      setError('Failed to export tags');
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
            onClick={exportTags}
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
                onClick={() => onViewUser(userTag.userId)}
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
                      onClick={() => removeTag(userTag.userId, tagName)}
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