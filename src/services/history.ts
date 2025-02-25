export interface HistoryEntry {
  id: number;
  timestamp: number;
  title?: string;
  by?: string;
  url?: string;
}

/**
 * Add a story to browsing history
 * @param storyId The ID of the story
 * @param storyData Optional story metadata
 */
export function addToHistory(storyId: number, storyData?: { title?: string, by?: string, url?: string }): void {
  try {
    const history = JSON.parse(localStorage.getItem('hn-live-history') || '[]');
    
    const existingIndex = history.findIndex((entry: HistoryEntry) => entry.id === storyId);
    
    const newEntry = {
      id: storyId,
      timestamp: Date.now(),
      ...storyData
    };
    
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }
    
    history.unshift(newEntry);
    
    if (history.length > 100) {
      history.pop();
    }
    
    localStorage.setItem('hn-live-history', JSON.stringify(history));
  } catch (error) {
    console.error('Error adding to history:', error);
  }
}

/**
 * Get all history entries
 * @returns Array of history entries sorted by timestamp (newest first)
 */
export function getHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem('hn-live-history') || '[]');
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
}

/**
 * Clear all browsing history
 */
export function clearHistory(): void {
  try {
    localStorage.setItem('hn-live-history', '[]');
  } catch (error) {
    console.error('Error clearing history:', error);
  }
}

/**
 * Remove a specific entry from history
 * @param storyId The ID of the story to remove
 */
export function removeHistoryEntry(storyId: number): void {
  try {
    const history = JSON.parse(localStorage.getItem('hn-live-history') || '[]');
    const updatedHistory = history.filter((entry: HistoryEntry) => entry.id !== storyId);
    localStorage.setItem('hn-live-history', JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error removing history entry:', error);
  }
} 