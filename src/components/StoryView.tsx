import { useState, useEffect } from 'react';

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

// Modify the fetchComments function
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
      const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      const comment = await response.json();
      if (comment && comment.kids) {
        comment.comments = await fetchComments(comment.kids, level + 1, requiredIds);
      }
      return { ...comment, level };
    })
  );

  return comments.filter(c => c && !c.dead && !c.deleted);
};

export function StoryView({ itemId, scrollToId, onClose, theme }: StoryViewProps) {
  const [story, setStory] = useState<HNStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBackButton, setShowBackButton] = useState(false);

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
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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

        if (storyData.kids) {
          storyData.comments = await fetchComments(storyData.kids, 0, requiredIds);
        }

        setStory(storyData);
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

  const themeColors = theme === 'green'
    ? 'text-green-400 bg-black'
    : theme === 'og'
    ? 'text-[#828282] bg-[#f6f6ef]'
    : 'text-[#828282] bg-[#1a1a1a]';

  const renderComment = (comment: HNComment) => (
    <div 
      key={comment.id}
      id={`comment-${comment.id}`}
      className={`py-2 ${getIndentClass(comment.level)} ${
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
      </div>
      <div 
        className="prose prose-sm max-w-none break-words"
        dangerouslySetInnerHTML={{ __html: addTargetBlankToLinks(comment.text || '') }}
      />
      {comment.comments?.map(renderComment)}
    </div>
  );

  return (
    <div className={`fixed inset-0 z-50 ${themeColors} overflow-hidden`}>
      <div className="story-container h-full overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onClose}
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
            onClick={onClose}
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
            onClick={onClose}
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
          <div className="max-w-3xl mx-auto">
            <h1 className="text-xl font-bold mb-2">{story.title}</h1>
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
              {story.comments?.map(renderComment)}
              {(story.descendants ?? 0) > MAX_COMMENTS && (
                <div className="text-sm opacity-50 mt-4">
                  Showing first {MAX_COMMENTS} comments. 
                  <a 
                    href={`https://news.ycombinator.com/item?id=${story.id}`}
                    className="ml-2 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View all {story.descendants} comments on HN →
                  </a>
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
  );
} 