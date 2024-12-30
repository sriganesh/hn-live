import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface JobsPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: 'xs' | 'sm' | 'base';
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

export function JobsPage({ theme, fontSize }: JobsPageProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<JobsPageState>({
    jobs: [],
    loading: true,
    loadingMore: false,
    page: 0,
    hasMore: true
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
      if (e.key === 'Escape') {
        navigate('/');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

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

  return (
    <div className={`fixed inset-0 z-50 ${themeColors} overflow-hidden text-${fontSize}`}>
      <div className="h-full overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold tracking-wider`}>
              HN.LIVE
            </span>
            <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold`}>
              /
            </span>
            <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold`}>
              JOBS
            </span>
          </div>
          <button 
            onClick={handleClose}
            className="opacity-75 hover:opacity-100"
          >
            [ESC]
          </button>
        </div>

        {state.loading ? (
          <div className="flex items-center justify-center h-full">
            Loading job listings...
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {state.jobs.map((job, index) => (
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
  );
} 