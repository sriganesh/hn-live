import { memo } from 'react';

interface CommentControlsProps {
  commentId: number;
  level: number;
  theme: 'green' | 'og' | 'dog';
  hasReplies: boolean;
  isCollapsed: boolean;
  showCollapseThread: boolean;
  onCollapse: (commentId: number, level: number) => void;
  onCollapseThread: (commentId: number) => void;
  onExpandThread: (commentId: number) => void;
  onParentClick?: () => void;
  className?: string;
}

export const CommentControls = memo(({
  commentId,
  level,
  theme,
  hasReplies,
  isCollapsed,
  showCollapseThread,
  onCollapse,
  onCollapseThread,
  onExpandThread,
  onParentClick,
  className = ''
}: CommentControlsProps) => {
  const buttonStyle = theme === 'green' 
    ? 'text-green-500/50 hover:text-green-500' 
    : 'text-[#ff6600]/50 hover:text-[#ff6600]';

  return (
    <div className={`flex items-center gap-2 flex-wrap justify-end ${className}`}>
      <button
        onClick={() => onCollapse(commentId, level)}
        className={`shrink-0 ${buttonStyle} font-mono`}
      >
        {isCollapsed ? '[+]' : '[-]'}
      </button>

      {level === 0 && isCollapsed && hasReplies && (
        <button
          onClick={() => onExpandThread(commentId)}
          className={`text-xs ${buttonStyle}`}
        >
          [expand thread]
        </button>
      )}

      {showCollapseThread && (
        <>
          <button
            onClick={() => onCollapseThread(commentId)}
            className={`text-xs ${buttonStyle}`}
          >
            [collapse thread]
          </button>
          {onParentClick && (
            <button
              onClick={onParentClick}
              className={`text-xs ${buttonStyle}`}
            >
              [parent]
            </button>
          )}
        </>
      )}
    </div>
  );
}); 