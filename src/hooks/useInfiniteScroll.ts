import { useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for handling infinite scrolling
 * @param loading Whether initial data is loading
 * @param loadingMore Whether more data is currently loading
 * @param hasMore Whether there is more data to load
 * @param loadMore Function to call when more data should be loaded
 * @param dependencies Additional dependencies for the observer
 * @returns Reference to attach to the last element in the list
 */
export const useInfiniteScroll = (
  loading: boolean,
  loadingMore: boolean,
  hasMore: boolean,
  loadMore: () => void,
  dependencies: any[] = []
) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const lastCallTimeRef = useRef<number>(0);
  const debounceTimeMs = 1000; // 1 second debounce

  // Create a callback for the intersection observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    const now = Date.now();
    
    if (target.isIntersecting && !loading && !loadingMore && hasMore) {
      // Debounce the loadMore call to prevent rapid consecutive calls
      if (now - lastCallTimeRef.current > debounceTimeMs) {
        console.log('Intersection observer triggered, loading more content');
        lastCallTimeRef.current = now;
        loadMore();
      } else {
        console.log('Debouncing intersection observer trigger');
      }
    }
  }, [loading, loadingMore, hasMore, loadMore, ...dependencies]);

  // Set up the intersection observer
  useEffect(() => {
    if (hasMore && !loading && !loadingMore) {
      console.log('Setting up intersection observer');
      const options = {
        root: null,
        rootMargin: '100px',
        threshold: 0.25
      };

      observerRef.current = new IntersectionObserver(handleObserver, options);
      
      if (loadingRef.current) {
        observerRef.current.observe(loadingRef.current);
      }

      return () => {
        console.log('Disconnecting intersection observer');
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }
  }, [handleObserver, hasMore, loading, loadingMore]);

  return loadingRef;
}; 