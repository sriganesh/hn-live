import { useEffect, useRef } from 'react';
import { useTopUsers } from '../../hooks/useTopUsers';
import { BasePageProps, ThemeOption } from '../../types/common';
import { useBestComments } from '../../hooks/useBestComments';
import { CommentsPage } from '../../components/common/CommentsPage';

export function BestCommentsPage(props: BasePageProps) {
  const { isTopUser, getTopUserClass } = useTopUsers();
  const { comments, loading, loadingMore, hasMore, loadMore, loadComments } = useBestComments();
  const initialLoadRef = useRef(false);

  // Force the initial load on mount, but only once
  useEffect(() => {
    if (!initialLoadRef.current) {
      console.log('BestCommentsPage: Forcing initial load (first time)');
      initialLoadRef.current = true;
      loadComments(1, false);
    }
  }, [loadComments]);

  // Create a wrapper function with the correct type signature
  const getTopUserClassWrapper = (theme: string): string => {
    return getTopUserClass(theme as ThemeOption);
  };

  return (
    <CommentsPage
      {...props}
      title="BEST COMMENTS"
      comments={comments}
      loading={loading}
      loadingMore={loadingMore}
      hasMore={hasMore}
      loadMore={loadMore}
      currentPage="best-comments"
      isTopUser={isTopUser}
      getTopUserClass={getTopUserClassWrapper}
      noMoreContentMessage="No more comments to load"
      searchMessage="Search all comments"
      backMessage="Head back to the live feed to see real-time stories and discussions"
    />
  );
} 