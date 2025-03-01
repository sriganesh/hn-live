import { useState, useEffect } from 'react';
import { GrepState, HNStory } from '../types/common';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook for handling grep/filter functionality
 * @param stories Array of stories to filter
 * @param isSettingsOpen Whether the settings modal is open
 * @param isSearchOpen Whether the search modal is open
 * @returns Grep state and handlers
 */
export const useGrepFilter = (
  stories: HNStory[],
  isSettingsOpen: boolean,
  isSearchOpen: boolean
) => {
  const navigate = useNavigate();
  const [grepState, setGrepState] = useState<GrepState>({
    isActive: false,
    searchTerm: '',
    matchedStories: []
  });

  // Filter stories based on grep input
  const filteredStories = grepState.searchTerm 
    ? grepState.matchedStories 
    : stories;

  // Handle grep activation
  const activateGrep = () => {
    setGrepState(prev => ({ ...prev, isActive: true }));
  };

  // Handle grep term change
  const updateGrepTerm = (term: string) => {
    setGrepState(prev => ({
      ...prev,
      searchTerm: term,
      matchedStories: term ? stories.filter(story => {
        const searchText = `${story.title} ${story.by}`.toLowerCase();
        return searchText.includes(term.toLowerCase());
      }) : []
    }));
  };

  // Handle ESC key for grep and navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Ctrl+F or Cmd+F for grep
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        activateGrep();
      }
      
      // Handle Escape key
      if (e.key === 'Escape') {
        if (isSettingsOpen || isSearchOpen) {
          return;
        }
        
        if (grepState.isActive) {
          setGrepState(prev => ({
            ...prev,
            isActive: false,
            searchTerm: '',
            matchedStories: []
          }));
        } else {
          navigate(-1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, grepState.isActive, isSettingsOpen, isSearchOpen, stories]);

  // Reset grep when stories change
  useEffect(() => {
    if (grepState.searchTerm) {
      updateGrepTerm(grepState.searchTerm);
    }
  }, [stories]);

  return {
    grepState,
    filteredStories,
    activateGrep,
    updateGrepTerm,
    resetGrep: () => setGrepState({
      isActive: false,
      searchTerm: '',
      matchedStories: []
    })
  };
}; 