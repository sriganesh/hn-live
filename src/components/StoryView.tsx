import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

interface StoryViewProps {
  itemId: number;
  scrollToId?: number;
  onClose: () => void;
  theme: 'green' | 'og' | 'dog';
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

// Simplify fetchComments back to its original version
const fetchComments = async (ids: number[], level: number = 0, requiredIds?: Set<number>): Promise<HNComment[]> => {
  // If we've hit max depth and there are no required comments at this level, return empty
  if (level >= MAX_DEPTH && !ids.some(id => requiredIds?.has(id))) {
    return [];
  }

  // Limit the number of comments, but include required ones
  const limitedIds = level === 0 
    ? ids.slice(0, MAX_COMMENTS)
    : ids.filter(id => requiredIds?.has(id) || level < MAX_DEPTH);

  const comments = await Promise.all(
    limitedIds.map(async (id) => {
      try {
        const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        const comment = await response.json();
        
        if (!comment || comment.dead || comment.deleted) return null;

        let replies: HNComment[] = [];
        const hasDeepReplies = level === MAX_DEPTH - 1 && comment.kids?.length > 0;
        
        if (comment.kids && level < MAX_DEPTH) {
          replies = await fetchComments(comment.kids, level + 1, requiredIds);
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

export function StoryView({ itemId, scrollToId, onClose, theme }: StoryViewProps) {
  const navigate = useNavigate();
  const [story, setStory] = useState<HNStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBackButton, setShowBackButton] = useState(false);
  
  // Add new state for comment loading
  const [commentState, setCommentState] = useState<StoryViewState>({
    loadedComments: [],
    loadedCount: 0,
    loadedTotal: 0,
    hasMore: false,
    isLoadingMore: false
  });

  // Add scroll handler
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLDivElement;
      setShowBackButton(target.scrollTop > 100);
    };

    const container = document.querySelector('.story-container');
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Add function to load more comments
  const loadMoreComments = async () => {
    if (!story?.kids || commentState.isLoadingMore) return;
    
    setCommentState(prev => ({ ...prev, isLoadingMore: true }));
    
    const startIndex = commentState.loadedCount;
    const nextBatch = story.kids.slice(startIndex, startIndex + MAX_COMMENTS);
    
    const loadedIds = getCommentIds(commentState.loadedComments);
    const newComments = await fetchComments(nextBatch, 0, requiredIds);
    const newTotal = countCommentsInTree(newComments);
    
    setCommentState(prev => ({
      loadedComments: [...prev.loadedComments, ...newComments],
      loadedCount: prev.loadedCount + newComments.length,
      loadedTotal: prev.loadedTotal + newTotal,
      hasMore: startIndex + MAX_COMMENTS < (story.kids?.length || 0),
      isLoadingMore: false
    }));
  };

  // Modify the story fetching effect
  useEffect(() => {
    const fetchStory = async () => {
      try {
        const rootStoryId = await findRootStoryId(itemId);
        const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${rootStoryId}.json`);
        const storyData = await response.json();

        // If there's a specific comment to show, get its path
        let requiredIds: Set<number> | undefined;
        if (scrollToId) {
          const commentPath = await findCommentPath(scrollToId);
          requiredIds = new Set(commentPath);
        }

        let initialComments: HNComment[] = [];
        if (storyData.kids) {
          const initialBatch = storyData.kids.slice(0, MAX_COMMENTS);
          initialComments = await fetchComments(initialBatch, 0, requiredIds);
        }

        const initialTotal = countCommentsInTree(initialComments);

        setStory(storyData);
        setCommentState({
          loadedComments: initialComments,
          loadedCount: initialComments.length,
          loadedTotal: initialTotal,
          hasMore: (storyData.kids?.length || 0) > MAX_COMMENTS,
          isLoadingMore: false
        });
        setLoading(false);

        // Scroll to comment if specified
        if (scrollToId) {
          setTimeout(() => {
            const element = document.getElementById(`comment-${scrollToId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
              element.classList.add('highlight');
            }
          }, 100);
        }
      } catch (error) {
        console.error('Error fetching story:', error);
        setLoading(false);
      }
    };

    fetchStory();
  }, [itemId, scrollToId]);

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

  const renderComment = (comment: HNComment) => (
    <div 
      key={comment.id}
      id={`comment-${comment.id}`}
      className={`py-2 ${
        comment.level > 0 
          ? `sm:${getIndentClass(comment.level)} pl-2` 
          : 'pl-0'
      } ${
        comment.id === scrollToId ? 'bg-yellow-500/10' : ''
      } ${
        comment.level > 0 ? 'border-l border-current/10' : ''
      }`}
    >
      <div className="text-sm opacity-75 mb-1">
        <a 
          href={`https://news.ycombinator.com/user?id=${comment.by}`}
          className="hn-username hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {comment.by}
        </a>
        {' • '}
        <a
          href={`https://news.ycombinator.com/item?id=${story?.id}#${comment.id}`}
          className="hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {new Date(comment.time * 1000).toLocaleString()}
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
        {' • '}
        <CopyButton 
          url={`https://hn.live/item/${story?.id}/comment/${comment.id}`}
          theme={theme}
        />
      </div>
      <div 
        className="prose prose-sm max-w-none break-words whitespace-pre-wrap overflow-hidden"
        dangerouslySetInnerHTML={{ __html: addTargetBlankToLinks(comment.text || '') }}
      />
      {comment.comments?.map(renderComment)}
      {comment.hasDeepReplies && (
        <div className="mt-2 text-sm opacity-50">
          <a
            href={`https://news.ycombinator.com/item?id=${story?.id}#${comment.id}`}
            className="hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View more replies on HN →
          </a>
        </div>
      )}
    </div>
  );

  const handleClose = () => {
    navigate('/');
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
      <div className={`fixed inset-0 z-50 ${themeColors} overflow-hidden`}>
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

          {/* Add floating back button */}
          <div 
            className={`fixed left-4 bottom-4 transition-opacity duration-200 ${
              showBackButton ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <button
              onClick={handleClose}
              className={`${
                theme === 'green' ? 'bg-green-500' : 'bg-[#ff6600]'
              } text-black rounded-full p-3 shadow-lg hover:opacity-90 transition-opacity`}
              aria-label="Back to feed"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-full">
              Loading...
            </div>
          ) : story ? (
            <div className="max-w-3xl mx-auto px-0 sm:px-4">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl font-bold mb-2">{story.title}</h1>
                <CopyButton 
                  url={`https://hn.live/item/${story.id}`}
                  theme={theme}
                />
              </div>
              <div className="text-sm opacity-75 mb-4">
                <a 
                  href={`https://news.ycombinator.com/user?id=${story.by}`}
                  className="hn-username hover:underline"
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
                >
                  {new Date(story.time * 1000).toLocaleString()}
                </a>
                {' • '}
                <CopyButton 
                  url={`https://hn.live/item/${story.id}`}
                  theme={theme}
                />
              </div>
              {story.url && (
                <a 
                  href={story.url}
                  className="block mb-4 opacity-75 hover:opacity-100 break-words"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {story.url}
                </a>
              )}
              {story.text && (
                <div 
                  className="prose max-w-none mb-8"
                  dangerouslySetInnerHTML={{ __html: addTargetBlankToLinks(story.text) }}
                />
              )}
              <div className="border-t border-current opacity-10 my-8" />
              <div className="space-y-4">
                {commentState.loadedComments.map(renderComment)}
                
                {/* Replace the existing "View all comments" with Load More button */}
                {commentState.hasMore && (
                  <div className="text-center py-8">
                    <button
                      onClick={loadMoreComments}
                      disabled={commentState.isLoadingMore}
                      className={`${
                        theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                      } opacity-75 hover:opacity-100 transition-opacity disabled:opacity-50`}
                    >
                      {commentState.isLoadingMore ? (
                        'Loading more comments...'
                      ) : (
                        `Viewing ${commentState.loadedTotal} of ${story.descendants} comments (${commentState.loadedCount} threads). Load ${Math.min(MAX_COMMENTS, (story.kids?.length || 0) - commentState.loadedCount)} more threads...`
                      )}
                    </button>
                    <div className="mt-2 text-sm opacity-50">
                      <a 
                        href={`https://news.ycombinator.com/item?id=${story.id}`}
                        className="hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View all on HN →
                      </a>
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