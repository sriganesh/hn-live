import { useState, useEffect, useCallback } from 'react';
import { 
  getHistory, 
  clearHistory, 
  removeHistoryEntry, 
  exportHistory, 
  HistoryEntry 
} from '../services/history';

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch history data
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const historyData = await getHistory();
      setHistory(historyData);
    } catch (error) {
      console.error('Error fetching history:', error);
      setError('Failed to load history data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Clear all history
  const handleClearHistory = useCallback(() => {
    try {
      clearHistory();
      setHistory([]);
    } catch (error) {
      console.error('Error clearing history:', error);
      setError('Failed to clear history');
    }
  }, []);

  // Remove a specific history entry
  const handleRemoveEntry = useCallback((id: number) => {
    try {
      removeHistoryEntry(id);
      setHistory(prev => prev.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Error removing history entry:', error);
      setError('Failed to remove history entry');
    }
  }, []);

  // Export history data
  const handleExportHistory = useCallback(() => {
    try {
      exportHistory();
    } catch (error) {
      console.error('Error exporting history:', error);
      setError('Failed to export history');
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    history,
    loading,
    error,
    clearHistory: handleClearHistory,
    removeEntry: handleRemoveEntry,
    exportHistory: handleExportHistory,
    refreshHistory: fetchHistory
  };
} 