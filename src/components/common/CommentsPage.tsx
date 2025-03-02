import React, { useRef, useState, useEffect } from 'react';
import { BasePageProps } from '../../types/common';
import { Comment } from '../../types/comments';
import { PageContainer } from './PageContainer';
import { PageHeader } from './PageHeader';
import { CommentItem } from './CommentItem';
import { LoadingIndicator } from './LoadingIndicator';
import { NoMoreContent } from './NoMoreContent';
import { BackToTop } from './BackToTop';

interface CommentsPageProps extends BasePageProps {
  title: string;
  comments: Comment[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  currentPage?: string;
  isTopUser?: (username: string) => boolean;
  getTopUserClass?: (theme: string) => string;
  noMoreContentMessage?: string;
  searchMessage?: string;
  backMessage?: string;
}

// Custom grep state for comments
interface GrepState {
  isActive: boolean;
  searchTerm: string;
  matchedComments: Comment[];
}

export const CommentsPage: React.FC<CommentsPageProps> = ({
  theme,
  fontSize,
  font,
  colorizeUsernames,
  onShowSearch,
  onShowGrep,
  onShowSettings,
  isSettingsOpen,
  isSearchOpen,
  onViewUser,
  isRunning,
  title,
  comments,
  loading,
  loadingMore,
  hasMore,
  loadMore,
  currentPage,
  isTopUser = () => false,
  getTopUserClass = () => '',
  username = null,
  unreadCount = 0,
  onCloseSearch,
  noMoreContentMessage = "That's all for now!",
  searchMessage = "Search all comments",
  backMessage = "Head back to the live feed"
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Custom grep filter for comments
  const [grepState, setGrepState] = useState<GrepState>({
    isActive: false,
    searchTerm: '',
    matchedComments: []
  });
  
  // Filter comments based on grep input
  const filteredComments = grepState.searchTerm 
    ? grepState.matchedComments 
    : comments;
    
  // Handle grep activation
  const activateGrep = () => {
    setGrepState(prev => ({ ...prev, isActive: true }));
  };
  
  // Handle grep term change
  const updateGrepTerm = (term: string) => {
    setGrepState(prev => ({
      ...prev,
      searchTerm: term,
      matchedComments: term ? comments.filter(comment => {
        const searchText = `${comment.text} ${comment.by}`.toLowerCase();
        return searchText.includes(term.toLowerCase());
      }) : []
    }));
  };
  
  // Handle ESC key for grep
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Ctrl+F or Cmd+F for grep
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        activateGrep();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (!loadingRef.current || loading || loadingMore || !hasMore || grepState.searchTerm) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !loading && !loadingMore && hasMore && !isScrolling) {
          // Debounce the scroll events
          setIsScrolling(true);
          setTimeout(() => {
            loadMore();
            setIsScrolling(false);
          }, 300);
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    observer.observe(loadingRef.current);

    return () => {
      observer.disconnect();
    };
  }, [loading, loadingMore, hasMore, loadMore, grepState.searchTerm, isScrolling]);

  return (
    <PageContainer
      theme={theme}
      fontSize={fontSize}
      font={font}
      onShowSearch={onShowSearch}
      onShowSettings={onShowSettings}
      isRunning={isRunning}
      username={username}
      unreadCount={unreadCount}
      onCloseSearch={onCloseSearch}
      containerRef={containerRef}
    >
      <div className="h-full overflow-y-auto overflow-x-hidden p-2 max-w-full" ref={containerRef}>
        <PageHeader
          theme={theme}
          title={title}
          isRunning={isRunning}
          onShowSearch={onShowSearch}
          onShowGrep={activateGrep}
          onShowSettings={onShowSettings}
          showGrep={grepState.isActive}
          grepFilter={grepState.searchTerm}
          onGrepFilterChange={updateGrepTerm}
          currentPage={currentPage}
          unreadCount={unreadCount}
        />

        {loading ? (
          <LoadingIndicator 
            theme={theme} 
            message={`Loading ${title.toLowerCase()}...`} 
          />
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 overflow-hidden">
            {filteredComments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                theme={theme}
                colorizeUsernames={colorizeUsernames}
                onViewUser={onViewUser}
                isTopUser={isTopUser}
                getTopUserClass={getTopUserClass}
              />
            ))}

            {!grepState.searchTerm && (
              <div ref={loadingRef} className="text-center py-4 mt-4">
                {loadingMore ? (
                  <LoadingIndicator 
                    theme={theme} 
                    isLoadingMore={true} 
                  />
                ) : hasMore ? (
                  <div className="h-10 opacity-0">
                    {/* This invisible element serves as the intersection target */}
                  </div>
                ) : (
                  <NoMoreContent
                    theme={theme}
                    message={noMoreContentMessage}
                    onShowSearch={onShowSearch}
                    searchMessage={searchMessage}
                    backMessage={backMessage}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <BackToTop theme={theme} containerRef={containerRef} />
    </PageContainer>
  );
}; 