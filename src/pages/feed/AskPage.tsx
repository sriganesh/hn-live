import { useEffect, useRef } from 'react';
import { useTopUsers } from '../../hooks/useTopUsers';
import { BasePageProps, ThemeOption } from '../../types/common';
import { useHNStories } from '../../hooks/useHNStories';
import { BasePage } from '../../components/common/BasePage';

export function AskPage(props: BasePageProps) {
  const { isTopUser, getTopUserClass } = useTopUsers();
  const { stories, loading, loadingMore, hasMore, loadMore, loadStories } = useHNStories('ask');
  const initialLoadRef = useRef(false);

  // Force the initial load on mount, but only once
  useEffect(() => {
    if (!initialLoadRef.current) {
      console.log('AskPage: Forcing initial load (first time)');
      initialLoadRef.current = true;
      loadStories(1, false);
    }
  }, [loadStories]);

  // Create a wrapper function with the correct type signature
  const getTopUserClassWrapper = (theme: string): string => {
    return getTopUserClass(theme as ThemeOption);
  };

  return (
    <BasePage
      {...props}
      title="ASK HN"
      stories={stories}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      loadMore={loadMore}
      currentPage="ask"
      isTopUser={isTopUser}
      getTopUserClass={getTopUserClassWrapper}
      noMoreContentMessage="That's all the Ask HN posts for now!"
      searchMessage="Search all Ask HN posts in history"
      backMessage="Head back to the live feed to see real-time stories and discussions"
    />
  );
} 