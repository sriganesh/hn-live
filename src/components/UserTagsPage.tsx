import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserTagsManager } from './UserTagsManager';
import { MobileBottomBar } from './MobileBottomBar';
import { UserTag } from '../types/UserTag';

interface UserTagsPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: FontOption;
  onShowSearch: () => void;
  onCloseSearch: () => void;
  onShowSettings: () => void;
  isRunning: boolean;
}

export function UserTagsPage({ theme, fontSize, font, onShowSearch, onCloseSearch, onShowSettings, isRunning }: UserTagsPageProps) {
  const navigate = useNavigate();
  const [tags, setTags] = useState<UserTag[]>([]);

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
    try {
      const savedTags: UserTag[] = JSON.parse(localStorage.getItem('hn-user-tags') || '[]');
      // Filter out any entries that don't have tags
      const validTags = savedTags.filter(tag => tag.tags && tag.tags.length > 0);
      setTags(validTags.sort((a, b) => b.timestamp - a.timestamp));
    } catch (e) {
      console.error('Error loading tags:', e);
      setTags([]);
    }
  }, []);

  const removeTag = (userId: string, tagToRemove: string) => {
    const tags: UserTag[] = JSON.parse(localStorage.getItem('hn-user-tags') || '[]');
    const userTagIndex = tags.findIndex(t => t.userId === userId);
    
    if (userTagIndex >= 0) {
      tags[userTagIndex].tags = tags[userTagIndex].tags.filter(t => t !== tagToRemove);
      tags[userTagIndex].timestamp = Date.now();
      
      if (tags[userTagIndex].tags.length === 0) {
        tags.splice(userTagIndex, 1);
      }
      
      localStorage.setItem('hn-user-tags', JSON.stringify(tags));
      setTags(tags.sort((a, b) => b.timestamp - a.timestamp));
    }
  };

  return (
    <div className={`
      fixed inset-0 z-50 overflow-hidden
      ${theme === 'green'
        ? 'bg-black text-green-400'
        : theme === 'og'
        ? 'bg-[#f6f6ef] text-[#828282]'
        : 'bg-[#1a1a1a] text-[#828282]'}
      text-${fontSize}
    `}>
      <div className="h-full overflow-y-auto p-4 pb-20">
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
                / USER TAGS
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <UserTagsManager theme={theme} />
              <button 
                onClick={() => navigate(-1)}
                className="opacity-75 hover:opacity-100"
              >
                [ESC]
              </button>
            </div>
          </div>
        </div>

        {/* Tags List */}
        <div className="max-w-3xl mx-auto">
          {tags.length === 0 ? (
            <div className="text-center py-8 opacity-75">
              No tagged users yet. Click on usernames to add tags.
            </div>
          ) : (
            <div className="space-y-6">
              {tags.map(tag => (
                <div key={tag.userId} className="leading-relaxed">
                  <a
                    href={`/user/${tag.userId}`}
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/user/${tag.userId}`);
                    }}
                    className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} hover:opacity-75`}
                  >
                    {tag.userId}
                  </a>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tag.tags.map(t => (
                      <span
                        key={t}
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
                        {t}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            removeTag(tag.userId, t);
                          }}
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
      </div>

      <MobileBottomBar 
        theme={theme}
        onShowSearch={onShowSearch}
        onCloseSearch={onCloseSearch}
        onShowSettings={onShowSettings}
      />
    </div>
  );
} 