import React from 'react';
import { useTags } from '../../hooks/useTags';

interface TagsTabContentProps {
  theme: 'green' | 'og' | 'dog';
  onUserClick: (username: string) => void;
}

export function TagsTabContent({ theme, onUserClick }: TagsTabContentProps) {
  const { userTags, loading, error, removeTag, exportTags } = useTags();

  if (loading) {
    return <div className={`text-center py-8 opacity-75 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}>Loading tags...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
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
          {userTags.map(tag => (
            <div key={tag.userId} className="space-y-2">
              <button
                onClick={() => onUserClick(tag.userId)}
                className={`${
                  theme === 'green'
                    ? 'text-green-500'
                    : 'text-[#ff6600]'
                } hover:opacity-75`}
              >
                {tag.userId}
              </button>
              <div className="flex flex-wrap gap-2">
                {tag.tags.map(tagName => (
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
                      onClick={() => removeTag(tag.userId, tagName)}
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
} 