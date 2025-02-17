import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTopUsers } from '../hooks/useTopUsers';
import { MobileBottomBar } from './MobileBottomBar';
import type { FontOption, Comment } from '../types/comments';

interface BestCommentsPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: FontOption;
  colorizeUsernames: boolean;
  onShowSearch: () => void;
  onCloseSearch: () => void;
  onShowSettings: () => void;
  isSettingsOpen: boolean;
  isSearchOpen: boolean;
  onViewUser: (userId: string) => void;
  isRunning: boolean;
  username: string | null;
  unreadCount?: number;
}

export function BestCommentsPage({
  theme,
  fontSize,
  font,
  colorizeUsernames,
  onShowSearch,
  onCloseSearch,
  onShowSettings,
  isSettingsOpen,
  isSearchOpen,
  onViewUser,
  isRunning,
  username,
  unreadCount
}: BestCommentsPageProps) {
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showGrep, setShowGrep] = useState(false);
  const [grepFilter, setGrepFilter] = useState('');
  const { isTopUser, getTopUserClass } = useTopUsers();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);

  // Theme-specific colors
  const themeColors = theme === 'green'
    ? 'text-green-400'
    : theme === 'og'
    ? 'text-[#828282]'
    : 'text-[#828282]';

  // Filter comments based on grep input
  const filteredComments = comments.filter(comment => {
    if (!grepFilter) return true;
    const searchText = `${comment.text} ${comment.by}`.toLowerCase();
    return searchText.includes(grepFilter.toLowerCase());
  });

  // Fetch comment details from Firebase
  const fetchCommentDetails = async (id: string): Promise<Comment | null> => {
    try {
      const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      const comment = await response.json();
      
      if (!comment) return null;

      // Traverse up the parent chain until we find the root story
      let currentItem = comment;
      let rootStory = null;
      
      while (currentItem.parent) {
        const parentResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${currentItem.parent}.json`);
        const parentItem = await parentResponse.json();
        
        if (!parentItem) break;
        
        // If we found a story, this is our root
        if (parentItem.type === 'story') {
          rootStory = parentItem;
          break;
        }
        
        // Otherwise, keep traversing up
        currentItem = parentItem;
      }

      // If we couldn't find a root story, skip this comment
      if (!rootStory) return null;

      return {
        id: comment.id,
        text: comment.text,
        by: comment.by,
        time: comment.time,
        parent: rootStory.id,
        parentTitle: rootStory.title,
        parentBy: rootStory.by,
        score: comment.score,
        kids: comment.kids
      };
    } catch (error) {
      console.error('Error fetching comment details:', error);
      return null;
    }
  };

  // Load comments for a given page
  const loadComments = async (page: number, append: boolean = false) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await fetch(`http://bc-api.hn.live/?page=${page}`);
      
      if (response.status === 404) {
        setHasMore(false);
        setLoadingMore(false);
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const commentIds: string[] = await response.json();
      
      // Fetch details for each comment
      const commentPromises = commentIds.map(id => fetchCommentDetails(id));
      const newComments = (await Promise.all(commentPromises)).filter((c): c is Comment => c !== null);
      
      setComments(prev => append ? [...prev, ...newComments] : newComments);
      setHasMore(newComments.length > 0);
    } catch (error) {
      console.error('Error loading comments:', error);
      setHasMore(false);
    }

    setLoading(false);
    setLoadingMore(false);
  };

  // Initial load
  useEffect(() => {
    loadComments(1);
  }, []);

  // Add intersection observer for infinite scroll
  const observer = useRef<IntersectionObserver>();
  const lastCommentElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setCurrentPage(prev => prev + 1);
        loadComments(currentPage + 1, true);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore, currentPage]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowGrep(true);
      }
      if (e.key === 'Escape') {
        if (!isSettingsOpen && !isSearchOpen) {
          if (showGrep) {
            setGrepFilter('');
            setShowGrep(false);
            return;
          }
          navigate(-1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, showGrep, isSettingsOpen, isSearchOpen]);

  // Add scroll handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsBackToTopVisible(container.scrollTop > 500);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Add scroll to top function
  const scrollToTop = () => {
    containerRef.current?.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const formatDate = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'just now';
    }
  };

  const formatText = (text: string) => {
    return { __html: text };
  };

  return (
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
      {/* T-beam navigation */}
      <div className={`fixed top-0 left-0 right-0 z-50 p-2 ${theme === 'green' ? 'bg-black' : theme === 'og' ? 'bg-[#f6f6ef]' : 'bg-[#1a1a1a]'}`}>
        <div className="flex items-center justify-between max-w-full px-2">
          <div className="flex items-center space-x-2 min-w-0">
            <button
              onClick={() => navigate('/')}
              className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity shrink-0`}
            >
              <span>HN</span>
              <span className="animate-pulse">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  isRunning 
                    ? theme === 'green'
                      ? 'bg-green-500'
                      : 'bg-[#ff6600]'
                    : 'bg-gray-500'
                }`}></span>
              </span>
              <span>LIVE</span>
            </button>
            <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold shrink-0`}>/</span>
            <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold truncate`}>BEST COMMENTS</span>
          </div>
          
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-4">
              {showGrep ? (
                <div className="flex items-center gap-2">
                  <span>[GREP]</span>
                  <input
                    type="text"
                    value={grepFilter}
                    onChange={(e) => setGrepFilter(e.target.value)}
                    className={`bg-transparent border-b border-current outline-none w-32 px-1 ${themeColors}`}
                    placeholder="filter..."
                    autoFocus
                  />
                </div>
              ) : (
                <button onClick={() => setShowGrep(true)} className={themeColors}>[GREP]</button>
              )}
              <button onClick={onShowSettings} className={themeColors}>[SETTINGS]</button>
              <button onClick={() => navigate(-1)} className={themeColors}>[ESC]</button>
            </div>
            <div className="sm:hidden">
              <button onClick={() => navigate(-1)} className={themeColors}>[ESC]</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div ref={containerRef} className="h-full overflow-y-auto pt-16 pb-20 overflow-x-hidden">
        <div className="max-w-3xl mx-auto px-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              Loading best comments...
            </div>
          ) : (
            <div className="space-y-6">
              {filteredComments.map((comment, index) => (
                <div
                  key={comment.id}
                  ref={index === comments.length - 1 ? lastCommentElementRef : null}
                  className={`p-4 rounded break-words ${
                    theme === 'dog'
                      ? 'bg-[#222222]'
                      : theme === 'green'
                      ? 'bg-green-500/[0.04]'
                      : 'bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={`hover:underline cursor-pointer ${
                        theme === 'green'
                          ? 'text-green-400'
                          : colorizeUsernames 
                            ? `hn-username ${isTopUser(comment.by || '') ? getTopUserClass(theme) : ''}`
                            : 'opacity-75'
                      }`}
                      onClick={() => comment.by && onViewUser(comment.by)}
                    >
                      {comment.by}
                    </span>
                    <span className="opacity-75">·</span>
                    <a
                      href={`/item/${comment.parent}/comment/${comment.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/item/${comment.parent}/comment/${comment.id}`);
                      }}
                      className="opacity-75 hover:opacity-100"
                    >
                      {formatDate(comment.time || 0)}
                    </a>
                  </div>
                  
                  <div
                    className={`prose max-w-none mb-3 ${
                      theme === 'dog' 
                        ? 'prose-invert' 
                        : theme === 'green'
                        ? 'prose-green'
                        : ''
                    }`}
                    dangerouslySetInnerHTML={formatText(comment.text || '')}
                  />
                  
                  <div className="opacity-75 break-words">
                    on:{' '}
                    <a
                      href={`/item/${comment.parent}`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(`/item/${comment.parent}`);
                      }}
                      className={`${
                        theme === 'green'
                          ? 'text-green-400'
                          : 'text-[#ff6600]'
                      } hover:underline hover:opacity-100`}
                    >
                      {comment.parentTitle}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {loadingMore && (
            <div className="text-center py-8 opacity-75">
              Loading more comments...
            </div>
          )}
          
          {!hasMore && !loading && comments.length > 0 && (
            <div className="text-center py-8 opacity-75">
              No more comments to load
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile bottom bar */}
      <div className="sm:hidden">
        <MobileBottomBar
          theme={theme}
          onShowSearch={onShowSearch}
          onCloseSearch={onCloseSearch}
          onShowSettings={onShowSettings}
          isRunning={isRunning}
          username={username}
          unreadCount={unreadCount}
        />
      </div>

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
    </div>
  );
} 