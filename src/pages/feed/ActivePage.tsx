import { useEffect, useRef } from 'react';
import { useTopUsers } from '../../hooks/useTopUsers';
import { BasePageProps, ThemeOption } from '../../types/common';
import { useActiveStories } from '../../hooks/useActiveStories';
import { BasePage } from '../../components/common/BasePage';

export function ActivePage(props: BasePageProps) {
  const { isTopUser, getTopUserClass } = useTopUsers();
  const { stories, loading, loadingMore, hasMore, loadMore, loadStories } = useActiveStories();
  const initialLoadRef = useRef(false);

  // Force the initial load on mount, but only once
  useEffect(() => {
    if (!initialLoadRef.current) {
      console.log('ActivePage: Forcing initial load (first time)');
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
      title="TRENDING"
      stories={stories}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      loadMore={loadMore}
      currentPage="trending"
      isTopUser={isTopUser}
      getTopUserClass={getTopUserClassWrapper}
      noMoreContentMessage="That's all the trending stories for now!"
      searchMessage="Search all trending stories in history"
      backMessage="Head back to the live feed to see real-time stories and discussions"
    />
  );
} 