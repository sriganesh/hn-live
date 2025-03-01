import { UserTag } from '../types/UserTag';
import { STORAGE_KEYS } from '../config/constants';

/**
 * Get all user tags from local storage
 */
export function getUserTags(): UserTag[] {
  try {
    const tagsJson = localStorage.getItem(STORAGE_KEYS.USER_TAGS);
    return tagsJson ? JSON.parse(tagsJson) : [];
  } catch (error) {
    console.error('Error loading user tags:', error);
    return [];
  }
}

/**
 * Save user tags to local storage
 */
export function saveUserTags(tags: UserTag[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_TAGS, JSON.stringify(tags));
    return true;
  } catch (error) {
    console.error('Error saving user tags:', error);
    return false;
  }
}

/**
 * Add a tag to a user
 */
export function addTagToUser(userId: string, tag: string): UserTag[] {
  const tags = getUserTags();
  const existingTagIndex = tags.findIndex(t => t.userId === userId);
  
  if (existingTagIndex >= 0) {
    // User already has tags, add the new tag if it doesn't exist
    if (!tags[existingTagIndex].tags.includes(tag)) {
      tags[existingTagIndex].tags.push(tag);
      tags[existingTagIndex].timestamp = Date.now();
    }
  } else {
    // Create a new entry for this user
    tags.push({
      userId,
      tags: [tag],
      timestamp: Date.now()
    });
  }
  
  saveUserTags(tags);
  return tags;
}

/**
 * Remove a tag from a user
 */
export function removeTagFromUser(userId: string, tagToRemove: string): UserTag[] {
  const tags = getUserTags();
  const updated = tags.map(tag => {
    if (tag.userId === userId) {
      return {
        ...tag,
        tags: tag.tags.filter(t => t !== tagToRemove),
        timestamp: Date.now()
      };
    }
    return tag;
  }).filter(tag => tag.tags.length > 0);
  
  saveUserTags(updated);
  return updated;
}

/**
 * Export tags as a JSON file
 */
export function exportTags(): boolean {
  try {
    const tags = getUserTags();
    const timestamp = Math.floor(Date.now() / 1000);
    const content = JSON.stringify(tags, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `hn.live-tags-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Failed to export tags data:', error);
    return false;
  }
}

/**
 * Import tags from a JSON file
 */
export function importTags(jsonContent: string): boolean {
  try {
    const importedTags = JSON.parse(jsonContent) as UserTag[];
    
    // Validate the imported data
    if (!Array.isArray(importedTags)) {
      throw new Error('Invalid tags format');
    }
    
    // Merge with existing tags
    const existingTags = getUserTags();
    const mergedTags: UserTag[] = [...existingTags];
    
    importedTags.forEach(importedTag => {
      const existingIndex = mergedTags.findIndex(t => t.userId === importedTag.userId);
      if (existingIndex >= 0) {
        // Merge tags for existing user
        const existingTagNames = new Set(mergedTags[existingIndex].tags);
        importedTag.tags.forEach(tag => existingTagNames.add(tag));
        mergedTags[existingIndex].tags = Array.from(existingTagNames);
        mergedTags[existingIndex].timestamp = Date.now();
      } else {
        // Add new user tag
        mergedTags.push({
          ...importedTag,
          timestamp: Date.now()
        });
      }
    });
    
    saveUserTags(mergedTags);
    return true;
  } catch (error) {
    console.error('Failed to import tags:', error);
    return false;
  }
} 