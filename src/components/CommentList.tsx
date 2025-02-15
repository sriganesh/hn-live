import { memo, useCallback, useMemo } from 'react';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { Theme, HNComment } from '../types';
import { Comment } from './Comment';
import { TimeStamp, UserLink, ActionButtons } from './common';

interface CommentListProps {
  comments: HNComment[];
  grepState: {
    isActive: boolean;
    searchTerm: string;
    matchedComments: HNComment[];
  };
  sortMode: 'nested' | 'recent';
  theme: Theme;
  useAlgoliaApi: boolean;
  story: {
    id: number;
    by: string;
    title: string;
  };
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

export const CommentList = memo(function CommentList({
  comments,
  grepState,
  sortMode,
  theme,
  useAlgoliaApi,
  story,
  fontSize,
  scrollToId,
  onUserClick,
  onCollapseComment,
  onCollapseThread,
  onExpandThread,
  isCollapsed,
  showsCollapseOption,
  countCommentsInTree
}: CommentListProps) {
  const styles = useThemeStyles(theme);

  // Helper function to find parent comment text
  const findParentComment = useCallback((comments: HNComment[], targetLevel: number, targetId: number): string | null => {
    for (const comment of comments) {
      if (comment.comments) {
        for (const child of comment.comments) {
          if (child.id === targetId) {
            // Found the parent
            return comment.text.replace(/<[^>]*>/g, '').slice(0, 60) + (comment.text.length > 60 ? '...' : '');
          }
          // Recursively search in child's comments
          const found = findParentComment(comment.comments, targetLevel, targetId);
          if (found) return found;
        }
      }
    }
    return null;
  }, []);

  // Get all comments in chronological order
  const recentComments = useMemo(() => {
    if (!useAlgoliaApi || sortMode !== 'recent') return [];
    
    // Collect all comments in a flat array
    const allComments: HNComment[] = [];
    const processComment = (comment: HNComment) => {
      const parentText = comment.level > 0 ? findParentComment(comments, comment.level, comment.id) : null;
      allComments.push({
        ...comment,
        parentText: parentText || (comment.level > 0 ? story.title : null)
      });
      comment.comments?.forEach(processComment);
    };
    comments.forEach(processComment);
    
    // Sort by timestamp, most recent first
    return allComments.sort((a, b) => b.time - a.time);
  }, [comments, sortMode, useAlgoliaApi, findParentComment, story.title]);

  if (grepState.isActive && grepState.searchTerm) {
    return grepState.matchedComments.length > 0 ? (
      <div className="space-y-4">
        {grepState.matchedComments.map((comment, index) => (
          <Comment
            key={`grep-${comment.id}-${index}`}
            comment={comment}
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
      </div>
    ) : (
      <div className="text-center py-8 opacity-75">
        No matching comments found
      </div>
    );
  }

  if (useAlgoliaApi && sortMode === 'recent') {
    return (
      <div className="space-y-4">
        {recentComments.map((comment, index) => (
          <div 
            key={`recent-${comment.id}-${index}`} 
            className={`py-2 ${styles.separator}`}
          >
            <div className="space-y-2">
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
                    <span>•</span>
                    <span className="opacity-75">
                      re: {comment.level === 0 ? story.title : comment.parentText}
                    </span>
                  </div>
                </div>
              </div>
              <div 
                className="prose max-w-none break-words whitespace-pre-wrap overflow-x-auto"
                dangerouslySetInnerHTML={{ __html: comment.text }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment, index) => (
        <Comment
          key={`${comment.id}-${index}`}
          comment={comment}
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
    </div>
  );
}); 