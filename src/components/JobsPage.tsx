import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileBottomBar } from './MobileBottomBar';

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

      <MobileBottomBar 
        theme={theme}
        onShowSearch={onShowSearch}
        onShowSettings={onShowSettings}
      />
    </>
  );
} 