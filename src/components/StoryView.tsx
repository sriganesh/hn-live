import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTopUsers } from '../hooks/useTopUsers';
import { UserModal } from './user/UserModal';
import { BookmarkButton } from './common/BookmarkButton';
import { CopyButton } from './CopyButton';
import { addToHistory } from '../services/history';

type FontOption = 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';

interface StoryViewProps {
  itemId: number;
  scrollToId?: number;
  onClose: () => void;
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: FontOption;
  onShowSettings: () => void;
  isSettingsOpen: boolean;
  isRunning: boolean;
  useAlgoliaApi: boolean;
}

type CommentSortMode = 'nested' | 'recent';

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
  isHighlighted?: boolean;
}

// New interface for story metadata
interface StoryMetadata {
  pool?: boolean;
  invited?: boolean;
  highlights?: string[]; // Array of comment IDs that are highlighted
}

// Add these interfaces for Algolia API response
interface AlgoliaStory {
  id: number;
  title: string;
  text?: string;
  url?: string;
  author: string; // Note: Algolia uses 'author' instead of 'by'
  created_at_i: number; // Note: Algolia uses 'created_at_i' instead of 'time'
  points?: number;
  children: AlgoliaComment[];
  parent_id?: number;
  story_id?: number;
}

interface AlgoliaComment {
  id: number;
  text?: string;
  author: string;
  created_at_i: number;
  children: AlgoliaComment[];
  parent_id: number;
  story_id: number;
  points?: number;
}

const MAX_COMMENTS = 5;  
const MAX_DEPTH = 5;     // Maximum nesting depth for replies

// Add this at the top of the file
const isDev = import.meta.env.DEV;

// Story fetching function
const fetchStory = async (storyId: number, signal?: AbortSignal) => {
  if (isDev) {
    console.log('🔄 Fetching story from HN API:', `https://hacker-news.firebaseio.com/v0/item/${storyId}.json`);
  }
  const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${storyId}.json`, { signal });
  return response.json();
};

async function findRootStoryId(itemId: number, signal?: AbortSignal): Promise<number> {
  if (isDev) {
    console.log('🔍 Finding root story ID for:', `https://hacker-news.firebaseio.com/v0/item/${itemId}.json`);
  }
  const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`, { signal });
  const item = await response.json();
  
  if (item.type === 'story') {
    return item.id;
  } else if (item.parent) {
    return findRootStoryId(item.parent, signal);
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

// Update the fetchComments function to handle nulls properly
const fetchComments = async (
  commentIds: number[], 
  depth: number = 0,
  requiredIds?: Set<number>,
  forceLoad: boolean = false
): Promise<HNComment[]> => {
  if (isDev) {
    console.log('📝 Fetching comments:', {
      urls: commentIds.map(id => `https://hacker-news.firebaseio.com/v0/item/${id}.json`),
      count: commentIds.length,
      depth,
      hasRequiredIds: !!requiredIds?.size,
      forceLoad
    });
  }
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
        } as HNComment;
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

// Update the state interface to track thread-collapsed comments
interface StoryViewState {
  loadedComments: HNComment[];
  loadedCount: number;
  loadedTotal: number;  
  hasMore: boolean;
  isLoadingMore: boolean;
  collapsedComments: Set<number>;
  showCollapseThreadOption: Set<number>;
  threadCollapsedComments: Set<number>;  // New state to track comments collapsed by "collapse thread"
  isTopLevelOnly: boolean;  // Add this line
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
  return text.replace(regex, '<mark style="background-color: rgba(255, 255, 0, 0.3)">$1</mark>');
};

// Update the grepComments function to include the full comment path and highlight matches
const grepComments = (comments: HNComment[], term: string): HNComment[] => {
  const matches: HNComment[] = [];
  
  const search = (comment: HNComment) => {
    if ((comment.text?.toLowerCase().includes(term.toLowerCase()) ||
         comment.by?.toLowerCase().includes(term.toLowerCase()))) {
      // Create a new comment object with highlighted text
      const highlightedComment = {
        ...comment,
        text: comment.text ? highlightText(comment.text, term) : ''
      };
      matches.push(highlightedComment);
    }
    
    // Also search through nested comments
    if (comment.comments) {
      comment.comments.forEach(search);
    }
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

// Add a function to fetch from Algolia
const fetchFromAlgolia = async (itemId: number, signal?: AbortSignal): Promise<AlgoliaStory> => {
  if (isDev) {
    console.log('🔄 Fetching story from Algolia API:', `https://hn.algolia.com/api/v1/items/${itemId}`);
  }
  const response = await fetch(`https://hn.algolia.com/api/v1/items/${itemId}`, { signal });
  if (!response.ok) {
    throw new Error('Failed to fetch from Algolia');
  }
  return response.json();
};

// Add a function to fetch story metadata
const fetchStoryMetadata = async (storyId: number, signal?: AbortSignal): Promise<StoryMetadata | null> => {
  try {
    if (isDev) {
      console.log('🔄 Fetching story metadata:', `https://metadata-api.hn.live/story/${storyId}`);
    }
    const response = await fetch(`https://metadata-api.hn.live/story/${storyId}`, { signal });
    if (!response.ok) {
      if (response.status === 404) {
        // Story metadata not found, return null
        return null;
      }
      throw new Error(`Failed to fetch story metadata: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Error fetching story metadata:', error);
    return null;
  }
};

// Add a converter function to transform Algolia data to our format
const convertAlgoliaStory = (algoliaStory: AlgoliaStory): HNStory => {
  return {
    id: algoliaStory.id,
    title: algoliaStory.title,
    text: algoliaStory.text,
    url: algoliaStory.url,
    by: algoliaStory.author,
    time: algoliaStory.created_at_i,
    kids: algoliaStory.children?.map(c => c.id),
    descendants: countAlgoliaComments(algoliaStory.children),
    comments: convertAlgoliaComments(algoliaStory.children, 0),
    score: algoliaStory.points || 0
  };
};

const convertAlgoliaComments = (comments: AlgoliaComment[], depth: number): HNComment[] => {
  return comments.map(comment => ({
    id: comment.id,
    text: comment.text || '',
    by: comment.author,
    time: comment.created_at_i,
    level: depth,
    kids: comment.children?.map(c => c.id),
    parent_id: comment.parent_id,
    comments: convertAlgoliaComments(comment.children || [], depth + 1)
  }));
};

const countAlgoliaComments = (comments: AlgoliaComment[]): number => {
  return comments.reduce((count, comment) => {
    return count + 1 + (comment.children ? countAlgoliaComments(comment.children) : 0);
  }, 0);
};

// Add this helper function before the StoryView component
const getRandomAnnouncement = (prefix: string): { text: string; link: string } => {
  const variations = [1, 2, 3];
  const randomIndex = Math.floor(Math.random() * variations.length);
  const variation = variations[randomIndex];
  
  return {
    text: import.meta.env[`VITE_STORY_${prefix}_ANNOUNCEMENT_${variation}`] || '',
    link: import.meta.env[`VITE_STORY_${prefix}_ANNOUNCEMENT_LINK_${variation}`] || ''
  };
};

export function StoryView({ 
  itemId, 
  scrollToId, 
  onClose, 
  theme, 
  fontSize, 
  font, 
  onShowSettings, 
  isSettingsOpen, 
  isRunning,
  useAlgoliaApi
}: StoryViewProps) {
  const navigate = useNavigate();
  const { isTopUser, getTopUserClass } = useTopUsers();
  
  // Update announcement states to use random selection
  const [topAnnouncement] = useState<string>(
    getRandomAnnouncement('TOP').text
  );
  const [topAnnouncementLink] = useState<string>(
    getRandomAnnouncement('TOP').link
  );
  const [bottomAnnouncement] = useState<string>(
    getRandomAnnouncement('BOTTOM').text
  );
  const [bottomAnnouncementLink] = useState<string>(
    getRandomAnnouncement('BOTTOM').link
  );
  const [preCommentsAnnouncement] = useState<string>(
    getRandomAnnouncement('PRECOMMENTS').text
  );
  const [preCommentsAnnouncementLink] = useState<string>(
    getRandomAnnouncement('PRECOMMENTS').link
  );
  
  const [story, setStory] = useState<HNStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [commentState, setCommentState] = useState<StoryViewState>({
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

  // Add state for story metadata
  const [storyMetadata, setStoryMetadata] = useState<StoryMetadata | null>(null);
  const [highlightedComments, setHighlightedComments] = useState<Set<number>>(new Set());

  // Add these inside the StoryView component, near other state declarations
  const [grepState, setGrepState] = useState<GrepState>({
    isActive: false,
    searchTerm: '',
    matchedComments: []
  });

  // Add state for UserModal
  const [viewingUser, setViewingUser] = useState<string | null>(null);

  // Add this near the top with other state declarations
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Add state for sort mode
  const [sortMode, setSortMode] = useState<CommentSortMode>('nested');

  // Add state for header visibility
  const [headerVisible, setHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Check if we're on desktop on mount and when window resizes
  useEffect(() => {
    const checkIfDesktop = () => {
      setIsDesktop(window.innerWidth >= 640);
    };
    
    // Initial check
    checkIfDesktop();
    
    // Add resize listener
    window.addEventListener('resize', checkIfDesktop);
    return () => window.removeEventListener('resize', checkIfDesktop);
  }, []);
  
  // Modify the existing scroll handler to also handle header visibility
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    const handleScroll = () => {
      // Handle back-to-top button visibility
      if (container.scrollTop > 500) {
        setIsBackToTopVisible(true);
      } else {
        setIsBackToTopVisible(false);
      }
      
      // Handle header visibility (only on desktop)
      if (isDesktop) {
        const currentScrollY = container.scrollTop;
        
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          // Scrolling down & past threshold - hide header
          setHeaderVisible(false);
        } else if (currentScrollY < lastScrollY || currentScrollY <= 100) {
          // Scrolling up or at top - show header
          setHeaderVisible(true);
        }
        
        setLastScrollY(currentScrollY);
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isDesktop]);

  // Add function to get flattened and sorted comments
  const getFlattenedComments = (comments: HNComment[]): HNComment[] => {
    const flattened: HNComment[] = [];
    const flatten = (comment: HNComment, parentTitle?: string) => {
      // Add parent reference to the comment
      const commentWithParent = {
        ...comment,
        parentTitle: parentTitle || story?.title
      };
      flattened.push(commentWithParent);
      comment.comments?.forEach(c => flatten(c, comment.text.slice(0, 60)));
    };
    comments.forEach(c => flatten(c));
    return flattened.sort((a, b) => b.time - a.time);
  };

  // Add this useEffect to handle scroll detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsBackToTopVisible(container.scrollTop > 500);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Add this function to handle the scroll to top
  const scrollToTop = () => {
    containerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Update the handleCollapseComment function
  const handleCollapseComment = useCallback((commentId: number, level: number) => {
    setCommentState(prev => {
      const newCollapsed = new Set(prev.collapsedComments);
      const newShowCollapseThread = new Set(prev.showCollapseThreadOption);
      const newThreadCollapsed = new Set(prev.threadCollapsedComments);
      
      if (newCollapsed.has(commentId)) {
        // Uncollapsing
        newCollapsed.delete(commentId);
        newShowCollapseThread.delete(commentId);
        
        // If this was collapsed by thread, restore the thread
        if (newThreadCollapsed.has(commentId)) {
          // Remove all thread-collapsed comments under this one
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
        if (level > 0) { // Only show collapse thread option for non-root comments
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

  // Update the collapseEntireThread function
  const collapseEntireThread = useCallback((commentId: number) => {
    setCommentState(prev => {
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

  // Add this inside StoryView component, after other state declarations
  const handleGrepToggle = () => {
    setGrepState(prev => ({
      ...prev,
      isActive: !prev.isActive,
      matchedComments: prev.isActive ? [] : prev.matchedComments
    }));
  };

  const handleGrepSearch = (term: string) => {
    if (!term || !commentState.loadedComments) {
      setGrepState(prev => ({
        ...prev,
        searchTerm: term,
        matchedComments: []
      }));
      return;
    }

    setGrepState(prev => ({
      ...prev,
      searchTerm: term,
      matchedComments: term ? grepComments(commentState.loadedComments, term) : []
    }));
  };

  // Update the useEffect that handles initial data fetching
  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const rootStoryId = await findRootStoryId(itemId, abortController.signal);
        
        if (!isMounted) return;
        
        // Fetch story metadata
        const metadata = await fetchStoryMetadata(rootStoryId, abortController.signal);
        if (isMounted && metadata) {
          setStoryMetadata(metadata);
          
          // Create a set of highlighted comment IDs for easier lookup
          if (metadata.highlights && metadata.highlights.length > 0) {
            setHighlightedComments(new Set(metadata.highlights.map(id => parseInt(id))));
          }
        }
        
        if (useAlgoliaApi) {
          // Use Algolia API
          try {
            const algoliaData = await fetchFromAlgolia(rootStoryId, abortController.signal);
            if (!isMounted) return;
            
            const convertedStory = convertAlgoliaStory(algoliaData);
            
            // Check if story has more than 1000 comments
            const shouldStartCollapsed = (convertedStory.descendants || 0) > 1000;
            
            setStory(convertedStory);
            setCommentState({
              loadedComments: convertedStory.comments || [],
              loadedCount: convertedStory.comments?.length || 0,
              loadedTotal: convertedStory.descendants || 0,
              hasMore: false, // Algolia gives us everything at once
              isLoadingMore: false,
              collapsedComments: shouldStartCollapsed ? new Set(
                convertedStory.comments?.flatMap(comment => 
                  getAllNestedCommentIds(comment, true)
                ) || []
              ) : new Set(),
              showCollapseThreadOption: new Set(),
              threadCollapsedComments: new Set(),
              isTopLevelOnly: shouldStartCollapsed
            });

            if (scrollToId) {
              setTimeout(() => {
                if (!isMounted) return;
                const element = document.getElementById(`comment-${scrollToId}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  element.classList.add('highlight');
                }
              }, 100);
            }
          } catch (error) {
            if (!isMounted) return;
            console.error('Algolia API failed, falling back to HN API:', error);
            // Fall back to original HN API implementation
            const storyData = await fetchStory(rootStoryId, abortController.signal);
            let initialComments: HNComment[] = [];
            let requiredIds: Set<number> | undefined;

            // Check if story has more than 1000 comments
            const shouldStartCollapsed = (storyData.descendants || 0) > 1000;

            if (storyData.kids) {
              // First, if we have a scrollToId, find its parent chain
              if (scrollToId) {
                const comment = await fetch(`https://hacker-news.firebaseio.com/v0/item/${scrollToId}.json`, { signal: abortController.signal })
                  .then(res => res.json());
                
                // Find the top-level parent of this comment
                let currentId = scrollToId;
                const targetCommentChain: number[] = [];
                while (currentId) {
                  targetCommentChain.unshift(currentId);
                  const parent = await fetch(`https://hacker-news.firebaseio.com/v0/item/${currentId}.json`, { signal: abortController.signal })
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

            setStory(storyData);
            setCommentState({
              loadedComments: initialComments,
              loadedCount: initialComments.length,
              loadedTotal: countCommentsInTree(initialComments),
              hasMore: (storyData.kids?.length || 0) > MAX_COMMENTS,
              isLoadingMore: false,
              collapsedComments: shouldStartCollapsed ? new Set(
                initialComments.flatMap(comment => 
                  getAllNestedCommentIds(comment, true)
                )
              ) : new Set(),
              showCollapseThreadOption: new Set(),
              threadCollapsedComments: new Set(),
              isTopLevelOnly: shouldStartCollapsed
            });

            if (scrollToId) {
              setTimeout(() => {
                if (!isMounted) return;
                const element = document.getElementById(`comment-${scrollToId}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  element.classList.add('highlight');
                }
              }, 100);
            }
          }
        } else {
          // Use original HN API implementation
          const storyData = await fetchStory(rootStoryId, abortController.signal);
          let initialComments: HNComment[] = [];
          let requiredIds: Set<number> | undefined;

          // Check if story has more than 1000 comments
          const shouldStartCollapsed = (storyData.descendants || 0) > 1000;

          if (storyData.kids) {
            // First, if we have a scrollToId, find its parent chain
            if (scrollToId) {
              const comment = await fetch(`https://hacker-news.firebaseio.com/v0/item/${scrollToId}.json`, { signal: abortController.signal })
                .then(res => res.json());
              
              // Find the top-level parent of this comment
              let currentId = scrollToId;
              const targetCommentChain: number[] = [];
              while (currentId) {
                targetCommentChain.unshift(currentId);
                const parent = await fetch(`https://hacker-news.firebaseio.com/v0/item/${currentId}.json`, { signal: abortController.signal })
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

          setStory(storyData);
          setCommentState({
            loadedComments: initialComments,
            loadedCount: initialComments.length,
            loadedTotal: countCommentsInTree(initialComments),
            hasMore: (storyData.kids?.length || 0) > MAX_COMMENTS,
            isLoadingMore: false,
            collapsedComments: shouldStartCollapsed ? new Set(
              initialComments.flatMap(comment => 
                getAllNestedCommentIds(comment, true)
              )
            ) : new Set(),
            showCollapseThreadOption: new Set(),
            threadCollapsedComments: new Set(),
            isTopLevelOnly: shouldStartCollapsed
          });

          if (scrollToId) {
            setTimeout(() => {
              if (!isMounted) return;
              const element = document.getElementById(`comment-${scrollToId}`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight');
              }
            }, 100);
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching story:', error);
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [itemId, scrollToId, useAlgoliaApi]);

  // Add this helper function near the top with other utility functions
  const getAllNestedCommentIds = (comment: HNComment, skipRoot: boolean = false): number[] => {
    const ids: number[] = [];
    if (!skipRoot) {
      ids.push(comment.id);
    }
    if (comment.comments) {
      comment.comments.forEach(child => {
        ids.push(child.id);
        if (child.comments) {
          ids.push(...getAllNestedCommentIds(child));
        }
      });
    }
    return ids;
  };

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
        collapsedComments: prev.collapsedComments,
        showCollapseThreadOption: prev.showCollapseThreadOption,
        threadCollapsedComments: prev.threadCollapsedComments
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
        } else if (viewingUser) {
          setViewingUser(null);
        } else if (isSettingsOpen) {
          onShowSettings(); // Close settings modal
        } else {
          navigate(-1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, grepState.isActive, viewingUser, isSettingsOpen, onShowSettings]);

  useEffect(() => {
    // Track story view
    window.gtag?.('event', 'view_story', {
      story_id: itemId
    });
  }, [itemId]);

  // Add a useEffect to record history when a story is loaded
  useEffect(() => {
    if (story) {
      addToHistory(story.id, {
        title: story.title,
        by: story.by,
        url: story.url
      });
    }
  }, [story?.id, story?.title, story?.by, story?.url]);

  const themeColors = theme === 'green'
    ? 'text-green-400 bg-black'
    : theme === 'og'
    ? 'text-[#828282] bg-[#f6f6ef]'
    : 'text-[#828282] bg-[#1a1a1a]';

  // Update the renderComment function to handle story null checks
  const renderComment = useCallback((comment: HNComment, path: string = '') => (
    <Fragment key={`${comment.id}-${path}`}>
      <div 
        id={`comment-${comment.id}`}
        data-level={comment.level}
        data-comment-id={comment.id}
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
          highlightedComments.has(comment.id)
            ? theme === 'dog'
              ? 'bg-blue-500/10 border border-blue-500/20' 
              : theme === 'green'
              ? 'bg-green-700/30 border border-green-500/30' 
              : 'bg-orange-500/10 border border-orange-500/20'
            : ''
        } ${
          comment.level > 0 
            ? theme === 'og'
              ? 'border-l border-current/10'
              : theme === 'green'
              ? 'border-l border-green-900'
              : 'border-l border-[#ff6600]/15'
            : ''
        }`}
      >
        <div className="space-y-2">
          <div className={`text-${fontSize}`}>
            <div className="flex items-center justify-between gap-2 mb-1 opacity-75">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-1 min-w-0 flex-wrap">
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
                  {comment.by === story?.by && (
                    <span className="opacity-50 ml-1">[OP]</span>
                  )}
                  {highlightedComments.has(comment.id) && (
                    <span className="ml-1 px-1 py-0.5 text-xs rounded bg-gray-500/10">
                      [highlighted]
                    </span>
                  )}
                  <span>•</span>
                  <a
                    href={`https://news.ycombinator.com/item?id=${comment.id}`}
                    className="hover:underline"
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
                    storyId={story?.id ?? 0}
                    storyTitle={story?.title ?? 'Unknown Story'}
                    theme={theme}
                  />
                  <span>•</span>
                  <CopyButton 
                    url={`https://hn.live/item/${story?.id}/comment/${comment.id}`}
                    theme={theme}
                  />
                  <span>•</span>
                  <a
                    href={`https://news.ycombinator.com/reply?id=${comment.id}&goto=item%3Fid%3D${story?.id}%23${comment.id}`}
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
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  onClick={() => handleCollapseComment(comment.id, comment.level)}
                  className={`shrink-0 ${
                    theme === 'green' 
                      ? 'text-green-500/50 hover:text-green-500' 
                      : 'text-[#ff6600]/50 hover:text-[#ff6600]'
                  } font-mono`}
                >
                  {commentState?.collapsedComments?.has(comment.id) ? '[+]' : '[-]'}
                </button>
                {/* Add expand thread option for root comments */}
                {comment.level === 0 && 
                 commentState?.collapsedComments?.has(comment.id) && 
                 comment.comments && 
                 comment.comments.length > 0 ? (
                  <button
                    onClick={() => expandEntireThread(comment.id)}
                    className={`text-xs ${
                      theme === 'green' 
                        ? 'text-green-500/50 hover:text-green-500' 
                        : 'text-[#ff6600]/50 hover:text-[#ff6600]'
                    }`}
                  >
                    [expand thread]
                  </button>
                ) : null}
                {commentState.showCollapseThreadOption.has(comment.id) && (
                  <>
                    <button
                      onClick={() => collapseEntireThread(comment.id)}
                      className={`text-xs ${
                        theme === 'green' 
                          ? 'text-green-500/50 hover:text-green-500' 
                          : 'text-[#ff6600]/50 hover:text-[#ff6600]'
                      }`}
                    >
                      [collapse thread]
                    </button>
                    <button
                      onClick={() => {
                        const parentLevel = comment.level - 1;
                        const parentElement = Array.from(document.querySelectorAll(`[data-level="${parentLevel}"]`))
                          .find(el => el.querySelector(`[data-comment-id="${comment.id}"]`));
                        
                        if (parentElement) {
                          parentElement.classList.add(
                            theme === 'dog'
                              ? 'bg-yellow-500/5' 
                              : theme === 'green'
                              ? 'bg-green-500/20' 
                              : 'bg-yellow-500/10'
                          );
                          
                          parentElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          
                          setTimeout(() => {
                            parentElement.classList.remove(
                              'bg-yellow-500/5',
                              'bg-green-500/20',
                              'bg-yellow-500/10'
                            );
                          }, 2000);
                        }
                      }}
                      className={`text-xs ${
                        theme === 'green' 
                          ? 'text-green-500/50 hover:text-green-500' 
                          : 'text-[#ff6600]/50 hover:text-[#ff6600]'
                      }`}
                    >
                      [parent]
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {!commentState?.collapsedComments?.has(comment.id) && (
            <>
              <div 
                className="prose max-w-none mb-2 break-words whitespace-pre-wrap overflow-x-auto max-w-full"
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
                onClick={() => handleCollapseComment(comment.id, comment.level)}
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
  ), [commentState, theme, scrollToId, story, handleCollapseComment, fontSize, collapseEntireThread, highlightedComments]);

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

  // Add a function to scroll to a highlighted comment
  const scrollToHighlightedComment = useCallback((commentId: number) => {
    const element = document.getElementById(`comment-${commentId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add a temporary flash effect
      element.classList.add('highlight-flash');
      setTimeout(() => {
        element.classList.remove('highlight-flash');
      }, 2000);
    }
  }, []);

  const handleClose = () => {
    navigate('/');
  };

  const renderStoryPreview = (story: HNStory) => {
    return (
      <div className="group">
        <div className="space-y-2">
          {/* Top row - user, time, points, and comments */}
          <div className="text-sm opacity-75">
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
            </a> • <a
              href={`https://news.ycombinator.com/item?id=${story.id}`}
              className="hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              title={new Date(story.time * 1000).toLocaleString()}
            >
              {formatTimeAgo(story.time)}
            </a> • <span className="font-mono">{story.score} points</span> • {story.descendants || 0} comments
            
            {/* Show metadata badges */}
            {storyMetadata && (
              <>
                {storyMetadata.highlights && storyMetadata.highlights.length > 0 && (
                  <> • {(() => {
                    if (storyMetadata.highlights && storyMetadata.highlights.length === 1) {
                      const highlightId = parseInt(storyMetadata.highlights[0]);
                      return (
                        <button 
                          onClick={() => scrollToHighlightedComment(highlightId)}
                          className={`hover:underline ${theme === 'green' ? 'text-green-400' : ''}`}
                        >
                          1 highlight
                        </button>
                      );
                    } else {
                      return (
                        <span className={theme === 'green' ? 'text-green-400' : ''}>
                          {storyMetadata.highlights.length} highlights
                        </span>
                      );
                    }
                  })()}</>
                )}
                {storyMetadata.pool && (
                  <> • <span className={theme === 'green' ? 'text-green-400' : ''}>
                    pool
                  </span></>
                )}
                {storyMetadata.invited && (
                  <> • <span className={theme === 'green' ? 'text-green-400' : ''}>
                    invited
                  </span></>
                )}
              </>
            )}
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold">
            {story.url ? (
              <a href={story.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-75">
                {story.title}
                <span className="ml-2 font-normal text-base opacity-50">
                  ({new URL(story.url).hostname})
                </span>
              </a>
            ) : (
              story.title
            )}
          </h1>

          {/* Actions */}
          <div className="text-sm opacity-75 flex items-center gap-2">
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
            <span>•</span>
            <CopyButton 
              url={`https://hn.live/item/${itemId}`}
              theme={theme}
              variant="text"
            />
            {story && typeof story.descendants === 'number' && story.descendants > 0 && (
              <>
                <span>•</span>
                <button
                  onClick={() => navigate(`/links/${story.id}`)}
                  className="hover:opacity-75 transition-opacity flex items-center gap-1"
                  title="View shared links"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  links
                </button>
                <span>•</span>
                <button
                  onClick={() => navigate(`/replay/${story.id}`)}
                  className="hover:opacity-75 transition-opacity flex items-center gap-1"
                  title="Replay discussion"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  replay
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Add this function before the return statement
  const toggleTopLevelOnly = useCallback(() => {
    setCommentState(prev => {
      const newCollapsed = new Set(prev.collapsedComments);
      
      // If turning on top level only mode
      if (!prev.isTopLevelOnly) {
        // Collapse all non-root comments
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
        // If turning off, uncollapse everything
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

  // Add the expandEntireThread function near other thread-related functions
  const expandEntireThread = useCallback((commentId: number): void => {
    setCommentState((prev: StoryViewState) => {
      const newCollapsed = new Set(prev.collapsedComments);
      
      // Find the comment and all its children
      const expandThread = (comments: HNComment[]): boolean => {
        for (const comment of comments) {
          if (comment.id === commentId) {
            // Remove this comment and all its children from collapsed set
            const removeFromCollapsed = (c: HNComment): void => {
              newCollapsed.delete(c.id);
              if (c.comments) {
                c.comments.forEach(removeFromCollapsed);
              }
            };
            removeFromCollapsed(comment);
            return true;
          }
          if (comment.comments && expandThread(comment.comments)) {
            return true;
          }
        }
        return false;
      };
      
      expandThread(prev.loadedComments);
      
      return {
        ...prev,
        collapsedComments: newCollapsed,
        threadCollapsedComments: new Set(
          Array.from(prev.threadCollapsedComments)
            .filter(id => !Array.from(newCollapsed).includes(id))
        )
      };
    });
  }, []);

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
          <style>
            {`
              .highlight-flash {
                animation: flash-highlight 2s ease-in-out;
              }
              
              @keyframes flash-highlight {
                0%, 100% {
                  background-color: ${
                    theme === 'green' 
                      ? 'rgba(74, 222, 128, 0.3)' 
                      : theme === 'og'
                      ? 'rgba(255, 102, 0, 0.2)' 
                      : 'rgba(59, 130, 246, 0.3)'
                  };
                }
                50% {
                  background-color: ${
                    theme === 'green' 
                      ? 'rgba(74, 222, 128, 0.5)' 
                      : theme === 'og'
                      ? 'rgba(255, 102, 0, 0.4)' 
                      : 'rgba(59, 130, 246, 0.5)'
                  };
                }
              }
            `}
          </style>
        </Helmet>
      )}
      <div 
        className={`fixed inset-0 overflow-y-auto z-50
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
        `}
      >
        <div 
          ref={containerRef}
          className="h-full overflow-y-auto pt-12 sm:pt-14 scroll-smooth"
          onScroll={(e) => {
            const container = e.currentTarget;
            const currentScrollY = container.scrollTop;
            
            // Handle back-to-top button visibility
            setIsBackToTopVisible(currentScrollY > 500);
            
            // Handle header visibility (only on desktop)
            if (isDesktop) {
              if (currentScrollY > lastScrollY && currentScrollY > 100) {
                // Scrolling down & past threshold - hide header
                setHeaderVisible(false);
              } else if (currentScrollY < lastScrollY || currentScrollY <= 100) {
                // Scrolling up or at top - show header
                setHeaderVisible(true);
              }
              
              setLastScrollY(currentScrollY);
            }
          }}
        >
          <div className={`flex items-center justify-between py-2 px-4 sm:px-6 fixed top-0 left-0 right-0 z-10 transition-transform duration-300 ${
            !headerVisible && isDesktop ? '-translate-y-full' : 'translate-y-0'
          } ${
            theme === 'green'
              ? 'bg-black text-green-400'
              : theme === 'og'
              ? 'bg-[#ff6600] text-white'
              : 'bg-[#1a1a1a] text-[#ff6600]'
          }`}>
            <button 
              onClick={onClose}
              className="font-bold tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity"
            >
              HN
              <span className="animate-pulse">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  isRunning 
                    ? theme === 'green'
                      ? 'bg-green-500'
                      : 'bg-red-500'
                    : 'bg-gray-500'
                }`}></span>
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
              <button onClick={() => navigate('/')} className="opacity-75 hover:opacity-100">
                [ESC]
              </button>
            </div>
          </div>

          {/* Story Content */}
          <div className="max-w-none mx-auto">
            {story ? (
              <div className={`p-4 pt-2 sm:p-8 max-w-4xl mx-auto ${
                theme === 'green'
                  ? 'bg-black/50 border border-green-500/10 shadow-lg shadow-green-500/5'
                  : theme === 'og'
                  ? 'sm:bg-white sm:shadow-lg sm:border-x sm:border-b sm:border-[#ff6600]/10 sm:rounded-b-lg'
                  : 'bg-transparent border border-[#ff6600]/10'
              }`}>
                {/* Top Announcement */}
                {topAnnouncement && (
                  <div className={`mb-4 text-sm ${
                    theme === 'green' 
                      ? 'text-green-500' 
                      : 'text-[#ff6600]'
                  }`}>
                    {topAnnouncementLink ? (
                      <a 
                        href={topAnnouncementLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:opacity-75"
                      >
                        {topAnnouncement}
                      </a>
                    ) : (
                      topAnnouncement
                    )}
                  </div>
                )}

                {renderStoryPreview(story)}

                {story.text && (
                  <div 
                    className="prose max-w-none my-4 break-words whitespace-pre-wrap overflow-x-auto max-w-full"
                    dangerouslySetInnerHTML={{ __html: addTargetBlankToLinks(story.text) }}
                  />
                )}

                {/* Comments header with sort options */}
                <div className="text-sm opacity-75 flex justify-end items-center mt-4">
                  {useAlgoliaApi && story && typeof story.descendants === 'number' && story.descendants > 0 && (
                    <div className="flex gap-2">
                      {sortMode === 'nested' && (
                        <>
                          <button
                            onClick={toggleTopLevelOnly}
                            className={`hover:underline ${commentState.isTopLevelOnly ? 'opacity-50' : ''}`}
                          >
                            top level view
                          </button>
                          <span>|</span>
                        </>
                      )}
                      <button
                        onClick={() => setSortMode('nested')}
                        className={`hover:underline ${sortMode === 'nested' ? 'opacity-50' : ''}`}
                      >
                        default view
                      </button>
                      <span>|</span>
                      <button
                        onClick={() => setSortMode('recent')}
                        className={`hover:underline ${sortMode === 'recent' ? 'opacity-50' : ''}`}
                      >
                        recent first
                      </button>
                    </div>
                  )}
                </div>

                <div className={`border-t my-4 ${
                  theme === 'green'
                    ? 'border-green-500/10'
                    : theme === 'og'
                    ? 'border-[#ff6600]/10'
                    : 'border-[#828282]/10'
                }`} />

                {/* Pre-Comments Announcement */}
                {preCommentsAnnouncement && (
                  <div className={`mb-4 text-sm ${
                    theme === 'green' 
                      ? 'text-green-500' 
                      : 'text-[#ff6600]'
                  }`}>
                    {preCommentsAnnouncementLink ? (
                      <a 
                        href={preCommentsAnnouncementLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:opacity-75"
                      >
                        {preCommentsAnnouncement}
                      </a>
                    ) : (
                      preCommentsAnnouncement
                    )}
                  </div>
                )}

                {/* Comments section */}
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
                  ) : useAlgoliaApi && sortMode === 'recent' ? (
                    // Render flattened comments in recent first order
                    getFlattenedComments(commentState.loadedComments).map((comment, index) => (
                      <div key={`${comment.id}-${index}`} className={`border-b pb-4 mb-4 last:border-b-0 ${
                        theme === 'green'
                          ? 'border-green-500/10'
                          : theme === 'og'
                          ? 'border-[#ff6600]/10'
                          : 'border-[#828282]/10'
                      }`}>
                        <div 
                          className="prose max-w-none mb-2 break-words whitespace-pre-wrap overflow-x-auto max-w-full"
                          dangerouslySetInnerHTML={{ __html: addTargetBlankToLinks(comment.text) }}
                        />
                        <div className="text-sm opacity-75 flex items-center gap-1 flex-wrap break-all">
                          by <a 
                            onClick={(e) => {
                              e.preventDefault();
                              setViewingUser(comment.by);
                            }}
                            href={`/user/${comment.by}`}
                            className={`hn-username hover:underline ${
                              isTopUser(comment.by) ? getTopUserClass(theme) : ''
                            }`}
                          >
                            {comment.by}
                          </a>
                          {comment.by === story.by && (
                            <span className="opacity-50 ml-1">[OP]</span>
                          )}
                          <span>•</span>
                          <a
                            href={`https://news.ycombinator.com/item?id=${comment.id}`}
                            className="hover:underline"
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
                            storyId={story?.id ?? 0}
                            storyTitle={story?.title ?? 'Unknown Story'}
                            theme={theme}
                          />
                          <span>•</span>
                          <CopyButton 
                            url={`https://hn.live/item/${story?.id}/comment/${comment.id}`}
                            theme={theme}
                          />
                          <span>•</span>
                          <a
                            href={`https://news.ycombinator.com/reply?id=${comment.id}&goto=item%3Fid%3D${story?.id}%23${comment.id}`}
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
                          <span>•</span>
                          <span className="break-words">
                            re: {comment.parentTitle ? `${comment.parentTitle.slice(0, 60)}${comment.parentTitle.length > 60 ? '...' : ''}` : ''}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    // Default nested view
                    commentState.loadedComments.map((comment, index) => 
                      renderComment(comment, `${index}`)
                    )
                  )}
                  
                  {commentState.hasMore && (
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
                  )}
                </div>

                {/* Footer message */}
                {!commentState.hasMore && (
                  <div className="text-center py-8 pb-24 sm:pb-8 space-y-4">
                    {/* Bottom Announcement */}
                    {bottomAnnouncement && (
                      <div className={`mb-4 text-sm ${
                        theme === 'green' 
                          ? 'text-green-500' 
                          : 'text-[#ff6600]'
                      }`}>
                        {bottomAnnouncementLink ? (
                          <a 
                            href={bottomAnnouncementLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:opacity-75"
                          >
                            {bottomAnnouncement}
                          </a>
                        ) : (
                          bottomAnnouncement
                        )}
                      </div>
                    )}

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
                      <div className="my-2">
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
            ) : (
              <div className="flex items-center justify-center h-full">
                Loading...
              </div>
            )}
          </div>
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

      {/* Back to top button */}
      {isBackToTopVisible && (
        <button
          onClick={scrollToTop}
          className={`fixed bottom-28 right-8 p-2 rounded-full shadow-lg z-[60] 
            ${theme === 'green' 
              ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400' 
              : theme === 'og'
              ? 'bg-[#ff6600]/10 hover:bg-[#ff6600]/20 text-[#ff6600]'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
            }
            transition-all duration-200 opacity-90 hover:opacity-100`}
          aria-label="Back to top"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </>
  );
} 