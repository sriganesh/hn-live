import { useEffect, useRef } from 'react';
import { BasePageProps, ThemeOption } from '../../types/common';
import { useHNStories } from '../../hooks/useHNStories';
import { BasePage } from '../../components/common/BasePage';

export function JobsPage(props: BasePageProps) {
  const { stories, loading, loadingMore, hasMore, loadMore, loadStories } = useHNStories('job');
  const initialLoadRef = useRef(false);

  // Force the initial load on mount, but only once
  useEffect(() => {
    if (!initialLoadRef.current) {
      console.log('JobsPage: Forcing initial load (first time)');
      initialLoadRef.current = true;
      loadStories(1, false);
    }
  }, [loadStories]);

  return (
    <BasePage
      {...props}
      title="JOBS"
      stories={stories}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      loadMore={loadMore}
      currentPage="jobs"
      noMoreContentMessage="That's all the job listings for now!"
      searchMessage="Search all job listings in history"
      backMessage="Head back to the live feed to see real-time stories and discussions"
    />
  );
} 