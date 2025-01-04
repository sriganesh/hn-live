import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileMoreMenu } from './MobileMoreMenu';

interface JobsPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: 'xs' | 'sm' | 'base';
  colorizeUsernames: boolean;
  classicLayout: boolean;
  onShowSearch: () => void;
  onShowSettings: () => void;
  isSettingsOpen?: boolean;
  isSearchOpen?: boolean;
}

interface HNJob {
  id: number;
  title: string;
  url?: string;
  by: string;
  time: number;
  text?: string;
}

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  } else {
    return 'just now';
  }
};

interface JobsPageState {
  jobs: HNJob[];
  loading: boolean;
  loadingMore: boolean;
  page: number;
  hasMore: boolean;
}

const JOBS_PER_PAGE = 30;

interface GrepState {
  isActive: boolean;
  searchTerm: string;
  matchedStories: HNJob[];
}

export function JobsPage({ 
  theme, 
  fontSize,
  colorizeUsernames,
  classicLayout,
  onShowSearch,
  onShowSettings,
  isSettingsOpen,
  isSearchOpen
}: JobsPageProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<JobsPageState>({
    jobs: [],
    loading: true,
    loadingMore: false,
    page: 0,
    hasMore: true
  });
  const [grepState, setGrepState] = useState<GrepState>({
    isActive: false,
    searchTerm: '',
    matchedStories: []
  });
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const fetchJobs = async (pageNumber: number) => {
    try {
      if (pageNumber === 0) {
        const response = await fetch('https://hacker-news.firebaseio.com/v0/jobstories.json');
        const allJobIds = await response.json();
        
        const start = pageNumber * JOBS_PER_PAGE;
        const end = start + JOBS_PER_PAGE;
        const pageJobIds = allJobIds.slice(start, end);
        
        const jobPromises = pageJobIds.map(async (id: number) => {
          const jobResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          return jobResponse.json();
        });
        
        const newJobs = await Promise.all(jobPromises);
        
        setState(prev => ({
          ...prev,
          jobs: newJobs,
          loading: false,
          hasMore: end < allJobIds.length
        }));
      } else {
        setState(prev => ({ ...prev, loadingMore: true }));
        
        const response = await fetch('https://hacker-news.firebaseio.com/v0/jobstories.json');
        const allJobIds = await response.json();
        
        const start = pageNumber * JOBS_PER_PAGE;
        const end = start + JOBS_PER_PAGE;
        const pageJobIds = allJobIds.slice(start, end);
        
        const jobPromises = pageJobIds.map(async (id: number) => {
          const jobResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          return jobResponse.json();
        });
        
        const newJobs = await Promise.all(jobPromises);
        
        setState(prev => ({
          ...prev,
          jobs: [...prev.jobs, ...newJobs],
          loadingMore: false,
          hasMore: end < allJobIds.length
        }));
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        loadingMore: false 
      }));
    }
  };

  useEffect(() => {
    fetchJobs(0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setGrepState(prev => ({ ...prev, isActive: true }));
      }
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
          navigate('/');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, grepState.isActive, isSettingsOpen, isSearchOpen]);

  const loadMore = () => {
    const nextPage = state.page + 1;
    setState(prev => ({ ...prev, page: nextPage }));
    fetchJobs(nextPage);
  };

  const handleClose = () => {
    navigate('/');
  };

  const themeColors = theme === 'green'
    ? 'text-green-400 bg-black'
    : theme === 'og'
    ? 'text-[#828282] bg-[#f6f6ef]'
    : 'text-[#828282] bg-[#1a1a1a]';

  const filteredJobs = grepState.searchTerm 
    ? grepState.matchedStories 
    : state.jobs;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMoreMenu && !(event.target as Element).closest('.more-menu-container')) {
        setShowMoreMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMoreMenu]);

  return (
    <>
      <div className={`fixed inset-0 z-50 ${themeColors} overflow-hidden text-${fontSize}`}>
        <div className="h-full overflow-y-auto p-4">
          <div className="hidden sm:flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/')}
                  className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold tracking-wider hover:opacity-75 flex items-center`}
                >
                  <span>HN</span>
                  <span className="text-2xl leading-[0] relative top-[1px] mx-[1px]">•</span>
                  <span>LIVE</span>
                </button>
                <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
                  /
                </span>
                <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
                  JOBS
                </span>
              </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-4">
              <button 
                onClick={() => navigate('/front')}
                className={themeColors}
              >
                [FRONT PAGE]
              </button>
              <button 
                onClick={() => navigate('/show')}
                className={themeColors}
              >
                [SHOW]
              </button>
              <button 
                onClick={() => navigate('/ask')}
                className={themeColors}
              >
                [ASK]
              </button>
              <button 
                onClick={() => navigate('/jobs')}
                className={`${themeColors} opacity-30 hover:opacity-50`}
              >
                [JOBS]
              </button>
              <button 
                onClick={() => navigate('/best')}
                className={themeColors}
              >
                [BEST]
              </button>
              <button 
                onClick={onShowSearch}
                className={themeColors}
                title="Ctrl/Cmd + K"
              >
                [SEARCH]
              </button>
              {grepState.isActive ? (
                <div className="flex items-center gap-2">
                  <span>grep:</span>
                  <input
                    type="text"
                    value={grepState.searchTerm}
                    onChange={(e) => {
                      setGrepState(prev => ({
                        ...prev,
                        searchTerm: e.target.value,
                        matchedStories: e.target.value ? state.jobs.filter(job => {
                          const searchText = `${job.title} ${job.by}`.toLowerCase();
                          return searchText.includes(e.target.value.toLowerCase());
                        }) : []
                      }));
                    }}
                    className="bg-transparent border-b border-current/20 px-1 py-0.5 focus:outline-none focus:border-current/40 w-32"
                    placeholder="filter..."
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  onClick={() => setGrepState(prev => ({ ...prev, isActive: true }))}
                  className={themeColors}
                >
                  [GREP]
                </button>
              )}
              <button
                onClick={onShowSettings}
                className={themeColors}
              >
                [SETTINGS]
              </button>
              <button 
                onClick={handleClose}
                className="opacity-75 hover:opacity-100"
              >
                [ESC]
              </button>
            </div>
          </div>
          <div className="sm:hidden mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/')}
                  className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold tracking-wider hover:opacity-75 flex items-center`}
                >
                  <span>HN</span>
                  <span className="text-2xl leading-[0] relative top-[1px] mx-[1px]">•</span>
                  <span>LIVE</span>
                </button>
                <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
                  /
                </span>
                <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold ml-2`}>
                  JOBS
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={onShowSettings}
                  className={`${themeColors} hover:opacity-75`}
                >
                  [SETTINGS]
                </button>
                <button 
                  onClick={handleClose}
                  className="opacity-75 hover:opacity-100"
                >
                  [ESC]
                </button>
              </div>
            </div>
          </div>

          {state.loading ? (
            <div className="flex items-center justify-center h-full">
              Loading job listings...
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {filteredJobs.map((job, index) => (
                <div 
                  key={job.id}
                  className="group"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="opacity-50">{index + 1}.</span>
                    <div className="space-y-1">
                      <div>
                        <a
                          href={job.url || `https://news.ycombinator.com/item?id=${job.id}`}
                          onClick={(e) => {
                            if (!job.url) {
                              e.preventDefault();
                              navigate(`/item/${job.id}`);
                            }
                          }}
                          className="group-hover:opacity-75"
                          target={job.url ? "_blank" : undefined}
                          rel={job.url ? "noopener noreferrer" : undefined}
                        >
                          {job.title}
                        </a>
                        {job.url && (
                          <span className="ml-2 opacity-50 text-sm">
                            ({new URL(job.url).hostname})
                          </span>
                        )}
                      </div>
                      <div className="text-sm opacity-75">
                        <span title={new Date(job.time * 1000).toLocaleString()}>
                          {formatTimeAgo(job.time)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`border-b border-current opacity-5 mt-4`} />
                </div>
              ))}

              {state.hasMore && (
                <div className="text-center py-8">
                  <button
                    onClick={loadMore}
                    disabled={state.loadingMore}
                    className={`${
                      theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                    } opacity-75 hover:opacity-100 transition-opacity disabled:opacity-50`}
                  >
                    {state.loadingMore ? 'Loading more jobs...' : 'Load more jobs'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="fixed sm:hidden bottom-0 left-0 right-0 mobile-bottom-bar border-t z-50">
        <div className={`
          ${theme === 'green'
            ? 'bg-black/90 border-green-500/30 text-green-400'
            : theme === 'og'
            ? 'bg-[#f6f6ef]/90 border-[#ff6600]/30 text-[#828282]'
            : 'bg-[#1a1a1a]/90 border-[#828282]/30 text-[#828282]'
          } grid grid-cols-5 divide-x ${
            theme === 'green'
              ? 'divide-green-500/30'
              : theme === 'og'
              ? 'divide-[#ff6600]/30'
              : 'divide-[#828282]/30'
          }`}
        >
          <button
            onClick={() => navigate('/')}
            className="p-4 flex items-center justify-center relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </button>

          <button
            onClick={() => navigate('/front')}
            className="p-4 flex items-center justify-center relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z" clipRule="evenodd" />
              <path d="M15 7h1a2 2 0 012 2v5.5a1.5 1.5 0 01-3 0V7z" />
            </svg>
          </button>

          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-4 flex items-center justify-center relative more-menu-container"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>

            <MobileMoreMenu 
              theme={theme}
              showMenu={showMoreMenu}
              onClose={() => setShowMoreMenu(false)}
            />
          </button>

          <button
            onClick={onShowSearch}
            className="p-4 flex items-center justify-center relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            onClick={onShowSettings}
            className="p-4 flex items-center justify-center relative"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
} 