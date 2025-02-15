import { useState, useCallback, useRef } from 'react';

interface HNComment {
  id: number;
  text: string;
  by: string;
  time: number;
  kids?: number[];
  comments?: HNComment[];
  level: number;
  hasDeepReplies?: boolean;
  isCollapsed?: boolean;
  parentTitle?: string;
}

interface HNStory {
  id: number;
  title: string;
  text?: string;
  url?: string;
  by: string;
  time: number;
  kids?: number[];
  descendants?: number;
  comments?: HNComment[];
  score: number;
}

interface CommentTreeState {
  loadedComments: HNComment[];
  loadedCount: number;
  loadedTotal: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  collapsedComments: Set<number>;
  showCollapseThreadOption: Set<number>;
  threadCollapsedComments: Set<number>;
  isTopLevelOnly: boolean;
}

interface UseCommentTreeOptions {
  maxCommentsPerPage?: number;
  maxDepth?: number;
  useAlgoliaApi?: boolean;
  initialScrollToId?: number;
  story?: HNStory;
}

const fetchComment = async (commentId: number) => {
  const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${commentId}.json`);
  return response.json();
};

const fetchComments = async (
  commentIds: number[], 
  depth: number = 0,
  requiredIds?: Set<number>,
  forceLoad: boolean = false
): Promise<HNComment[]> => {
  if (depth > 5 && !requiredIds?.size && !forceLoad) return [];

  const comments = await Promise.all(
    commentIds.map(async id => {
      try {
        const comment = await fetchComment(id);
        
        if (!comment || comment.dead || comment.deleted) return null;

        let kids: HNComment[] = [];
        if (comment.kids) {
          const isRequired = requiredIds?.has(id) || 
            comment.kids.some((kid: number) => requiredIds?.has(kid));

          kids = await fetchComments(
            comment.kids,
            depth + 1,
            requiredIds,
            isRequired
          );
        }

        return {
          id: comment.id,
          text: comment.text || '',
          by: comment.by || '[deleted]',
          time: comment.time,
          level: depth,
          comments: kids,
          kids: comment.kids,
          hasDeepReplies: comment.kids?.length > kids.length
        } as HNComment;
      } catch (error) {
        console.error('Error fetching comment:', error);
        return null;
      }
    })
  );

  return comments.filter((comment): comment is HNComment => comment !== null);
};

const findRootStoryId = async (itemId: number): Promise<number> => {
  const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`);
  const item = await response.json();
  
  if (item.type === 'story') {
    return item.id;
  } else if (item.parent) {
    return findRootStoryId(item.parent);
  }
  return itemId;
};

export function useCommentTree(storyId: number, options: UseCommentTreeOptions = {}) {
  const [state, setState] = useState<CommentTreeState>({
    loadedComments: [],
    loadedCount: 0,
    loadedTotal: 0,
    hasMore: true,
    isLoadingMore: false,
    collapsedComments: new Set(),
    showCollapseThreadOption: new Set(),
    threadCollapsedComments: new Set(),
    isTopLevelOnly: false
  });

  const isLoadingRef = useRef(false);
  const previousTotalRef = useRef(0);

  const processAlgoliaComments = useCallback((comments: any[], depth: number = 0): HNComment[] => {
    if (!comments || !Array.isArray(comments)) {
      console.log('No comments to process at depth:', depth);
      return [];
    }
    
    console.log(`Processing ${comments.length} comments at depth ${depth}`);
    console.log('Raw comments:', comments);
    
    const validComments = comments.filter(comment => 
      comment && 
      !comment.deleted &&
      comment.id
    );
    
    console.log(`Found ${validComments.length} valid comments at depth ${depth}`);
    
    const processedComments = validComments.map(comment => {
      console.log(`Processing comment ${comment.id} at depth ${depth}:`, comment);
      const processedComment = {
        id: comment.id,
        text: comment.text || '',
        by: comment.author || '[deleted]',
        time: comment.created_at_i,
        level: depth,
        comments: processAlgoliaComments(comment.children || [], depth + 1),
        kids: comment.children?.map((c: any) => c.id) || [],
        hasDeepReplies: false
      };
      console.log(`Processed comment ${comment.id}, has ${processedComment.comments?.length || 0} children`);
      return processedComment;
    });

    return processedComments;
  }, []);

  const collapseComment = useCallback((commentId: number, level: number) => {
    setState(prev => {
      const newCollapsed = new Set(prev.collapsedComments);
      const newShowCollapseThread = new Set(prev.showCollapseThreadOption);
      const newThreadCollapsed = new Set(prev.threadCollapsedComments);
      
      if (newCollapsed.has(commentId)) {
        // Uncollapsing
        newCollapsed.delete(commentId);
        newShowCollapseThread.delete(commentId);
        
        if (newThreadCollapsed.has(commentId)) {
          const removeThreadCollapsed = (comments: HNComment[]) => {
            for (const comment of comments) {
              if (comment.id === commentId) {
                const removeFromSets = (c: HNComment) => {
                  newThreadCollapsed.delete(c.id);
                  newCollapsed.delete(c.id);
                  c.comments?.forEach(removeFromSets);
                };
                removeFromSets(comment);
                return true;
              }
              if (comment.comments && removeThreadCollapsed(comment.comments)) {
                return true;
              }
            }
            return false;
          };
          removeThreadCollapsed(prev.loadedComments);
        }
      } else {
        // Collapsing
        newCollapsed.add(commentId);
        if (level > 0) {
          newShowCollapseThread.add(commentId);
        }
      }
      
      return {
        ...prev,
        collapsedComments: newCollapsed,
        showCollapseThreadOption: newShowCollapseThread,
        threadCollapsedComments: newThreadCollapsed
      };
    });
  }, []);

  const collapseThread = useCallback((commentId: number) => {
    setState(prev => {
      const newCollapsed = new Set(prev.collapsedComments);
      const newThreadCollapsed = new Set(prev.threadCollapsedComments);
      
      // First find the root parent of this comment
      const findRootParent = (comments: HNComment[], targetId: number): HNComment | null => {
        // First check if this comment is our target
        const targetComment = comments.find(c => c.id === targetId);
        if (targetComment) {
          return targetComment;
        }

        // Then recursively check children
        for (const comment of comments) {
          if (comment.comments) {
            const found = findRootParent(comment.comments, targetId);
            if (found) {
              // If we found the target in this comment's children, return this comment
              return comment;
            }
          }
        }
        return null;
      };

      // Find the root level comment for this thread
      const findRootLevelComment = (comments: HNComment[], targetId: number): HNComment | null => {
        for (const comment of comments) {
          if (comment.level === 0) {
            // Check if this root comment contains our target
            const containsTarget = (c: HNComment): boolean => {
              if (c.id === targetId) return true;
              return c.comments?.some(containsTarget) || false;
            };
            
            if (containsTarget(comment)) {
              return comment;
            }
          }
          
          // Check nested comments
          const found = comment.comments?.find(c => findRootLevelComment([c], targetId));
          if (found) return findRootLevelComment([found], targetId);
        }
        return null;
      };

      const rootParent = findRootParent(prev.loadedComments, commentId);
      
      // If we found the root parent, collapse it and all its children
      if (rootParent) {
        const addToCollapsed = (comment: HNComment) => {
          newCollapsed.add(comment.id);
          newThreadCollapsed.add(comment.id);  // Mark as collapsed by thread
          comment.comments?.forEach(addToCollapsed);
        };
        
        // Start with the root parent itself
        addToCollapsed(rootParent);

        // Find and scroll to the root level comment
        const rootLevelComment = findRootLevelComment(prev.loadedComments, commentId);
        if (rootLevelComment) {
          setTimeout(() => {
            const element = document.getElementById(`comment-${rootLevelComment.id}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }
      }

      return {
        ...prev,
        collapsedComments: newCollapsed,
        threadCollapsedComments: newThreadCollapsed,
        showCollapseThreadOption: new Set() // Clear all collapse thread options
      };
    });
  }, []);

  const expandThread = useCallback((commentId: number) => {
    setState(prev => {
      const newCollapsed = new Set(prev.collapsedComments);
      
      const expandCommentTree = (comments: HNComment[]): boolean => {
        for (const comment of comments) {
          if (comment.id === commentId) {
            const removeFromCollapsed = (c: HNComment) => {
              newCollapsed.delete(c.id);
              c.comments?.forEach(removeFromCollapsed);
            };
            removeFromCollapsed(comment);
            return true;
          }
          if (comment.comments && expandCommentTree(comment.comments)) {
            return true;
          }
        }
        return false;
      };
      
      expandCommentTree(prev.loadedComments);
      
      return {
        ...prev,
        collapsedComments: newCollapsed,
        threadCollapsedComments: new Set(
          Array.from(prev.threadCollapsedComments)
            .filter(id => newCollapsed.has(id))
        )
      };
    });
  }, []);

  const toggleTopLevelOnly = useCallback(() => {
    setState(prev => {
      const newCollapsed = new Set(prev.collapsedComments);
      
      if (!prev.isTopLevelOnly) {
        const collapseNonRootComments = (comments: HNComment[]) => {
          comments.forEach(comment => {
            if (comment.level > 0) {
              newCollapsed.add(comment.id);
            }
            if (comment.comments) {
              collapseNonRootComments(comment.comments);
            }
          });
        };
        
        collapseNonRootComments(prev.loadedComments);
      } else {
        newCollapsed.clear();
      }
      
      return {
        ...prev,
        isTopLevelOnly: !prev.isTopLevelOnly,
        collapsedComments: newCollapsed,
        showCollapseThreadOption: new Set(),
        threadCollapsedComments: new Set()
      };
    });
  }, []);

  const loadMore = useCallback(async () => {
    if (!storyId || state.isLoadingMore || isLoadingRef.current) return;
    
    console.log('Starting loadMore with storyId:', storyId);
    console.log('Current state:', state);
    
    if (options.useAlgoliaApi && previousTotalRef.current > 0) {
      console.log('Already loaded all comments from Algolia');
      setState(prev => ({ ...prev, hasMore: false }));
      return;
    }

    if (!options.useAlgoliaApi && previousTotalRef.current === state.loadedTotal) {
      setState(prev => ({ ...prev, hasMore: false }));
      return;
    }

    previousTotalRef.current = state.loadedTotal;
    isLoadingRef.current = true;
    setState(prev => ({ ...prev, isLoadingMore: true }));
    
    try {
      if (options.useAlgoliaApi) {
        console.log('Using Algolia API to fetch comments');
        let commentsToProcess: any[] = [];
        
        // First find the root story ID
        const rootStoryId = await findRootStoryId(storyId);
        console.log('Found root story ID:', rootStoryId);
        
        // Always fetch from Algolia to get the complete comment tree
        console.log('Fetching complete comment tree from Algolia for story:', rootStoryId);
        const response = await fetch(`https://hn.algolia.com/api/v1/items/${rootStoryId}`);
        const algoliaData = await response.json();
        console.log('Algolia response received:', algoliaData);
        commentsToProcess = algoliaData.children || [];

        console.log('Comments to process:', commentsToProcess);
        const processedComments = processAlgoliaComments(commentsToProcess);
        const totalComments = countCommentsInTree(processedComments);
        
        console.log('Processed comments:', processedComments);
        console.log('Total comments:', totalComments);
        
        setState(prev => ({
          ...prev,
          loadedComments: processedComments,
          loadedCount: processedComments.length,
          loadedTotal: totalComments,
          hasMore: false,
          isLoadingMore: false
        }));
      } else {
        console.log('Using Firebase API');
        const story = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`)
          .then(res => res.json());

        const nextBatch = story.kids?.slice(
          state.loadedCount,
          state.loadedCount + (options.maxCommentsPerPage || 5)
        ) || [];

        if (nextBatch.length === 0) {
          setState(prev => ({ ...prev, hasMore: false, isLoadingMore: false }));
          return;
        }

        const newComments = await fetchComments(nextBatch);
        console.log('Firebase new comments:', newComments);
        
        setState(prev => {
          const allComments = [...prev.loadedComments, ...newComments];
          const newTotal = countCommentsInTree(allComments);
          const isComplete = story.descendants && newTotal >= story.descendants;
          const noNewComments = allComments.length === prev.loadedComments.length;

          return {
            ...prev,
            loadedComments: allComments,
            loadedCount: allComments.length,
            loadedTotal: newTotal,
            hasMore: !isComplete && !noNewComments,
            isLoadingMore: false
          };
        });
      }
    } catch (error) {
      console.error('Error loading comments:', error);
      setState(prev => ({ ...prev, hasMore: false, isLoadingMore: false }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [storyId, state.loadedCount, state.loadedTotal, options.maxCommentsPerPage, options.useAlgoliaApi, processAlgoliaComments]);

  const countCommentsInTree = (comments: HNComment[]): number => {
    return comments.reduce((count, comment) => {
      return count + 1 + (comment.comments ? countCommentsInTree(comment.comments) : 0);
    }, 0);
  };

  const updateComments = useCallback((newComments: HNComment[]) => {
    setState(prev => ({
      ...prev,
      loadedComments: newComments,
      loadedCount: newComments.length,
      loadedTotal: countCommentsInTree(newComments),
      hasMore: false,
      isLoadingMore: false
    }));
  }, []);

  return {
    state,
    actions: {
      collapseComment,
      collapseThread,
      expandThread,
      toggleTopLevelOnly,
      loadMore,
      updateComments
    },
    utils: {
      isCollapsed: (commentId: number) => state.collapsedComments.has(commentId),
      isThreadCollapsed: (commentId: number) => state.threadCollapsedComments.has(commentId),
      showsCollapseOption: (commentId: number) => state.showCollapseThreadOption.has(commentId),
      countCommentsInTree
    }
  };
} 