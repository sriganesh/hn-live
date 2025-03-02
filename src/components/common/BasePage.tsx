import React, { useEffect, useRef } from 'react';
import { BasePageProps, HNStory } from '../../types/common';
import { PageContainer } from './PageContainer';
import { PageHeader } from './PageHeader';
import { StoryItem } from './StoryItem';
import { LoadingIndicator } from './LoadingIndicator';
import { NoMoreContent } from './NoMoreContent';
import { BackToTop } from './BackToTop';
import { useGrepFilter } from '../../hooks/useGrepFilter';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';

interface BasePageComponentProps extends BasePageProps {
  title: string;
  stories: HNStory[];
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

export const BasePage: React.FC<BasePageComponentProps> = ({
  theme,
  fontSize,
  font,
  colorizeUsernames,
  classicLayout,
  onShowSearch,
  onShowGrep,
  onShowSettings,
  isSettingsOpen,
  isSearchOpen,
  onViewUser,
  isRunning,
  title,
  stories,
  loading,
  loadingMore,
  hasMore,
  loadMore,
  currentPage,
  isTopUser = () => false,
  getTopUserClass = () => '',
  username = null,
  unreadCount = 0,
  noMoreContentMessage,
  searchMessage,
  backMessage
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Use the grep filter hook
  const { 
    grepState, 
    filteredStories, 
    activateGrep, 
    updateGrepTerm 
  } = useGrepFilter(stories, isSettingsOpen, isSearchOpen);

  // Use the infinite scroll hook
  const loadingRef = useInfiniteScroll(
    loading,
    loadingMore,
    hasMore,
    loadMore,
    [grepState.searchTerm]
  );

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
      containerRef={containerRef}
    >
      <div className="h-full overflow-y-auto p-2" ref={containerRef}>
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
          <div className="max-w-3xl mx-auto space-y-4">
            {filteredStories.map((story, index) => (
              <StoryItem
                key={story.id}
                story={story}
                index={index}
                theme={theme}
                colorizeUsernames={colorizeUsernames}
                classicLayout={classicLayout}
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