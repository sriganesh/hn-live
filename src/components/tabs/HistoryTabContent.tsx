import React from 'react';
import { useHistory } from '../../hooks/useHistory';
import { NavigateFunction } from 'react-router-dom';

export interface HistoryTabContentProps {
  theme: 'green' | 'og' | 'dog';
  navigate: NavigateFunction;
  onUserClick?: (username: string) => void;
}

export function HistoryTabContent({ 
  theme,
  navigate,
  onUserClick
}: HistoryTabContentProps) {
  const { 
    history, 
    loading, 
    error, 
    clearHistory, 
    removeEntry, 
    exportHistory 
  } = useHistory();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleUsernameClick = (username: string | undefined, e: React.MouseEvent) => {
    e.preventDefault();
    if (onUserClick && username) {
      onUserClick(username);
    }
  };

  if (loading) {
    return <div className={`text-center py-8 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}>Loading history...</div>;
  }

  if (error) {
    return <div className="text-red-500 py-2">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className={`opacity-75 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}>
          {history.length} {history.length === 1 ? 'item' : 'items'} in history
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={exportHistory}
            className={`opacity-75 hover:opacity-100 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}
          >
            [EXPORT]
          </button>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              className={`opacity-75 hover:opacity-100 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}
            >
              [CLEAR ALL]
            </button>
          )}
        </div>
      </div>

      <div className={`text-sm ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}>
        Note: History is stored locally. Use [EXPORT] to save your browsing history.
      </div>

      {history.length === 0 ? (
        <div className={`text-center py-8 ${theme === 'green' ? 'text-green-400' : 'text-[#828282]'}`}>
          <div>No browsing history yet</div>
          <div className="mt-2 text-sm opacity-75">
            Stories you view will appear here
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
                  <div className="text-sm flex items-center gap-2">
                    {entry.by && (
                      <a
                        href={`#user-${entry.by}`}
                        onClick={(e) => handleUsernameClick(entry.by, e)}
                        className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} hover:underline`}
                      >
                        {entry.by}
                      </a>
                    )}
                    <span className={`${theme === 'green' ? 'opacity-75' : 'text-[#828282]'}`}>•</span>
                    <span className={`${theme === 'green' ? 'opacity-75' : 'text-[#828282]'}`}>{formatDate(entry.timestamp)}</span>
                  </div>
                </div>
                <button
                  onClick={() => removeEntry(entry.id)}
                  className={`${theme === 'green' ? 'opacity-50 hover:opacity-100' : 'text-[#828282] opacity-50 hover:opacity-100'}`}
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