import { useState, useEffect } from 'react';
import { getHistory, clearHistory, removeHistoryEntry, HistoryEntry } from '../../services/history';

interface HistoryTabContentProps {
  theme: 'green' | 'og' | 'dog';
  navigate: (path: string) => void;
}

export function HistoryTabContent({ theme, navigate }: HistoryTabContentProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const historyData = await getHistory();
        setHistory(historyData);
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
  };

  const handleRemoveEntry = (id: number) => {
    removeHistoryEntry(id);
    setHistory(prev => prev.filter(entry => entry.id !== id));
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return <div className="text-center py-8 opacity-75">Loading history...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="opacity-75">
          {history.length} {history.length === 1 ? 'item' : 'items'} in history
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="opacity-75 hover:opacity-100"
          >
            [CLEAR ALL]
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8 opacity-75">
          <div>No browsing history yet.</div>
          <div className="mt-2 text-sm">
            Stories you view will appear here.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map(entry => (
            <div 
              key={`${entry.id}-${entry.timestamp}`}
              className={`p-4 rounded ${
                theme === 'green' 
                  ? 'bg-green-500/5'
                  : theme === 'og'
                  ? 'bg-[#f6f6ef]'
                  : 'bg-[#828282]/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div 
                    className="cursor-pointer hover:opacity-75"
                    onClick={() => navigate(`/item/${entry.id}`)}
                  >
                    <span className={`${
                      theme === 'green'
                        ? 'text-green-400'
                        : theme === 'og'
                        ? 'text-[#828282]'
                        : 'text-[#828282]'
                    }`}>
                      {entry.title || `Story #${entry.id}`}
                    </span>
                  </div>
                  <div className="text-sm opacity-75 flex items-center gap-2">
                    {entry.by && (
                      <span>by {entry.by}</span>
                    )}
                    <span>•</span>
                    <span>{formatDate(entry.timestamp)}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveEntry(entry.id)}
                  className="opacity-50 hover:opacity-100"
                >
                  [remove]
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 