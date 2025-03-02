import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileBottomBar } from '../../components/navigation/MobileBottomBar';

interface ReplayViewProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: FontOption;
  onShowSearch: () => void;
  onShowSettings: () => void;
  isSettingsOpen: boolean;
  isSearchOpen: boolean;
  isRunning: boolean;
}

interface ReplayComment {
  id: number;
  by: string;
  text: string;
  time: number;
  kids?: number[];
  parent: number;
  level: number;
}

interface ReplayStory {
  id: number;
  title: string;
  url?: string;
  by: string;
  text?: string;
  time: number;
  score: number;
  descendants: number;
}

type FontOption = 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';

const ReplayView = ({
  theme,
  fontSize,
  font,
  onShowSearch,
  onShowSettings,
  isSettingsOpen,
  isSearchOpen,
  isRunning
}: ReplayViewProps) => {
  const navigate = useNavigate();
  const [story, setStory] = useState<ReplayStory | null>(null);
  const [comments, setComments] = useState<ReplayComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showAllComments, setShowAllComments] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get the item ID from the URL
  const itemId = window.location.pathname.split('/').pop();

  // Fetch story and comments
  useEffect(() => {
    const fetchStoryAndComments = async () => {
      if (!itemId) {
        setError('No item ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch the story
        const storyResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${itemId}.json`);
        const storyData = await storyResponse.json();
        
        if (!storyData) {
          setError('Story not found');
          setLoading(false);
          return;
        }
        
        setStory(storyData);
        
        // Fetch all comments recursively
        const fetchedComments: ReplayComment[] = [];
        
        const fetchComments = async (ids: number[] = [], level: number = 0) => {
          if (!ids || ids.length === 0) return;
          
          for (const id of ids) {
            try {
              const commentResponse = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
              const commentData = await commentResponse.json();
              
              if (commentData && commentData.type === 'comment' && !commentData.deleted) {
                const comment: ReplayComment = {
                  ...commentData,
                  level,
                };
                
                fetchedComments.push(comment);
                
                if (commentData.kids) {
                  await fetchComments(commentData.kids, level + 1);
                }
              }
            } catch (error) {
              console.error(`Error fetching comment ${id}:`, error);
            }
          }
        };
        
        if (storyData.kids) {
          await fetchComments(storyData.kids);
        }
        
        // Sort comments by time
        fetchedComments.sort((a, b) => a.time - b.time);
        
        setComments(fetchedComments);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching story and comments:', error);
        setError('Failed to load story and comments');
        setLoading(false);
      }
    };
    
    fetchStoryAndComments();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [itemId]);

  // Handle playback
  useEffect(() => {
    if (isPlaying && comments.length > 0 && currentIndex < comments.length) {
      timerRef.current = setInterval(() => {
        setCurrentIndex(prevIndex => {
          const nextIndex = prevIndex + 1;
          if (nextIndex >= comments.length) {
            setIsPlaying(false);
            return prevIndex;
          }
          return nextIndex;
        });
      }, 2000 / playbackSpeed);
    } else if (!isPlaying && timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, comments.length, currentIndex, playbackSpeed]);

  // Scroll to the current comment
  useEffect(() => {
    if (!showAllComments && comments.length > 0 && currentIndex < comments.length) {
      const commentElement = document.getElementById(`comment-${comments[currentIndex].id}`);
      if (commentElement) {
        commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentIndex, comments, showAllComments]);

  // Format date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate(-1);
      } else if (e.key === ' ') {
        setIsPlaying(prev => !prev);
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex(prev => Math.min(prev + 1, comments.length - 1));
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
        e.preventDefault();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, comments.length]);

  // Render HTML content safely
  const renderHTML = (html: string) => {
    return { __html: html };
  };

  // Truncate URL for display
  const truncateUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch (e) {
      return url;
    }
  };

  if (loading) {
    return (
      <div className={`
        fixed inset-0 z-50 flex items-center justify-center
        ${theme === 'green' ? 'bg-black text-green-400' : 
          theme === 'og' ? 'bg-[#f6f6ef] text-[#828282]' : 
          'bg-[#1a1a1a] text-[#828282]'}
        text-${fontSize}
      `}>
        Loading story and comments...
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className={`
        fixed inset-0 z-50 flex items-center justify-center
        ${theme === 'green' ? 'bg-black text-green-400' : 
          theme === 'og' ? 'bg-[#f6f6ef] text-[#828282]' : 
          'bg-[#1a1a1a] text-[#828282]'}
        text-${fontSize}
      `}>
        {error || 'Failed to load story'}
      </div>
    );
  }

  return (
    <div className={`
      fixed inset-0 z-50 overflow-hidden
      ${font === 'mono' ? 'font-mono' : 
        font === 'jetbrains' ? 'font-jetbrains' :
        font === 'fira' ? 'font-fira' :
        font === 'source' ? 'font-source' :
        font === 'sans' ? 'font-sans' :
        font === 'serif' ? 'font-serif' :
        'font-system'}
      ${theme === 'green' ? 'bg-black text-green-400' : 
        theme === 'og' ? 'bg-[#f6f6ef] text-[#828282]' : 
        'bg-[#1a1a1a] text-[#828282]'}
      text-${fontSize}
    `}>
      {/* Header */}
      <div className="p-4 border-b border-opacity-10 border-current">
        <div className="space-y-2">
          {/* First line */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className={`${
                theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
              } font-bold tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity`}
            >
              HN
              <span className="animate-pulse">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  isRunning ? 'bg-current' : 'bg-gray-500'
                } opacity-50`}></span>
              </span>
              LIVE
            </button>
            <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold`}>
              /
            </span>
            <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold`}>
              REPLAY
            </span>
            <div className="flex-1" />
            <button
              onClick={() => navigate(-1)}
              className="opacity-50 hover:opacity-100"
            >
              [ESC]
            </button>
          </div>

          {/* Story title */}
          <h1 className={`text-lg font-bold ${theme === 'green' ? 'text-green-400' : 'text-black dark:text-white'}`}>
            {story.title}
          </h1>
          
          {/* URL and metadata */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {story.url && (
              <>
                <a 
                  href={story.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="opacity-75 hover:opacity-100"
                >
                  {truncateUrl(story.url)}
                </a>
                <span className="opacity-50">•</span>
              </>
            )}
            <span className="opacity-75">{story.score} points by {story.by}</span>
            <span className="opacity-50">•</span>
            <span className="opacity-75">{formatDate(story.time)}</span>
            <span className="opacity-50">•</span>
            <span className="opacity-75">{story.descendants} comments</span>
          </div>
          
          {/* Story text if any */}
          {story.text && (
            <div 
              className="mt-4 prose prose-sm max-w-none"
              dangerouslySetInnerHTML={renderHTML(story.text)}
            />
          )}
        </div>
      </div>

      {/* Playback controls */}
      <div className={`
        sticky top-0 z-10 p-4 border-b border-opacity-10 border-current
        ${theme === 'green' ? 'bg-black' : 
          theme === 'og' ? 'bg-[#f6f6ef]' : 
          'bg-[#1a1a1a]'}
      `}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`
                p-2 rounded-full
                ${theme === 'green' ? 'hover:bg-green-900' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}
              `}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
              )}
            </button>
            
            <button
              onClick={() => setCurrentIndex(Math.max(currentIndex - 1, 0))}
              disabled={currentIndex === 0}
              className={`
                p-2 rounded-full
                ${currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : 
                  theme === 'green' ? 'hover:bg-green-900' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}
              `}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            
            <button
              onClick={() => setCurrentIndex(Math.min(currentIndex + 1, comments.length - 1))}
              disabled={currentIndex >= comments.length - 1}
              className={`
                p-2 rounded-full
                ${currentIndex >= comments.length - 1 ? 'opacity-50 cursor-not-allowed' : 
                  theme === 'green' ? 'hover:bg-green-900' : 'hover:bg-gray-200 dark:hover:bg-gray-800'}
              `}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
            
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm">Speed:</span>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className={`
                  p-1 rounded text-sm
                  ${theme === 'green' ? 'bg-black border border-green-500' : 
                    theme === 'og' ? 'bg-[#f6f6ef] border border-[#ff6600]' : 
                    'bg-[#1a1a1a] border border-[#828282]'}
                `}
              >
                <option value="0.5">0.5x</option>
                <option value="1">1x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {currentIndex + 1} / {comments.length}
            </span>
            <button
              onClick={() => setShowAllComments(!showAllComments)}
              className={`
                text-sm px-2 py-1 rounded
                ${theme === 'green' ? 'border border-green-500 hover:bg-green-900' : 
                  theme === 'og' ? 'border border-[#ff6600] hover:bg-gray-200' : 
                  'border border-[#828282] hover:bg-gray-800'}
              `}
            >
              {showAllComments ? 'Show Current' : 'Show All'}
            </button>
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="overflow-y-auto h-[calc(100vh-200px)]" ref={containerRef}>
        <div className="p-2 space-y-6">
          {comments.length === 0 ? (
            <div className="text-center py-8">No comments yet</div>
          ) : (
            showAllComments ? (
              // Show all comments
              comments.map((comment) => (
                <div 
                  key={comment.id}
                  id={`comment-${comment.id}`}
                  className={`
                    pl-${Math.min(comment.level * 4, 16)} 
                    ${currentIndex === comments.indexOf(comment) ? 
                      theme === 'green' ? 'bg-green-900/20' : 
                      theme === 'og' ? 'bg-[#ff6600]/10' : 
                      'bg-gray-700/20' 
                    : ''}
                    p-2 rounded
                  `}
                >
                  <div className="text-sm opacity-75 mb-1">
                    <span>{comment.by}</span>
                    <span className="mx-2">•</span>
                    <span>{formatDate(comment.time)}</span>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={renderHTML(comment.text)}
                  />
                </div>
              ))
            ) : (
              // Show only current comment
              currentIndex < comments.length && (
                <div 
                  id={`comment-${comments[currentIndex].id}`}
                  className={`
                    pl-${Math.min(comments[currentIndex].level * 4, 16)} 
                    ${theme === 'green' ? 'bg-green-900/20' : 
                      theme === 'og' ? 'bg-[#ff6600]/10' : 
                      'bg-gray-700/20'}
                    p-2 rounded
                  `}
                >
                  <div className="text-sm opacity-75 mb-1">
                    <span>{comments[currentIndex].by}</span>
                    <span className="mx-2">•</span>
                    <span>{formatDate(comments[currentIndex].time)}</span>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={renderHTML(comments[currentIndex].text)}
                  />
                </div>
              )
            )
          )}
        </div>
      </div>

      <MobileBottomBar 
        theme={theme}
        onShowSearch={onShowSearch}
        onShowSettings={onShowSettings}
        onCloseSearch={() => {}}
        isRunning={isRunning}
        username={null}
        unreadCount={0}
        className="z-30"
      />
    </div>
  );
};

export default ReplayView; 