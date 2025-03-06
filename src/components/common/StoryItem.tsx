import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HNStory, ThemeOption } from '../../types/common';
import { formatTimeAgo, truncateUrl } from '../../utils/formatters';
import { addToHistory } from '../../services/history';

interface StoryItemProps {
  story: HNStory;
  index: number;
  theme: ThemeOption;
  colorizeUsernames: boolean;
  classicLayout: boolean;
  onViewUser: (userId: string) => void;
  isTopUser?: (username: string) => boolean;
  getTopUserClass?: (theme: ThemeOption) => string;
}

export const StoryItem: React.FC<StoryItemProps> = ({
  story,
  index,
  theme,
  colorizeUsernames,
  classicLayout,
  onViewUser,
  isTopUser = () => false,
  getTopUserClass = () => ''
}) => {
  const navigate = useNavigate();

  const handleNavigateToItem = () => {
    // Add to history
    addToHistory(story.id, {
      title: story.title,
      by: story.by
    });
    navigate(`/item/${story.id}`);
  };

  return (
    <div className="group relative">
      {classicLayout ? (
        <div className="flex items-baseline gap-2">
          <span className="opacity-50">{index + 1}.</span>
          <div className="space-y-1">
            <div>
              <a
                href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                onClick={(e) => {
                  if (!story.url) {
                    e.preventDefault();
                    handleNavigateToItem();
                  }
                }}
                className={`
                  group-hover:opacity-75 break-words
                  ${story.url && theme === 'green' && 'visited:text-green-600/30'}
                  ${story.url && theme === 'og' && 'visited:text-[#999999]'}
                  ${story.url && theme === 'dog' && 'visited:text-[#666666]'}
                `}
                target={story.url ? "_blank" : undefined}
                rel={story.url ? "noopener noreferrer" : undefined}
              >
                {story.title}
              </a>
              {story.url && (
                <span className="ml-2 opacity-50 text-sm truncate inline-block max-w-[150px] align-bottom">
                  ({truncateUrl(new URL(story.url).hostname, 30)})
                </span>
              )}
            </div>
            <div className="text-sm opacity-75">
              {story.score} points by{' '}
              <button 
                onClick={() => onViewUser(story.by)}
                className={`hover:underline ${
                  theme === 'green'
                    ? 'text-green-400'
                    : colorizeUsernames 
                      ? `hn-username ${isTopUser(story.by) ? getTopUserClass(theme) : ''}`
                      : 'opacity-75'
                }`}
              >
                {story.by}
              </button>{' '}
              <span className="opacity-75">•</span>{' '}
              <span className="shrink-0">
                {formatTimeAgo(story.time)}
              </span>{' '}
              <span className="opacity-75">•</span>{' '}
              <button
                onClick={handleNavigateToItem}
                className="hover:underline"
              >
                {story.descendants || 0} comments
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-baseline gap-3">
          <span className={`${theme === 'green' ? 'text-green-500/50' : 'text-[#ff6600]/50'} text-sm font-mono`}>
            {(index + 1).toString().padStart(2, '0')}
          </span>
          <div className="space-y-1 flex-1">
            {story.url && (
              <div className="flex items-center text-sm opacity-50">
                <span className="truncate">
                  {truncateUrl(new URL(story.url).hostname.replace('www.', ''), 40)}
                </span>
                <span className="mx-2">•</span>
                <span className="shrink-0">
                  {formatTimeAgo(story.time)}
                </span>
              </div>
            )}
            {!story.url && (
              <div className="text-sm opacity-50">
                <span className="shrink-0">
                  {formatTimeAgo(story.time)}
                </span>
              </div>
            )}
            <div className="pr-4 break-words">
              <a
                href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                onClick={(e) => {
                  if (!story.url) {
                    e.preventDefault();
                    handleNavigateToItem();
                  }
                }}
                className={`
                  group-hover:opacity-75 break-words
                  ${story.url && theme === 'green' && 'visited:text-green-600/30'}
                  ${story.url && theme === 'og' && 'visited:text-[#999999]'}
                  ${story.url && theme === 'dog' && 'visited:text-[#666666]'}
                `}
                target={story.url ? "_blank" : undefined}
                rel={story.url ? "noopener noreferrer" : undefined}
              >
                {story.title}
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <button 
                onClick={() => onViewUser(story.by)}
                className={`hover:underline ${
                  theme === 'green'
                    ? 'text-green-400'
                    : colorizeUsernames 
                      ? `hn-username ${isTopUser(story.by) ? getTopUserClass(theme) : ''}`
                      : 'opacity-75'
                }`}
              >
                {story.by}
              </button>
              <span className="opacity-75">•</span>
              <span className="font-mono opacity-75">
                {story.score} points
              </span>
              <span className="opacity-75">•</span>
              <button
                onClick={handleNavigateToItem}
                className="opacity-75 hover:opacity-100 hover:underline"
              >
                {story.descendants 
                  ? `${story.descendants} comment${story.descendants === 1 ? '' : 's'}`
                  : 'discuss'
                }
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={`border-b ${
        theme === 'green' 
          ? 'border-green-500/10' 
          : theme === 'og'
          ? 'border-[#ff6600]/5'
          : 'border-[#828282]/10'
      } mt-4`} />
    </div>
  );
}; 