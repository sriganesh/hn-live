import { memo } from 'react';
import { Theme, HNComment } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { TimeStamp, UserLink, ActionButtons } from './common';

interface CommentProps {
  comment: HNComment;
  story: {
    id: number;
    by: string;
    title: string;
  };
  theme: Theme;
  fontSize: string;
  scrollToId?: number;
  onUserClick: (username: string) => void;
  onCollapseComment: (commentId: number, level: number) => void;
  onCollapseThread: (commentId: number) => void;
  onExpandThread: (commentId: number) => void;
  isCollapsed: (commentId: number) => boolean;
  showsCollapseOption: (commentId: number) => boolean;
  countCommentsInTree: (comments: HNComment[]) => number;
}

const getIndentClass = (level: number) => {
  const indentClasses = [
    'pl-0',
    'pl-3',
    'pl-6',
    'pl-9',
    'pl-12',
    'pl-15',
    'pl-18',
    'pl-21',
    'pl-24',
    'pl-27',
    'pl-30'
  ];
  return indentClasses[Math.min(level, indentClasses.length - 1)];
};

const addTargetBlankToLinks = (html: string): string => {
  return html.replace(
    /<a\s+(?:[^>]*?)href="([^"]*)"([^>]*?)>/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer"$2>'
  );
};

export const Comment = memo(function Comment({
  comment,
  story,
  theme,
  fontSize,
  scrollToId,
  onUserClick,
  onCollapseComment,
  onCollapseThread,
  onExpandThread,
  isCollapsed,
  showsCollapseOption,
  countCommentsInTree
}: CommentProps) {
  const styles = useThemeStyles(theme);

  const handleParentClick = () => {
    const parentLevel = comment.level - 1;
    const parentElement = Array.from(document.querySelectorAll(`[data-level="${parentLevel}"]`))
      .find(el => el.querySelector(`[data-comment-id="${comment.id}"]`));
    
    if (parentElement) {
      parentElement.classList.add(styles.highlight);
      parentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        parentElement.classList.remove(styles.highlight);
      }, 2000);
    }
  };

  return (
    <>
      <div 
        id={`comment-${comment.id}`}
        data-level={comment.level}
        data-comment-id={comment.id}
        className={`py-2 ${
          comment.level > 0 
            ? `sm:${getIndentClass(comment.level)} pl-2` 
            : 'pl-0'
        } ${
          comment.id === scrollToId ? styles.highlight : ''
        } ${
          comment.level > 0 
            ? theme === 'og'
              ? 'border-l border-current/10'
              : theme === 'green'
              ? 'border-l border-green-900'
              : 'border-l border-gray-700'
            : ''
        }`}
      >
        <div className="space-y-2">
          <div className={`text-${fontSize}`}>
            <div className="flex items-center justify-between gap-2 mb-1 opacity-75">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0 flex-wrap">
                  <UserLink
                    username={comment.by}
                    isOP={comment.by === story.by}
                    theme={theme}
                    onUserClick={onUserClick}
                  />
                  <span>•</span>
                  <TimeStamp time={comment.time} storyId={story.id} commentId={comment.id} />
                  <span>•</span>
                  <ActionButtons
                    item={{
                      id: comment.id,
                      type: 'comment',
                      text: comment.text,
                      by: comment.by,
                      time: comment.time
                    }}
                    storyId={story.id}
                    storyTitle={story.title}
                    theme={theme}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={() => onCollapseComment(comment.id, comment.level)}
                  className={`shrink-0 ${styles.buttonHover} font-mono`}
                >
                  {isCollapsed(comment.id) ? '[+]' : '[-]'}
                </button>
                {comment.level === 0 && 
                 isCollapsed(comment.id) && 
                 comment.comments && 
                 comment.comments.length > 0 && (
                  <button
                    onClick={() => onExpandThread(comment.id)}
                    className={`text-xs ${styles.buttonHover}`}
                  >
                    [expand thread]
                  </button>
                )}
                {showsCollapseOption(comment.id) && (
                  <>
                    <button
                      onClick={() => onCollapseThread(comment.id)}
                      className={`text-xs ${styles.buttonHover}`}
                    >
                      [collapse thread]
                    </button>
                    <button
                      onClick={handleParentClick}
                      className={`text-xs ${styles.buttonHover}`}
                    >
                      [parent]
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {!isCollapsed(comment.id) && (
            <>
              <div 
                className="prose max-w-none mb-2 break-words whitespace-pre-wrap overflow-x-auto max-w-full"
                dangerouslySetInnerHTML={{ 
                  __html: addTargetBlankToLinks(comment.text) 
                }} 
              />

              {comment.comments?.map((reply, index) => (
                <Comment
                  key={`${reply.id}-${index}`}
                  comment={reply}
                  story={story}
                  theme={theme}
                  fontSize={fontSize}
                  scrollToId={scrollToId}
                  onUserClick={onUserClick}
                  onCollapseComment={onCollapseComment}
                  onCollapseThread={onCollapseThread}
                  onExpandThread={onExpandThread}
                  isCollapsed={isCollapsed}
                  showsCollapseOption={showsCollapseOption}
                  countCommentsInTree={countCommentsInTree}
                />
              ))}
            </>
          )}

          {isCollapsed(comment.id) && comment.comments && comment.comments.length > 0 && (
            <div className="text-sm opacity-50">
              <button 
                onClick={() => onCollapseComment(comment.id, comment.level)}
                className="hover:opacity-75"
              >
                {countCommentsInTree(comment.comments)} hidden replies
              </button>
            </div>
          )}
        </div>
      </div>
      
      {comment.level === 0 && !isCollapsed(comment.id) && (
        <div className={`border-b w-full ${styles.separator} my-4`} />
      )}
    </>
  );
}); 