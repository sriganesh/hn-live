import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTopUsers } from '../hooks/useTopUsers';
import { UserModal } from './UserModal';
import { BookmarkButton } from './BookmarkButton';

interface StoryViewProps {
  itemId: number;
  scrollToId?: number;
  onClose: () => void;
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: FontOption;
  onShowSettings: () => void;
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
}

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
}

const MAX_COMMENTS = 5;  
const MAX_DEPTH = 5;     // Maximum nesting depth for replies

// Add this at the top of the file
const isDev = import.meta.env.DEV;

// Story fetching function
const fetchStory = async (storyId: number) => {
  const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`);
  return response.json();
};

async function findRootStoryId(itemId: number): Promise<number> {
  const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`);
  const item = await response.json();
  
  if (item.type === 'story') {
    return item.id;
  } else if (item.parent) {
    return findRootStoryId(item.parent);
  }
  return itemId; // fallback
}

function addTargetBlankToLinks(html: string): string {
  return html.replace(
    /<a\s+(?:[^>]*?)href="([^"]*)"([^>]*?)>/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer"$2>'
  );
}

// First, let's create a helper function for indentation
const getIndentClass = (level: number) => {
  // Create an array of possible indent classes with smaller increments
  const indentClasses = [
    'pl-0',
    'pl-3',  // reduced from pl-4
    'pl-6',  // reduced from pl-8
    'pl-9',  // reduced from pl-12
    'pl-12', // reduced from pl-16
    'pl-15', // reduced from pl-20
    'pl-18', // reduced from pl-24
    'pl-21', // reduced from pl-28
    'pl-24', // reduced from pl-32
    'pl-27', // reduced from pl-36
    'pl-30'  // reduced from pl-40
  ];
  // Return the appropriate class based on level, max out at the last defined level
  return indentClasses[Math.min(level, indentClasses.length - 1)];
};

// Add this helper function to find the complete path to a comment
const findCommentPath = async (commentId: number): Promise<number[]> => {
  const path: number[] = [];
  let currentId = commentId;

  while (currentId) {
    path.unshift(currentId);
    const comment = await fetch(`https://hacker-news.firebaseio.com/v0/item/${currentId}.json`)
      .then(res => res.json());
    
    if (!comment.parent) break; // Stop if we reach the story (no parent)
    currentId = comment.parent;
  }

  return path;
};

// Add a helper to track loaded comment IDs
const getCommentIds = (comments: HNComment[]): Set<number> => {
  const ids = new Set<number>();
  const addIds = (comment: HNComment) => {
    ids.add(comment.id);
    comment.comments?.forEach(addIds);
  };
  comments.forEach(addIds);
  return ids;
};

// Update the fetchComment function to remove caching
const fetchComment = async (commentId: number) => {
  const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${commentId}.json`);
  return response.json();
};

// Add this helper to find all necessary comment IDs to load
const findRequiredCommentIds = async (targetId: number): Promise<{
  parentChain: number[];
  topLevelParentIndex: number;
}> => {
  const parentChain: number[] = [];
  let currentId = targetId;
  let topLevelParentIndex = -1;

  while (currentId) {
    const comment = await fetch(`https://hacker-news.firebaseio.com/v0/item/${currentId}.json`)
      .then(res => res.json());
    
    parentChain.unshift(currentId);
    
    if (!comment.parent || comment.type === 'story') {
      break;
    }
    currentId = comment.parent;
  }

  // Get the story to find the index of the top-level parent
  const story = await fetch(`https://hacker-news.firebaseio.com/v0/item/${currentId}.json`)
    .then(res => res.json());
  
  if (story.kids) {
    topLevelParentIndex = story.kids.indexOf(parentChain[0]);
  }

  return { parentChain, topLevelParentIndex };
};

// Update the fetchComments function to restore original behavior
const fetchComments = async (
  commentIds: number[], 
  depth: number = 0,
  requiredIds?: Set<number>,
  forceLoad: boolean = false
): Promise<HNComment[]> => {
  if (depth > MAX_DEPTH && !requiredIds?.size && !forceLoad) return [];

  const comments = await Promise.all(
    commentIds.map(async id => {
      try {
        const comment = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
          .then(res => res.json());
        
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
        };
      } catch (error) {
        console.error('Error fetching comment:', error);
        return null;
      }
    })
  );

  return comments.filter((comment): comment is HNComment => comment !== null);
};

// Add a helper function to count total comments including replies
const countCommentsInTree = (comments: HNComment[]): number => {
  return comments.reduce((count, comment) => {
    return count + 1 + (comment.comments ? countCommentsInTree(comment.comments) : 0);
  }, 0);
};

// Update the state interface to track loaded comments
interface StoryViewState {
  loadedComments: HNComment[];
  loadedCount: number;
  loadedTotal: number;  // New field to track total including replies
  hasMore: boolean;
  isLoadingMore: boolean;
  collapsedComments: Set<number>;
}

// Add this near the top with other utility functions
const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
};

// Update the CopyButton component to be more minimal
const CopyButton = ({ url, theme }: { url: string; theme: 'green' | 'og' | 'dog' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="hover:underline"
    >
      {copied ? 'copied!' : 'copy'}
    </button>
  );
};

// Add this helper function at the top of the file
const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return 'now';
  }
};

// Add a function to track seen comments
const getUniqueComments = (comments: HNComment[]): HNComment[] => {
  const seen = new Set<number>();
  
  const filterUnique = (comment: HNComment): HNComment => {
    if (comment.comments) {
      comment.comments = comment.comments
        .filter(c => !seen.has(c.id))
        .map(c => {
          seen.add(c.id);
          return filterUnique(c);
        });
    }
    return comment;
  };

  return comments
    .filter(c => !seen.has(c.id))
    .map(c => {
      seen.add(c.id);
      return filterUnique(c);
    });
};

// Add this near the top with other interfaces
interface GrepState {
  isActive: boolean;
  searchTerm: string;
  matchedComments: HNComment[];
}

// Add this helper function to highlight matched text
const highlightText = (text: string, searchTerm: string): string => {
  if (!searchTerm) return text;
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark class="bg-current/20">$1</mark>');
};

// Update the grepComments function to include the full comment path and highlight matches
const grepComments = (comments: HNComment[], searchTerm: string): HNComment[] => {
  const matches: HNComment[] = [];
  
  const search = (comment: HNComment) => {
    const textContent = comment.text?.toLowerCase() || '';
    const authorContent = comment.by.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    if (textContent.includes(searchLower) || authorContent.includes(searchLower)) {
      // Create a new comment object with highlighted text
      const highlightedComment = {
        ...comment,
        text: comment.text ? highlightText(comment.text, searchTerm) : ''
      };
      matches.push(highlightedComment);
    }
    
    comment.comments?.forEach(search);
  };
  
  comments.forEach(search);
  return matches;
};

// Add this helper function to count replies
const countReplies = (comment: HNComment): number => {
  let count = 0;
  if (comment.comments) {
    count += comment.comments.length;
    for (const reply of comment.comments) {
      count += countReplies(reply);
    }
  }
  return count;
};

export function StoryView({ itemId, scrollToId, onClose, theme, fontSize, font, onShowSettings }: StoryViewProps) {
  const navigate = useNavigate();
  const { isTopUser, getTopUserClass } = useTopUsers();
  
  const [story, setStory] = useState<HNStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentState, setCommentState] = useState<StoryViewState>({
    loadedComments: [],
    loadedCount: 0,
    loadedTotal: 0,
    hasMore: false,
    isLoadingMore: false,
    collapsedComments: new Set()
  });

  // Add these inside the StoryView component, near other state declarations
  const [grepState, setGrepState] = useState<GrepState>({
    isActive: false,
    searchTerm: '',
    matchedComments: []
  });

  // Add state for UserModal
  const [viewingUser, setViewingUser] = useState<string | null>(null);

  // Add this helper to collapse entire thread
  const collapseEntireThread = useCallback((commentId: number) => {
    setCommentState(prev => {
      const newCollapsed = new Set(prev.collapsedComments);
      
      // Helper to recursively find all comment IDs in a thread
      const addThreadToCollapsed = (comments: HNComment[]) => {
        comments.forEach(comment => {
          if (comment.id === commentId) {
            newCollapsed.add(comment.id);
            comment.comments?.forEach(reply => {
              newCollapsed.add(reply.id);
              if (reply.comments) addThreadToCollapsed(reply.comments);
            });
          } else if (comment.comments) {
            addThreadToCollapsed(comment.comments);
          }
        });
      };

      addThreadToCollapsed(prev.loadedComments);
      return { ...prev, collapsedComments: newCollapsed };
    });
  }, []);

  // Add this inside StoryView component, after other state declarations
  const handleGrepToggle = () => {
    setGrepState(prev => ({
      ...prev,
      isActive: !prev.isActive,
      matchedComments: prev.isActive ? [] : prev.matchedComments
    }));
  };

  const handleGrepSearch = (term: string) => {
    setGrepState(prev => ({
      ...prev,
      searchTerm: term,
      matchedComments: term ? grepComments(commentState.loadedComments, term) : []
    }));
  };

  // Add this handler outside renderComment
  const handleCollapseComment = useCallback((commentId: number) => {
    setCommentState(prev => ({
      ...prev,
      collapsedComments: prev.collapsedComments.has(commentId)
        ? new Set([...prev.collapsedComments].filter(id => id !== commentId))
        : new Set([...prev.collapsedComments, commentId])
    }));
  }, []);

  // Update the useEffect that handles initial data fetching
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const rootStoryId = await findRootStoryId(itemId);
        const storyData = await fetchStory(rootStoryId);
        
        let initialComments: HNComment[] = [];
        let requiredIds: Set<number> | undefined;

        if (storyData.kids) {
          // First, if we have a scrollToId, find its parent chain
          if (scrollToId) {
            const comment = await fetch(`https://hacker-news.firebaseio.com/v0/item/${scrollToId}.json`)
              .then(res => res.json());
            
            // Find the top-level parent of this comment
            let currentId = scrollToId;
            let targetCommentChain: number[] = [];
            while (currentId) {
              targetCommentChain.unshift(currentId);
              const parent = await fetch(`https://hacker-news.firebaseio.com/v0/item/${currentId}.json`)
                .then(res => res.json());
              
              if (parent.parent === storyData.id || !parent.parent) break;
              currentId = parent.parent;
            }
            
            requiredIds = new Set(targetCommentChain);
          }

          // Load first few comments
          const firstFewComments = storyData.kids.slice(0, MAX_COMMENTS);
          
          // If our target comment's thread isn't in first batch, add it
          if (scrollToId && requiredIds) {
            const topLevelParentId = Array.from(requiredIds)[0];
            if (!firstFewComments.includes(topLevelParentId)) {
              firstFewComments.push(topLevelParentId);
            }
          }

          // Load all these comments
          initialComments = await fetchComments(
            firstFewComments,
            0,
            requiredIds,
            true // Force load the entire chain
          );
        }

        setCommentState({
          loadedComments: initialComments,
          loadedCount: initialComments.length,
          loadedTotal: countCommentsInTree(initialComments),
          hasMore: (storyData.kids?.length || 0) > MAX_COMMENTS,
          isLoadingMore: false,
          collapsedComments: new Set()
        });

        if (scrollToId) {
          setTimeout(() => {
            const element = document.getElementById(`comment-${scrollToId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('highlight');
            }
          }, 100);
        }

        setStory(storyData);
      } catch (error) {
        console.error('Error fetching story:', error);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [itemId, scrollToId]);

  // Add these refs at the top of the StoryView component
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  // Add a loading state ref to prevent multiple simultaneous loads
  const isLoadingRef = useRef(false);
  const previousTotalRef = useRef(0);

  // Update the loadMore callback with stricter checks and logging
  const loadMore = useCallback(async () => {
    if (!story || commentState.isLoadingMore || isLoadingRef.current) return;
    
    // Check if we've already loaded everything
    if (story.descendants && commentState.loadedTotal >= story.descendants) {
      setCommentState(prev => ({ ...prev, hasMore: false }));
      return;
    }

    // Check if we're making progress
    if (previousTotalRef.current === commentState.loadedTotal) {
      console.log('No progress since last load, stopping');
      setCommentState(prev => ({ ...prev, hasMore: false }));
      return;
    }

    previousTotalRef.current = commentState.loadedTotal;
    isLoadingRef.current = true;
    setCommentState(prev => ({ ...prev, isLoadingMore: true }));
    
    try {
      const nextBatch = story.kids?.slice(
        commentState.loadedCount,
        commentState.loadedCount + MAX_COMMENTS
      ) || [];

      if (nextBatch.length === 0) {
        setCommentState(prev => ({ ...prev, hasMore: false, isLoadingMore: false }));
        return;
      }

      const newComments = await fetchComments(nextBatch);
      const allComments = getUniqueComments([...commentState.loadedComments, ...newComments]);
      const newTotal = countCommentsInTree(allComments);

      const isComplete = story.descendants && newTotal >= story.descendants;
      const noNewComments = allComments.length === commentState.loadedComments.length;

      setCommentState(prev => ({
        ...prev,
        loadedComments: allComments,
        loadedCount: allComments.length,
        loadedTotal: newTotal,
        hasMore: !isComplete && !noNewComments,
        isLoadingMore: false,
        collapsedComments: prev.collapsedComments // Preserve collapsed state
      }));
    } catch (error) {
      console.error('Error loading more comments:', error);
      setCommentState(prev => ({ ...prev, hasMore: false, isLoadingMore: false }));
    } finally {
      isLoadingRef.current = false;
    }
  }, [story, commentState.loadedCount, commentState.loadedTotal, commentState.isLoadingMore]);

  // Update the observer setup with increased debounce time
  useEffect(() => {
    if (!story || !commentState.hasMore || commentState.isLoadingMore) {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      return;
    }

    let timeoutId: NodeJS.Timeout;
    
    const options = {
      root: null,
      rootMargin: '1000px',
      threshold: 0.1
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      const target = entries[0];
      if (target.isIntersecting) {
        // Increase debounce delay
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          loadMore();
        }, 1000); // Increased to 1 second delay
      }
    };

    observerRef.current = new IntersectionObserver(handleIntersection, options);
    
    if (loadingRef.current) {
      observerRef.current.observe(loadingRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      clearTimeout(timeoutId);
    };
  }, [story, commentState.hasMore, commentState.isLoadingMore, loadMore]);

  // Update the ESC key handler useEffect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Ctrl+F or Cmd+F (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault(); // Prevent browser's default find
        setGrepState(prev => ({
          ...prev,
          isActive: true,
          searchTerm: prev.searchTerm // Preserve previous search term
        }));
        return;
      }

      // Handle ESC
      if (e.key === 'Escape') {
        if (grepState.isActive) {
          setGrepState(prev => ({
            ...prev,
            isActive: false,
            searchTerm: '',
            matchedComments: []
          }));
        } else {
          navigate('/');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, grepState.isActive]);

  useEffect(() => {
    // Track story view
    window.gtag?.('event', 'view_story', {
      story_id: itemId
    });
  }, [itemId]);

  const themeColors = theme === 'green'
    ? 'text-green-400 bg-black'
    : theme === 'og'
    ? 'text-[#828282] bg-[#f6f6ef]'
    : 'text-[#828282] bg-[#1a1a1a]';

  // Update the renderComment function
  const renderComment = useCallback((comment: HNComment, path: string = '') => (
    <Fragment key={`${comment.id}-${path}`}>
      <div 
        id={`comment-${comment.id}`}
        className={`py-2 ${
          comment.level > 0 
            ? `sm:${getIndentClass(comment.level)} pl-2` 
            : 'pl-0'
        } ${
          comment.id === scrollToId 
            ? theme === 'dog'
              ? 'bg-yellow-500/5' 
              : theme === 'green'
              ? 'bg-green-500/20' 
              : 'bg-yellow-500/10'
            : ''
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
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <a 
                    onClick={(e) => {
                      e.preventDefault();
                      setViewingUser(comment.by);
                    }}
                    href={`/user/${comment.by}`}
                    className={`hn-username hover:underline truncate ${
                      isTopUser(comment.by) ? getTopUserClass(theme) : ''
                    }`}
                  >
                    {comment.by}
                  </a>
                  {story && comment.by === story.by && (
                    <span className={`shrink-0 ${
                      theme === 'green' 
                        ? 'text-green-500/75' 
                        : theme === 'og'
                        ? 'text-[#ff6600]/75'
                        : 'text-[#828282]/75'
                    }`}>
                      [OP]
                    </span>
                  )}
                </div>

                <span>•</span>
                <a
                  href={`https://news.ycombinator.com/item?id=${story?.id}#${comment.id}`}
                  className="hover:underline shrink-0"
                  target="_blank"
                  rel="noopener noreferrer"
                  title={new Date(comment.time * 1000).toLocaleString()}
                >
                  {formatTimeAgo(comment.time)}
                </a>
                <span>•</span>
                <BookmarkButton
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
                  variant="text"
                />
                <span>•</span>
                <a
                  href={`https://news.ycombinator.com/reply?id=${comment.id}&goto=item%3Fid%3D${story?.id}%23${comment.id}`}
                  className="hover:underline shrink-0"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  reply
                </a>
              </div>

              <button
                onClick={() => handleCollapseComment(comment.id)}
                className={`shrink-0 ${
                  theme === 'green' 
                    ? 'text-green-500/50 hover:text-green-500' 
                    : 'text-[#ff6600]/50 hover:text-[#ff6600]'
                } font-mono`}
              >
                {commentState?.collapsedComments?.has(comment.id) ? '[+]' : '[-]'}
              </button>
            </div>
          </div>

          {!commentState?.collapsedComments?.has(comment.id) && (
            <>
              <div 
                className="prose max-w-none mb-4 break-words whitespace-pre-wrap overflow-hidden"
                dangerouslySetInnerHTML={{ 
                  __html: addTargetBlankToLinks(comment.text) 
                }} 
              />

              {/* Nested comments */}
              {comment.comments?.map((reply, index) => 
                renderComment(reply, `${path}-${index}`)
              )}
            </>
          )}

          {/* Show reply count when collapsed */}
          {commentState?.collapsedComments?.has(comment.id) && comment.comments && comment.comments.length > 0 && (
            <div className="text-sm opacity-50">
              <button 
                onClick={() => handleCollapseComment(comment.id)}
                className="hover:opacity-75"
              >
                {countReplies(comment)} hidden replies
              </button>
            </div>
          )}

          {/* Load more replies button */}
          {!commentState?.collapsedComments?.has(comment.id) && comment.hasDeepReplies && comment.kids && (
            <div className="mt-2 text-sm">
              <button
                onClick={async () => {
                  const moreReplies = await fetchComments(comment.kids || [], comment.level, undefined, true);
                  setCommentState(prev => ({
                    ...prev,
                    loadedComments: updateCommentTree(prev.loadedComments, comment.id, moreReplies)
                  }));
                }}
                className={`${
                  theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                } opacity-75 hover:opacity-100`}
              >
                Load more replies...
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Move separator outside the comment div and only show for root comments */}
      {comment.level === 0 && !commentState?.collapsedComments?.has(comment.id) && (
        <div className={`border-b w-full ${
          theme === 'green' 
            ? 'border-green-500/10' 
            : theme === 'og'
            ? 'border-[#ff6600]/10'
            : 'border-[#828282]/10'
        } my-4`} />
      )}
    </Fragment>
  ), [commentState, theme, scrollToId, story, handleCollapseComment, fontSize]);

  // Add this helper function for updating the comment tree
  const updateCommentTree = (comments: HNComment[], targetId: number, newReplies: HNComment[]): HNComment[] => {
    return comments.map(c => {
      if (c.id === targetId) {
        return {
          ...c,
          comments: newReplies,
          hasDeepReplies: false
        };
      }
      if (c.comments) {
        return {
          ...c,
          comments: updateCommentTree(c.comments, targetId, newReplies)
        };
      }
      return c;
    });
  };

  const handleClose = () => {
    navigate('/');
  };

  const renderStoryPreview = (story: HNStory) => {
    return (
      <div className="group">
        <div className="space-y-1">
          {/* Title as main content */}
          <div className="font-medium">
            {story.title}
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm opacity-75">
            <span>{story.by}</span>
            <span>•</span>
            <span>{formatTimeAgo(story.time)}</span>
            {story.descendants !== undefined && (
              <>
                <span>•</span>
                <span>
                  {story.descendants 
                    ? `${story.descendants} comment${story.descendants === 1 ? '' : 's'}`
                    : 'discuss'
                  }
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {story && (
        <Helmet>
          <title>{`${story.title} | HN Live`}</title>
          <meta 
            name="description" 
            content={`${story.text?.slice(0, 155).replace(/<[^>]*>/g, '')}...` || 
              `Discussion of "${story.title}" on Hacker News Live`} 
          />
          <link rel="canonical" href={`https://hn.live/item/${story.id}`} />
        </Helmet>
      )}
      <div className={`
        fixed inset-0 z-50 overflow-hidden
        ${font === 'mono' ? 'font-mono' : 
          font === 'jetbrains' ? 'font-jetbrains' :
          font === 'fira' ? 'font-fira' :
          font === 'source' ? 'font-source' :
          font === 'sans' ? 'font-sans' :
          font === 'serif' ? 'font-serif' :
          'font-system'}
        ${theme === 'green'
          ? 'bg-black text-green-400'
          : theme === 'og'
          ? 'bg-[#f6f6ef] text-[#828282]'
          : 'bg-[#1a1a1a] text-[#828282]'}
        text-${fontSize}
      `}>
        <div className="story-container h-full overflow-y-auto overflow-x-hidden p-4 pb-32">
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={handleClose}
              className={`${
                theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
              } font-bold tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity`}
            >
              HN
              <span className="animate-pulse">
                <span className={`inline-block w-2 h-2 rounded-full bg-current opacity-50`}></span>
              </span>
              LIVE
            </button>
            <div className="flex items-center gap-4">
              {grepState.isActive ? (
                <input
                  type="text"
                  value={grepState.searchTerm}
                  onChange={(e) => handleGrepSearch(e.target.value)}
                  placeholder="grep comment:"
                  className="bg-transparent border-b border-current/20 px-1 py-0.5 focus:outline-none focus:border-current/40 w-32"
                  autoFocus
                />
              ) : (
                <button 
                  onClick={handleGrepToggle}
                  className="opacity-75 hover:opacity-100"
                >
                  [GREP]
                </button>
              )}
              <button 
                onClick={onShowSettings}
                className="opacity-75 hover:opacity-100 hidden sm:block"
              >
                [SETTINGS]
              </button>
              <button 
                onClick={() => navigate('/')}
                className="opacity-75 hover:opacity-100"
              >
                [ESC]
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              Loading...
            </div>
          ) : story ? (
            <div className="max-w-4xl mx-auto px-0 sm:px-4">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl font-bold mb-2 flex items-start gap-2">
                  {story.url ? (
                    <a
                      href={story.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:opacity-75"
                    >
                      {story.title}
                      <span className="ml-2 font-normal text-base opacity-50">
                        ({new URL(story.url).hostname})
                      </span>
                    </a>
                  ) : (
                    story.title
                  )}
                </h1>
              </div>
              <div className="text-sm opacity-75 mb-4">
                <a 
                  onClick={(e) => {
                    e.preventDefault();
                    setViewingUser(story.by);
                  }}
                  href={`/user/${story.by}`}
                  className={`hn-username hover:underline ${
                    isTopUser(story.by) ? getTopUserClass(theme) : ''
                  }`}
                >
                  {story.by}
                </a>
                {' • '}
                <a
                  href={`https://news.ycombinator.com/item?id=${story.id}`}
                  className="hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  title={new Date(story.time * 1000).toLocaleString()}
                >
                  {formatTimeAgo(story.time)}
                </a>
                {' • '}
                {story.descendants !== undefined && (
                  <>
                    <span>
                      {story.descendants 
                        ? `${story.descendants} comment${story.descendants === 1 ? '' : 's'}`
                        : 'no comments yet'
                      }
                    </span>
                    {' • '}
                  </>
                )}
                <BookmarkButton
                  item={{
                    id: story.id,
                    type: 'story',
                    title: story.title,
                    by: story.by,
                    time: story.time,
                    url: story.url
                  }}
                  theme={theme}
                  variant="text"
                />
                {' • '}
                <CopyButton 
                  url={`https://hn.live/item/${story.id}`}
                  theme={theme}
                />
              </div>
              {story.text && (
                <div 
                  className="prose max-w-none mb-8 break-words whitespace-pre-wrap overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: addTargetBlankToLinks(story.text) }}
                />
              )}
              <div className="border-t border-current opacity-10 my-4" />
              <div className="space-y-4">
                {grepState.isActive && grepState.searchTerm ? (
                  grepState.matchedComments.length > 0 ? (
                    grepState.matchedComments.map((comment, index) => 
                      renderComment(comment, `grep-${index}`)
                    )
                  ) : (
                    <div className="text-center py-8 opacity-75">
                      No matching comments found
                    </div>
                  )
                ) : (
                  commentState.loadedComments.map((comment, index) => 
                    renderComment(comment, `${index}`)
                  )
                )}
                
                {commentState.hasMore ? (
                  <div 
                    ref={loadingRef} 
                    className="text-center py-8"
                  >
                    {commentState.isLoadingMore ? (
                      <div className={`${
                        theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                      } opacity-75`}>
                        Loading more comments...
                      </div>
                    ) : (
                      <div className="h-20 opacity-50">
                        <div className="text-sm">
                          Viewing {commentState.loadedTotal} of {story.descendants} comments ({commentState.loadedCount} threads)
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <div className="text-sm space-y-2">
                      <div>
                        <a
                          href={`https://news.ycombinator.com/item?id=${story.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${
                            theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                          } hover:opacity-75`}
                        >
                          → View this story on Hacker News
                        </a>
                      </div>
                      <div>
                        <span className="opacity-50">or</span>
                      </div>
                      <div>
                        <button
                          onClick={() => navigate('/')}
                          className={`${
                            theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                          } hover:opacity-75`}
                        >
                          → Head back to the live feed to see real-time stories and discussions
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              Story not found
            </div>
          )}
        </div>
      </div>
      
      {/* Add UserModal */}
      {viewingUser && (
        <UserModal
          userId={viewingUser}
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
          theme={theme}
          fontSize={fontSize}
        />
      )}
    </>
  );
} 