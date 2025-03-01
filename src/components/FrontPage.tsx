import { useEffect, useRef } from 'react';
import { useTopUsers } from '../hooks/useTopUsers';
import { BasePageProps, ThemeOption } from '../types/common';
import { useHNStories } from '../hooks/useHNStories';
import { BasePage } from './common/BasePage';

export function FrontPage(props: BasePageProps) {
  const { isTopUser, getTopUserClass } = useTopUsers();
  const { stories, loading, loadingMore, hasMore, loadMore, loadStories } = useHNStories('top');
  const initialLoadRef = useRef(false);

  // Force the initial load on mount, but only once
  useEffect(() => {
    if (!initialLoadRef.current) {
      console.log('FrontPage: Forcing initial load (first time)');
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
      title="FRONT PAGE"
      stories={stories}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      loadMore={loadMore}
      currentPage="front"
      isTopUser={isTopUser}
      getTopUserClass={getTopUserClassWrapper}
      noMoreContentMessage="That's all the Front Page stories for now!"
      searchMessage="Search all Front Page stories in history"
      backMessage="Head back to the live feed to see real-time stories and discussions"
    />
  );
} 