import { useState, useEffect, useCallback } from 'react';
import { UserTag } from '../types/UserTag';
import { 
  getUserTags, 
  saveUserTags, 
  addTagToUser, 
  removeTagFromUser, 
  exportTags,
  importTags
} from '../services/tags';

export function useTags() {
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tags from localStorage on mount
  useEffect(() => {
    try {
      setLoading(true);
      const tags = getUserTags();
      setUserTags(tags);
      setError(null);
    } catch (err) {
      console.error('Error loading tags:', err);
      setError('Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle adding a tag to a user
  const handleAddTag = useCallback((userId: string, tag: string) => {
    try {
      const updatedTags = addTagToUser(userId, tag);
      setUserTags(updatedTags);
      return true;
    } catch (err) {
      console.error('Error adding tag:', err);
      setError('Failed to add tag');
      return false;
    }
  }, []);

  // Handle removing a tag from a user
  const handleRemoveTag = useCallback((userId: string, tagToRemove: string) => {
    try {
      const updatedTags = removeTagFromUser(userId, tagToRemove);
      setUserTags(updatedTags);
      return true;
    } catch (err) {
      console.error('Error removing tag:', err);
      setError('Failed to remove tag');
      return false;
    }
  }, []);

  // Handle exporting tags
  const handleExportTags = useCallback(() => {
    try {
      return exportTags();
    } catch (err) {
      console.error('Error exporting tags:', err);
      setError('Failed to export tags');
      return false;
    }
  }, []);

  // Handle importing tags
  const handleImportTags = useCallback((jsonContent: string) => {
    try {
      const success = importTags(jsonContent);
      if (success) {
        // Refresh tags after import
        const tags = getUserTags();
        setUserTags(tags);
      }
      return success;
    } catch (err) {
      console.error('Error importing tags:', err);
      setError('Failed to import tags');
      return false;
    }
  }, []);

  // Listen for storage events to keep tags in sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'hn-user-tags' && e.newValue) {
        try {
          const tags = JSON.parse(e.newValue);
          setUserTags(tags);
        } catch (err) {
          console.error('Error parsing tags from storage event:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return {
    userTags,
    loading,
    error,
    addTag: handleAddTag,
    removeTag: handleRemoveTag,
    exportTags: handleExportTags,
    importTags: handleImportTags
  };
} 