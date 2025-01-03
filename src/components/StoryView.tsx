import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTopUsers } from '../hooks/useTopUsers';

interface StoryViewProps {
  itemId: number;
  scrollToId?: number;
  onClose: () => void;
  theme: 'green' | 'og' | 'dog';
  fontSize: 'xs' | 'sm' | 'base';
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
}

const MAX_COMMENTS = 10;  // Maximum number of top-level comments to load
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

// Add this helper to find the path to a specific comment
async function findCommentPath(commentId: number): Promise<number[]> {
  const path: number[] = [];
  let currentId = commentId;
  
  while (currentId) {
    const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${currentId}.json`);
    const item = await response.json();
    path.unshift(currentId);
    if (item.type === 'story') break;
    currentId = item.parent;
  }
  
  return path;
}

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

// Update the fetchComments function to use cached comments
const fetchComments = async (
  ids: number[], 
  level: number = 0, 
  requiredIds?: Set<number>,
  loadMore: boolean = false
): Promise<HNComment[]> => {
  if (level >= MAX_DEPTH && !loadMore && !ids.some(id => requiredIds?.has(id))) {
    return [];
  }

  const limitedIds = level === 0 
    ? ids.slice(0, MAX_COMMENTS)
    : ids;

  const comments = await Promise.all(
    limitedIds.map(async (id) => {
      try {
        const comment = await fetchComment(id); // Use cached comment fetch
        
        if (!comment || comment.dead || comment.deleted) return null;

        let replies: HNComment[] = [];
        const hasDeepReplies = !loadMore && level === MAX_DEPTH - 1 && comment.kids?.length > 0;
        
        if (comment.kids && (level < MAX_DEPTH || loadMore)) {
          replies = await fetchComments(comment.kids, level + 1, requiredIds, loadMore);
        }
        
        return { 
          ...comment, 
          level,
          comments: replies,
          hasDeepReplies
        };
      } catch (error) {
        console.error(`Error fetching comment ${id}:`, error);
        return null;
      }
    })
  );

  return comments.filter((c): c is HNComment => c !== null);
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
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  } else {
    return 'just now';
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

export function StoryView({ itemId, scrollToId, onClose, theme, fontSize }: StoryViewProps) {
  const navigate = useNavigate();
  const { isTopUser, getTopUserClass } = useTopUsers();
  
  const [story, setStory] = useState<HNStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentState, setCommentState] = useState<StoryViewState>({
    loadedComments: [],
    loadedCount: 0,
    loadedTotal: 0,
    hasMore: false,
    isLoadingMore: false
  });

  // Replace useQuery with useEffect
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const rootStoryId = await findRootStoryId(itemId);
        const storyData = await fetchStory(rootStoryId);

        let requiredIds: Set<number> | undefined;
        if (scrollToId) {
          const commentPath = await findCommentPath(scrollToId);
          requiredIds = new Set(commentPath);
        }

        let initialComments: HNComment[] = [];
        if (storyData.kids) {
          const initialBatch = storyData.kids.slice(0, MAX_COMMENTS);
          initialComments = await fetchComments(initialBatch, 0, requiredIds);
          initialComments = getUniqueComments(initialComments);
        }

        const initialTotal = countCommentsInTree(initialComments);

        setCommentState({
          loadedComments: initialComments,
          loadedCount: initialComments.length,
          loadedTotal: initialTotal,
          hasMore: (storyData.kids?.length || 0) > MAX_COMMENTS,
          isLoadingMore: false
        });

        if (scrollToId) {
          setTimeout(() => {
            const element = document.getElementById(`comment-${scrollToId}`);
            if (element) {
              element.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
              });
              element.classList.add('highlight');
            }
          }, 100);
        }

        setStory(storyData);
      } catch (error) {
        console.error('Error fetching story:', error);
      } finally {
        setIsLoading(false);
      }
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
    // Prevent multiple simultaneous loads
    if (!story || commentState.isLoadingMore || isLoadingRef.current) return;
    
    // Check if we've already loaded everything
    if (commentState.loadedTotal >= story.descendants) {
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
      // Filter out any duplicates before adding
      const allComments = getUniqueComments([...commentState.loadedComments, ...newComments]);
      const newTotal = countCommentsInTree(allComments);

      const isComplete = newTotal >= story.descendants;
      const noNewComments = allComments.length === commentState.loadedComments.length;

      setCommentState(prev => ({
        loadedComments: allComments,
        loadedCount: allComments.length,
        loadedTotal: newTotal,
        hasMore: !isComplete && !noNewComments,
        isLoadingMore: false
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

  // Keep the ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

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

  const renderComment = (comment: HNComment, path: string = '') => (
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
          comment.level > 0 ? 'border-l border-current/10' : ''
        }`}
      >
        <div className="space-y-2">
          <div className="text-sm opacity-75 mb-1">
            <a 
              href={`https://news.ycombinator.com/user?id=${comment.by}`}
              className={`hn-username hover:underline ${
                isTopUser(comment.by) ? getTopUserClass(theme) : ''
              }`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {comment.by}
            </a>
            {story && comment.by === story.by && (
              <span className={`ml-1 text-xs ${
                theme === 'green' 
                  ? 'text-green-500/75' 
                  : theme === 'og'
                  ? 'text-[#ff6600]/75'
                  : 'text-[#828282]/75'
              }`}>
                [OP]
              </span>
            )}
            {' • '}
            <a
              href={`https://news.ycombinator.com/item?id=${story?.id}#${comment.id}`}
              className="hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              title={new Date(comment.time * 1000).toLocaleString()}
            >
              {formatTimeAgo(comment.time)}
            </a>
            {' • '}
            <a
              href={`https://news.ycombinator.com/reply?id=${comment.id}&goto=item%3Fid%3D${story?.id}%23${comment.id}`}
              className="hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              reply
            </a>
          </div>
          <div 
            className="break-words whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: comment.text || '' }}
          />
        </div>

        {/* Nested comments */}
        {comment.comments?.map((reply, index) => 
          renderComment(reply, `${path}-${index}`)
        )}
        {comment.hasDeepReplies && comment.kids && (
          <div className="mt-2 text-sm">
            <button
              onClick={async () => {
                // Load more replies for this comment
                const moreReplies = await fetchComments(comment.kids || [], comment.level, undefined, true);
                
                // Update the comment tree with new replies
                const updateCommentTree = (comments: HNComment[]): HNComment[] => {
                  return comments.map(c => {
                    if (c.id === comment.id) {
                      return {
                        ...c,
                        comments: moreReplies,
                        hasDeepReplies: false
                      };
                    }
                    if (c.comments) {
                      return {
                        ...c,
                        comments: updateCommentTree(c.comments)
                      };
                    }
                    return c;
                  });
                };

                setCommentState(prev => ({
                  ...prev,
                  loadedComments: updateCommentTree(prev.loadedComments)
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
      
      {/* Move separator outside the comment div and only show for root comments */}
      {comment.level === 0 && (
        <div className={`border-b w-full ${
          theme === 'green' 
            ? 'border-green-500/10' 
            : theme === 'og'
            ? 'border-[#ff6600]/10'
            : 'border-[#828282]/10'
        } my-4`} />
      )}
    </Fragment>
  );

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
      <div className={`fixed inset-0 z-50 ${themeColors} overflow-hidden text-${fontSize}`}>
        <div className="story-container h-full overflow-y-auto p-4 sm:p-4">
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
            <button 
              onClick={handleClose}
              className="opacity-75 hover:opacity-100"
            >
              [ESC]
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              Loading...
            </div>
          ) : story ? (
            <div className="max-w-4xl mx-auto px-0 sm:px-4">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl font-bold mb-2">
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
                  href={`https://news.ycombinator.com/user?id=${story.by}`}
                  className={`hn-username hover:underline ${
                    isTopUser(story.by) ? getTopUserClass(theme) : ''
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
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
                <CopyButton 
                  url={`https://hn.live/item/${story.id}`}
                  theme={theme}
                />
              </div>
              {story.text && (
                <div 
                  className="prose max-w-none mb-8"
                  dangerouslySetInnerHTML={{ __html: addTargetBlankToLinks(story.text) }}
                />
              )}
              <div className="border-t border-current opacity-10 my-8" />
              <div className="space-y-4">
                {commentState.loadedComments.map((comment, index) => 
                  renderComment(comment, `${index}`)
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
                    <div className={`${
                      theme === 'green' ? 'text-green-500/50' : 'text-[#ff6600]/50'
                    } text-sm`}>
                      That's all the comments for now!
                    </div>
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
    </>
  );
} 