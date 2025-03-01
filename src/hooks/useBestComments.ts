import { useState, useCallback } from 'react';
import { Comment } from '../types/comments';

interface BestCommentsState {
  comments: Comment[];
  loading: boolean;
  loadingMore: boolean;
  page: number;
  hasMore: boolean;
}

/**
 * Custom hook for fetching best comments from the bc-api.hn.live endpoint
 * @returns State and functions for managing best comments
 */
export const useBestComments = () => {
  const [state, setState] = useState<BestCommentsState>({
    comments: [],
    loading: false,
    loadingMore: false,
    page: 0,
    hasMore: true
  });

  // Fetch comment details from Firebase
  const fetchCommentDetails = async (id: string): Promise<Comment | null> => {
    try {
      const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
      const comment = await response.json();
      
      if (!comment) return null;

      // Traverse up the parent chain until we find the root story
      let currentItem = comment;
      let rootStory = null;
      
      while (currentItem.parent) {
        const parentResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${currentItem.parent}.json`);
        const parentItem = await parentResponse.json();
        
        if (!parentItem) break;
        
        // If we found a story, this is our root
        if (parentItem.type === 'story') {
          rootStory = parentItem;
          break;
        }
        
        // Otherwise, keep traversing up
        currentItem = parentItem;
      }

      // If we couldn't find a root story, skip this comment
      if (!rootStory) return null;

      return {
        id: comment.id,
        text: comment.text,
        by: comment.by,
        time: comment.time,
        parent: rootStory.id,
        parentTitle: rootStory.title,
        parentBy: rootStory.by,
        score: comment.score,
        kids: comment.kids
      };
    } catch (error) {
      console.error(`Error fetching comment details for ID ${id}:`, error);
      return null;
    }
  };

  // Load comments for a given page
  const loadComments = useCallback(async (pageNumber: number, append: boolean = false) => {
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

      console.log(`Loading best comments, page ${pageNumber}, append: ${append}`);

      // Fetch comment IDs from the bc-api endpoint
      const response = await fetch(`https://bc-api.hn.live/?page=${pageNumber}`);
      
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
      const commentIds = await response.json();
      
      if (!commentIds || !Array.isArray(commentIds)) {
        console.error('Failed to fetch comment IDs or received invalid data:', commentIds);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          loadingMore: false,
          hasMore: false
        }));
        clearTimeout(loadingTimeout);
        return;
      }
      
      console.log(`Fetching ${commentIds.length} comments`);
      
      // Fetch details for each comment
      const commentPromises = commentIds.map(id => fetchCommentDetails(id));
      const newComments = (await Promise.all(commentPromises)).filter((c): c is Comment => c !== null);
      
      console.log(`Loaded ${newComments.length} valid comments, append: ${append}, current comments: ${append ? state.comments.length : 0}`);
      
      // Clear the timeout since we completed successfully
      clearTimeout(loadingTimeout);
      
      setState(prev => {
        // If we're appending, combine with existing comments
        // Otherwise, replace the comments
        const updatedComments = append ? [...prev.comments, ...newComments] : newComments;
        
        console.log(`Updating state with ${updatedComments.length} comments (${append ? 'appending' : 'replacing'})`);
        
        return {
          ...prev,
          comments: updatedComments,
          loading: false,
          loadingMore: false,
          hasMore: newComments.length > 0
        };
      });
    } catch (error) {
      // Clear the timeout since we're handling the error
      clearTimeout(loadingTimeout);
      
      console.error('Error loading comments:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        loadingMore: false,
        hasMore: false
      }));
    }
  }, [state.comments.length]);

  // Load more comments
  const loadMore = useCallback(() => {
    // Don't load more if we're already loading or don't have more to load
    if (state.loading || state.loadingMore || !state.hasMore) {
      console.log('Skipping loadMore - already loading or no more content');
      return;
    }
    
    // Calculate the next page number
    // If we already have comments, make sure we don't go back to page 1
    let nextPage;
    if (state.page === 0) {
      // First load - start with page 1
      nextPage = 1;
    } else {
      // Subsequent loads - increment the page
      nextPage = state.page + 1;
    }
    
    // If we already have comments and nextPage is 1, skip to page 2
    // This prevents reloading page 1 when we already have comments
    if (nextPage === 1 && state.comments.length > 0) {
      console.log('Already have comments, skipping to page 2');
      nextPage = 2;
    }
    
    console.log(`Loading more comments, next page: ${nextPage}, current comments: ${state.comments.length}`);
    
    setState(prev => ({ 
      ...prev, 
      page: nextPage,
      loading: nextPage === 1 && prev.comments.length === 0, // Only set loading true for first load with no comments
      loadingMore: nextPage > 1 || prev.comments.length > 0 // Set loadingMore for subsequent pages or if we already have comments
    }));
    
    // Load the comments - only append for pages > 1 or if we already have comments
    const shouldAppend = nextPage > 1 || state.comments.length > 0;
    loadComments(nextPage, shouldAppend);
  }, [state.page, state.loading, state.loadingMore, state.hasMore, state.comments.length, loadComments]);

  return {
    ...state,
    loadComments,
    loadMore
  };
}; 