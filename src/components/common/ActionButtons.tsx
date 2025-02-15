import { memo } from 'react';
import { BookmarkButton } from '../BookmarkButton';
import { CopyButton } from '../CopyButton';

interface ActionButtonsProps {
  item: {
    id: number;
    type: 'story' | 'comment';
    title?: string;
    text?: string;
    by: string;
    time: number;
    url?: string;
  };
  storyId?: number;
  storyTitle?: string;
  theme: 'green' | 'og' | 'dog';
  variant?: 'text' | 'icon';
  showReply?: boolean;
  className?: string;
}

export const ActionButtons = memo(({ 
  item, 
  storyId, 
  storyTitle,
  theme, 
  variant = 'icon',
  showReply = true,
  className = ''
}: ActionButtonsProps) => {
  const isStory = item.type === 'story';
  const url = isStory 
    ? `https://hn.live/item/${item.id}`
    : `https://hn.live/item/${storyId}/comment/${item.id}`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <BookmarkButton
        item={item}
        storyId={storyId}
        storyTitle={storyTitle}
        theme={theme}
        variant={variant}
      />
      <span>•</span>
      <CopyButton 
        url={url}
        theme={theme}
        variant={variant}
      />
      {showReply && !isStory && (
        <>
          <span>•</span>
          <a
            href={`https://news.ycombinator.com/reply?id=${item.id}&goto=item%3Fid%3D${storyId}%23${item.id}`}
            className="hover:opacity-75 transition-opacity flex items-center"
            target="_blank"
            rel="noopener noreferrer"
            title="Reply on Hacker News"
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          </a>
        </>
      )}
    </div>
  );
}); 