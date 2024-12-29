import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface ShowPageProps {
  theme: 'green' | 'og' | 'dog';
}

interface HNStory {
  id: number;
  title: string;
  url?: string;
  by: string;
  time: number;
  score: number;
  descendants: number;
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

interface ShowPageState {
  stories: HNStory[];
  loading: boolean;
  loadingMore: boolean;
  page: number;
  hasMore: boolean;
}

const STORIES_PER_PAGE = 30;

export function ShowPage({ theme }: ShowPageProps) {
  const navigate = useNavigate();
  const [state, setState] = useState<ShowPageState>({
    stories: [],
    loading: true,
    loadingMore: false,
    page: 0,
    hasMore: true
  });

  const fetchStories = async (pageNumber: number) => {
    try {
      if (pageNumber === 0) {
        const response = await fetch('https://hacker-news.firebaseio.com/v0/showstories.json');
        const allStoryIds = await response.json();
        
        const start = pageNumber * STORIES_PER_PAGE;
        const end = start + STORIES_PER_PAGE;
        const pageStoryIds = allStoryIds.slice(start, end);
        
        const storyPromises = pageStoryIds.map(async (id: number) => {
          const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          return storyResponse.json();
        });
        
        const newStories = await Promise.all(storyPromises);
        
        setState(prev => ({
          ...prev,
          stories: newStories,
          loading: false,
          hasMore: end < allStoryIds.length
        }));
      } else {
        setState(prev => ({ ...prev, loadingMore: true }));
        
        const response = await fetch('https://hacker-news.firebaseio.com/v0/showstories.json');
        const allStoryIds = await response.json();
        
        const start = pageNumber * STORIES_PER_PAGE;
        const end = start + STORIES_PER_PAGE;
        const pageStoryIds = allStoryIds.slice(start, end);
        
        const storyPromises = pageStoryIds.map(async (id: number) => {
          const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          return storyResponse.json();
        });
        
        const newStories = await Promise.all(storyPromises);
        
        setState(prev => ({
          ...prev,
          stories: [...prev.stories, ...newStories],
          loadingMore: false,
          hasMore: end < allStoryIds.length
        }));
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        loadingMore: false 
      }));
    }
  };

  useEffect(() => {
    fetchStories(0);
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
    fetchStories(nextPage);
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
    <div className={`fixed inset-0 z-50 ${themeColors} overflow-hidden`}>
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
              SHOW HN
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
            Loading Show HN stories...
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {state.stories.map((story, index) => (
              <div 
                key={story.id}
                className="group"
              >
                <div className="flex items-baseline gap-2">
                  <span className="opacity-50">{index + 1}.</span>
                  <div className="space-y-1">
                    <div>
                      <a
                        href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                        onClick={(e) => {
                          if (!story.url) {
                            e.preventDefault();
                            navigate(`/item/${story.id}`);
                          }
                        }}
                        className="group-hover:opacity-75"
                        target={story.url ? "_blank" : undefined}
                        rel={story.url ? "noopener noreferrer" : undefined}
                      >
                        {story.title}
                      </a>
                      {story.url && (
                        <span className="ml-2 opacity-50 text-sm">
                          ({new URL(story.url).hostname})
                        </span>
                      )}
                    </div>
                    <div className="text-sm opacity-75">
                      {story.score} points by{' '}
                      <a 
                        href={`https://news.ycombinator.com/user?id=${story.by}`}
                        className="hn-username hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {story.by}
                      </a>{' '}
                      <span title={new Date(story.time * 1000).toLocaleString()}>
                        {formatTimeAgo(story.time)}
                      </span> • {' '}
                      <button
                        onClick={() => navigate(`/item/${story.id}`)}
                        className="hover:underline"
                      >
                        {story.descendants || 0} comments
                      </button>
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
                  {state.loadingMore ? 'Loading more stories...' : 'Load more stories'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 