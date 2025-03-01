import { useState, useCallback } from 'react';
import { HNStory, StoriesPageState } from '../types/common';

const STORIES_PER_PAGE = 30;

type StoryType = 'top' | 'new' | 'best' | 'ask' | 'show' | 'job';

/**
 * Custom hook for fetching HN stories
 * @param storyType Type of stories to fetch
 * @returns State and functions for managing stories
 */
export const useHNStories = (storyType: StoryType) => {
  const [state, setState] = useState<StoriesPageState>({
    stories: [],
    loading: false,
    loadingMore: false,
    page: 0,
    hasMore: true
  });

  // Fetch story details from Firebase
  const fetchStoryDetails = async (id: number): Promise<HNStory | null> => {
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
      } else {
        console.log('Setting loadingMore state for page', pageNumber);
        setState(prev => ({ ...prev, loadingMore: true }));
      }

      // Determine the API endpoint based on story type
      let endpoint: string;
      switch (storyType) {
        case 'top':
          endpoint = 'topstories';
          break;
        case 'new':
          endpoint = 'newstories';
          break;
        case 'best':
          endpoint = 'beststories';
          break;
        case 'ask':
          endpoint = 'askstories';
          break;
        case 'show':
          endpoint = 'showstories';
          break;
        case 'job':
          endpoint = 'jobstories';
          break;
        default:
          endpoint = 'topstories';
      }

      console.log(`Loading ${storyType} stories, page ${pageNumber}, append: ${append}`);

      // Fetch all story IDs
      const response = await fetch(`https://hacker-news.firebaseio.com/v0/${endpoint}.json`);
      const allStoryIds = await response.json();
      
      if (!allStoryIds || !Array.isArray(allStoryIds)) {
        console.error('Failed to fetch story IDs or received invalid data:', allStoryIds);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          loadingMore: false,
          hasMore: false
        }));
        return;
      }
      
      // Calculate start and end indices for this page
      const start = (pageNumber - 1) * STORIES_PER_PAGE; // Adjust to start from 0 for page 1
      const end = start + STORIES_PER_PAGE;
      const pageStoryIds = allStoryIds.slice(start, end);
      
      console.log(`Fetching ${pageStoryIds.length} stories from indices ${start} to ${end}`);
      
      // Fetch each story's details
      const storyPromises = pageStoryIds.map(fetchStoryDetails);
      const newStories = await Promise.all(storyPromises);
      
      // Filter out null values
      const validStories = newStories.filter((story): story is HNStory => story !== null);
      
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
          hasMore: end < allStoryIds.length
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
  }, [storyType]);

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