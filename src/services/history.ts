export interface HistoryEntry {
  id: number;
  timestamp: number;
  title?: string;
  by?: string;
  url?: string;
}

interface MinimalHistoryEntry {
  id: number;
  timestamp: number;
}

/**
 * Add a story to browsing history
 * @param storyId The ID of the story
 * @param storyData Optional story metadata (not stored in localStorage)
 */
export function addToHistory(storyId: number, storyData?: { title?: string, by?: string, url?: string }): void {
  try {
    const history = JSON.parse(localStorage.getItem('hn-live-history') || '[]') as MinimalHistoryEntry[];
    
    const existingIndex = history.findIndex((entry) => entry.id === storyId);
    
    const newEntry: MinimalHistoryEntry = {
      id: storyId,
      timestamp: Date.now()
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
export async function getHistory(): Promise<HistoryEntry[]> {
  try {
    const minimalHistory = JSON.parse(localStorage.getItem('hn-live-history') || '[]') as MinimalHistoryEntry[];
    
    // Fetch additional details for each history entry
    const historyWithDetails = await Promise.all(
      minimalHistory.map(async (entry) => {
        try {
          const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${entry.id}.json`);
          const item = await response.json();
          
          return {
            id: entry.id,
            timestamp: entry.timestamp,
            title: item?.title,
            by: item?.by,
            url: item?.url
          } as HistoryEntry;
        } catch (error) {
          // If fetching fails, return the minimal entry
          console.error(`Error fetching details for item ${entry.id}:`, error);
          return {
            id: entry.id,
            timestamp: entry.timestamp
          } as HistoryEntry;
        }
      })
    );
    
    return historyWithDetails;
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
    const history = JSON.parse(localStorage.getItem('hn-live-history') || '[]') as MinimalHistoryEntry[];
    const updatedHistory = history.filter((entry) => entry.id !== storyId);
    localStorage.setItem('hn-live-history', JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error removing history entry:', error);
  }
} 