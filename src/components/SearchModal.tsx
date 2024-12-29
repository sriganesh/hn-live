import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'green' | 'og' | 'dog';
}

interface SearchParams {
  query: string;
  tags?: string[];
  dateRange?: {
    start: number;
    end: number;
  };
  author?: string;
  minPoints?: number;
  minComments?: number;
  page?: number;
}

interface SearchResult {
  hits: Array<{
    objectID: string;
    title: string;
    author: string;
    points: number;
    num_comments: number;
    created_at_i: number;
    url?: string;
    story_text?: string;
    comment_text?: string;
    _tags: string[];
  }>;
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
}

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, theme }) => {
  const navigate = useNavigate();
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useState<SearchParams>({
    query: '',
    tags: ['story'],
    page: 0
  });
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!params.query.trim()) {
      setResults(null);
    }
  }, [params.query]);

  const handleSearch = async (page = 0) => {
    setLoading(true);
    const queryParams = new URLSearchParams();
    queryParams.append('query', params.query);
    queryParams.append('page', page.toString());
    
    if (params.tags?.length) {
      queryParams.append('tags', params.tags.join(','));
    }
    
    if (params.dateRange) {
      queryParams.append('numericFilters', [
        `created_at_i>${params.dateRange.start}`,
        `created_at_i<${params.dateRange.end}`
      ].join(','));
    }

    if (params.minPoints) {
      queryParams.append('numericFilters', 
        `points>=${params.minPoints}`
      );
    }

    if (params.author) {
      queryParams.append('tags', `author_${params.author}`);
    }

    try {
      const response = await fetch(
        `https://hn.algolia.com/api/v1/search?${queryParams.toString()}`
      );
      const data = await response.json();
      setResults(data);
      if (resultsContainerRef.current) {
        resultsContainerRef.current.scrollTop = 0;
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (item: SearchResult['hits'][0]) => {
    if (item._tags.includes('story')) {
      navigate(`/item/${item.objectID}`);
    } else if (item._tags.includes('comment')) {
      navigate(`/item/${item.objectID}`);
    }
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(0);
    }
  };

  const themeColors = theme === 'green'
    ? 'text-green-400 bg-black border-green-500/30'
    : theme === 'og'
    ? 'text-[#828282] bg-[#f6f6ef] border-[#ff6600]/30'
    : 'text-[#828282] bg-[#1a1a1a] border-[#ff6600]/30';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black/80">
      <div className={`w-full max-w-3xl h-full sm:h-[90vh] m-auto ${themeColors} border shadow-lg overflow-hidden flex flex-col`}>
        <div className="p-3 sm:p-4 space-y-4 flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Search Hacker News</h2>
            <button 
              onClick={onClose}
              className="hover:opacity-75 px-2"
            >
              [×]
            </button>
          </div>

          {/* Search Form */}
          <div className="space-y-3 sm:space-y-4">
            <input
              type="text"
              value={params.query}
              onChange={(e) => setParams(prev => ({ ...prev, query: e.target.value }))}
              placeholder="Search stories, comments..."
              className={`w-full p-2 sm:p-2 ${themeColors} border bg-transparent outline-none`}
              autoFocus
              onKeyPress={handleKeyPress}
            />

            <div className="flex items-center gap-2 sm:gap-4 text-sm overflow-x-auto pb-2">
              <button
                onClick={() => setParams(prev => ({
                  ...prev,
                  tags: ['story']
                }))}
                className={`hover:opacity-75 transition-opacity`}
              >
                [{params.tags?.includes('story') ? '×' : ' '}] Stories
              </button>
              <button
                onClick={() => setParams(prev => ({
                  ...prev,
                  tags: ['comment']
                }))}
                className={`hover:opacity-75 transition-opacity`}
              >
                [{params.tags?.includes('comment') ? '×' : ' '}] Comments
              </button>
              <button
                onClick={() => setParams(prev => ({
                  ...prev,
                  tags: ['show_hn']
                }))}
                className={`hover:opacity-75 transition-opacity`}
              >
                [{params.tags?.includes('show_hn') ? '×' : ' '}] Show HN
              </button>
              <button
                onClick={() => setParams(prev => ({
                  ...prev,
                  tags: ['ask_hn']
                }))}
                className={`hover:opacity-75 transition-opacity`}
              >
                [{params.tags?.includes('ask_hn') ? '×' : ' '}] Ask HN
              </button>
            </div>

            <button
              onClick={() => handleSearch(0)}
              disabled={loading}
              className={`w-full p-2 sm:p-2 ${themeColors} border hover:opacity-75 disabled:opacity-50`}
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* Results */}
          {results && (
            <div className="mt-4 space-y-4 overflow-hidden flex flex-col">
              <div className="text-sm opacity-75">
                {results.nbHits} results found
              </div>
              
              <div 
                ref={resultsContainerRef}
                className="space-y-0 overflow-y-auto -mx-3 sm:mx-0 px-3 sm:px-0"
                style={{ maxHeight: 'calc(90vh - 220px)' }}
              >
                {results.hits.map((item) => (
                  <div 
                    key={item.objectID}
                    onClick={() => handleItemClick(item)}
                    className={`py-2 cursor-pointer hover:opacity-75 border-b ${
                      theme === 'og' 
                        ? 'border-current/10'
                        : theme === 'green'
                        ? 'border-green-500/20'
                        : 'border-gray-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div>
                        {item.title || 'Comment'}
                      </div>
                      {item.comment_text && (
                        <div 
                          className={`text-sm line-clamp-3 mt-1 ${
                            theme === 'og'
                              ? 'opacity-75'
                              : theme === 'green'
                              ? 'opacity-85'
                              : 'opacity-65'
                          }`}
                          dangerouslySetInnerHTML={{ 
                            __html: item.comment_text 
                          }}
                        />
                      )}
                      <div className={`text-sm ${
                        theme === 'og'
                          ? 'opacity-50'
                          : theme === 'green'
                          ? 'opacity-60'
                          : 'opacity-40'
                      }`}>
                        by {item.author} • {new Date(item.created_at_i * 1000).toLocaleString()}
                        {item.points > 0 && ` • ${item.points} points`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {results.nbPages > 1 && (
                <div className={`flex items-center justify-between py-4 border-t flex-none ${
                  theme === 'og' 
                    ? 'border-current/10'
                    : theme === 'green'
                    ? 'border-green-500/20'
                    : 'border-gray-700'
                }`}>
                  <button
                    onClick={() => handleSearch(results.page - 1)}
                    disabled={results.page === 0}
                    className="opacity-75 hover:opacity-100 disabled:opacity-50"
                  >
                    [Previous]
                  </button>
                  <span>
                    Page {results.page + 1} of {results.nbPages}
                  </span>
                  <button
                    onClick={() => handleSearch(results.page + 1)}
                    disabled={results.page >= results.nbPages - 1}
                    className="opacity-75 hover:opacity-100 disabled:opacity-50"
                  >
                    [Next]
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal; 