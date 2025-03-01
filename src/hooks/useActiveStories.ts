import { useState, useCallback, useRef } from 'react';
import { HNStory, StoriesPageState } from '../types/common';

/**
 * Custom hook for fetching active stories from the active-api.hn.live endpoint
 * @returns State and functions for managing active stories
 */
export const useActiveStories = () => {
  const [state, setState] = useState<StoriesPageState>({
    stories: [],
    loading: false,
    loadingMore: false,
    page: 0,
    hasMore: true
  });
  
  // Keep track of processed story IDs to avoid duplicates
  const processedIds = useRef<Set<number>>(new Set());

  // Fetch story details from Firebase
  const fetchStoryDetails = async (id: string): Promise<HNStory | null> => {
    try {
      const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      return await response.json();
    } catch (error) {
      console.error(`Error fetching story details for ID ${id}:`, error);
      return null;
    }
  };

  // Load stories for a given page
  const loadStories = useCallback(async (pageNumber: number, append: boolean = false) => {
    // Set a timeout to ensure we don't get stuck in a loading state
    const loadingTimeout = setTimeout(() => {
      console.log('Loading timeout reached, resetting loading state');
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        loadingMore: false
      }));
    }, 10000); // 10 seconds timeout

    try {
      // Set the appropriate loading state
      if (pageNumber === 1 && !append) {
        console.log('Setting loading state for initial load');
        setState(prev => ({ ...prev, loading: true }));
        processedIds.current.clear(); // Clear processed IDs for a fresh load
      } else {
        console.log('Setting loadingMore state for page', pageNumber);
        setState(prev => ({ ...prev, loadingMore: true }));
      }

      console.log(`Loading active stories, page ${pageNumber}, append: ${append}`);

      // Fetch story IDs from the active-api endpoint
      const response = await fetch(`https://active-api.hn.live/?page=${pageNumber}`);
      
      if (response.status === 404) {
        console.log('No more pages available (404)');
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          loadingMore: false,
          hasMore: false
        }));
        clearTimeout(loadingTimeout);
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Parse the response data
      const data = await response.json();
      
      if (!data || !Array.isArray(data)) {
        console.error('Failed to fetch story IDs or received invalid data:', data);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          loadingMore: false,
          hasMore: false
        }));
        clearTimeout(loadingTimeout);
        return;
      }
      
      // Filter out already processed IDs and fetch story details
      const storyPromises = data
        .filter(item => !processedIds.current.has(Number(item.id)))
        .map(item => fetchStoryDetails(item.id));
      
      console.log(`Fetching ${storyPromises.length} stories`);
      
      // Fetch each story's details
      const newStories = await Promise.all(storyPromises);
      
      // Filter out null values and mark IDs as processed
      const validStories = newStories.filter((story): story is HNStory => {
        if (story === null) return false;
        processedIds.current.add(story.id);
        return true;
      });
      
      console.log(`Loaded ${validStories.length} valid stories, append: ${append}, current stories: ${append ? state.stories.length : 0}`);
      
      // Clear the timeout since we completed successfully
      clearTimeout(loadingTimeout);
      
      setState(prev => {
        // If we're appending, combine with existing stories
        // Otherwise, replace the stories
        const updatedStories = append ? [...prev.stories, ...validStories] : validStories;
        
        console.log(`Updating state with ${updatedStories.length} stories (${append ? 'appending' : 'replacing'})`);
        
        return {
          ...prev,
          stories: updatedStories,
          loading: false,
          loadingMore: false,
          hasMore: validStories.length > 0
        };
      });
    } catch (error) {
      // Clear the timeout since we're handling the error
      clearTimeout(loadingTimeout);
      
      console.error('Error loading stories:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        loadingMore: false,
        hasMore: false
      }));
    }
  }, [state.stories.length]);

  // Load more stories
  const loadMore = useCallback(() => {
    // Don't load more if we're already loading or don't have more to load
    if (state.loading || state.loadingMore || !state.hasMore) {
      console.log('Skipping loadMore - already loading or no more content');
      return;
    }
    
    // Calculate the next page number
    // If we already have stories, make sure we don't go back to page 1
    let nextPage;
    if (state.page === 0) {
      // First load - start with page 1
      nextPage = 1;
    } else {
      // Subsequent loads - increment the page
      nextPage = state.page + 1;
    }
    
    // If we already have stories and nextPage is 1, skip to page 2
    // This prevents reloading page 1 when we already have stories
    if (nextPage === 1 && state.stories.length > 0) {
      console.log('Already have stories, skipping to page 2');
      nextPage = 2;
    }
    
    console.log(`Loading more stories, next page: ${nextPage}, current stories: ${state.stories.length}`);
    
    setState(prev => ({ 
      ...prev, 
      page: nextPage,
      loading: nextPage === 1 && prev.stories.length === 0, // Only set loading true for first load with no stories
      loadingMore: nextPage > 1 || prev.stories.length > 0 // Set loadingMore for subsequent pages or if we already have stories
    }));
    
    // Load the stories - only append for pages > 1 or if we already have stories
    const shouldAppend = nextPage > 1 || state.stories.length > 0;
    loadStories(nextPage, shouldAppend);
  }, [state.page, state.loading, state.loadingMore, state.hasMore, state.stories.length, loadStories]);

  return {
    ...state,
    loadStories,
    loadMore
  };
}; 