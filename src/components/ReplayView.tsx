import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTopUsers } from '../hooks/useTopUsers';
import { UserModal } from './UserModal';

interface ReplayViewProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: string;
  onShowSettings: () => void;
  isSettingsOpen: boolean;
  isRunning: boolean;
}

interface ReplayComment {
  id: number;
  text: string;
  by: string;
  time: number;
  level: number;
  parent_id?: number;
}

interface ReplayStory {
  id: number;
  title: string;
  text?: string;
  url?: string;
  by: string;
  time: number;
  comments: ReplayComment[];
}

const MIN_COMMENT_DELAY = 800;
const MAX_COMMENT_DELAY = 2000;

export function ReplayView({ 
  theme, 
  fontSize, 
  font,
  onShowSettings,
  isSettingsOpen,
  isRunning
}: ReplayViewProps) {
  const navigate = useNavigate();
  const { itemId } = useParams();
  const { isTopUser, getTopUserClass } = useTopUsers();
  
  const [story, setStory] = useState<ReplayStory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayedComments, setDisplayedComments] = useState<ReplayComment[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [viewingUser, setViewingUser] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [totalComments, setTotalComments] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showAutoScrollNotif, setShowAutoScrollNotif] = useState(false);
  const [showPlaybackNotif, setShowPlaybackNotif] = useState(false);

  const queueRef = useRef<ReplayComment[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch story and prepare comments
  useEffect(() => {
    const fetchStory = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://hn.algolia.com/api/v1/items/${itemId}`);
        const algoliaData = await response.json();
        const comments = flattenComments(algoliaData.children || []);
        
        // If no comments, redirect to story page
        if (!comments.length) {
          // Show notification before redirect
          const notification = document.createElement('div');
          notification.className = `fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm z-[100]
            ${theme === 'green'
              ? 'bg-black/90 text-green-400 border border-green-500/20'
              : theme === 'og'
              ? 'bg-[#f6f6ef]/90 text-[#828282] border border-[#ff6600]/20'
              : 'bg-[#1a1a1a]/90 text-[#828282] border border-[#828282]/20'
            }`;
          notification.textContent = 'No comments to replay. Redirecting to story...';
          document.body.appendChild(notification);
          
          // Remove notification and redirect after delay
          setTimeout(() => {
            document.body.removeChild(notification);
            navigate(`/item/${itemId}`);
          }, 1500);
          return;
        }

        // Continue with normal story loading if there are comments
        const sortedComments = comments.sort((a, b) => a.time - b.time);
        setStory({
          id: algoliaData.id,
          title: algoliaData.title,
          text: algoliaData.text,
          url: algoliaData.url,
          by: algoliaData.author,
          time: algoliaData.created_at_i,
          comments: sortedComments
        });

        queueRef.current = [...sortedComments];
        setTotalComments(sortedComments.length);
        setIsReady(true);
      } catch (error) {
        console.error('Error fetching story:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (itemId) {
      fetchStory();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [itemId, navigate, theme]);

  // Add effect to start playing when ready
  useEffect(() => {
    if (isReady && queueRef.current.length > 0) {
      console.log('Story ready, starting playback');
      setIsPlaying(true);
    }
  }, [isReady]);

  // Handle comment playback
  useEffect(() => {
    console.log('Playback effect triggered:', { 
      isPlaying,
      isReady,
      queueLength: queueRef.current.length,
      displayedComments: displayedComments.length 
    });

    if (!isReady || !isPlaying || !queueRef.current.length) {
      console.log('Not ready for playback:', { isReady, isPlaying, queueLength: queueRef.current.length });
      return;
    }

    const processNextComment = () => {
      console.log('Processing next comment');
      const nextComment = queueRef.current.shift();
      if (nextComment) {
        console.log('Adding comment:', nextComment);
        setDisplayedComments(prev => [...prev, nextComment]);
        
        if (queueRef.current.length) {
          const delay = (MIN_COMMENT_DELAY + Math.random() * (MAX_COMMENT_DELAY - MIN_COMMENT_DELAY)) / playbackSpeed;
          console.log('Scheduling next comment in:', delay, 'ms');
          timeoutRef.current = setTimeout(processNextComment, delay);
        } else {
          console.log('Queue empty, stopping playback');
          setIsPlaying(false);
        }
      }
    };

    console.log('Starting initial timeout');
    timeoutRef.current = setTimeout(processNextComment, MIN_COMMENT_DELAY / playbackSpeed);

    return () => {
      if (timeoutRef.current) {
        console.log('Cleaning up timeout');
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, isReady]);

  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
    setShowPlaybackNotif(true);
    setTimeout(() => setShowPlaybackNotif(false), 1500);
  };

  const handleSpeedChange = () => {
    setPlaybackSpeed(prev => {
      // Cycle through: 0.25 -> 0.5 -> 1 -> 2 -> 4 -> back to 0.25
      if (prev === 0.25) return 0.5;
      if (prev === 0.5) return 1;
      if (prev === 1) return 2;
      if (prev === 2) return 4;
      return 0.25; // If 4 or any other value, go back to 0.25
    });
  };

  const handleReset = () => {
    // Clear displayed comments
    setDisplayedComments([]);
    // Reset queue with all comments
    queueRef.current = [...(story?.comments || [])];
    // Stop playback
    setIsPlaying(false);
  };

  // Add scroll logic to comment display
  useEffect(() => {
    if (autoScroll && displayedComments.length > 0 && containerRef.current) {
      containerRef.current.scrollTo({
        top: containerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [displayedComments, autoScroll]);

  const handleAutoScrollToggle = () => {
    setAutoScroll(prev => !prev);
    setShowAutoScrollNotif(true);
    setTimeout(() => setShowAutoScrollNotif(false), 1500);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        navigate(-1);
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, itemId]);

  return (
    <>
      {story && (
        <Helmet>
          <title>{`Replay: ${story.title} | HN Live`}</title>
        </Helmet>
      )}

      {/* Fixed progress bar at top */}
      {story && (
        <div className="fixed top-0 left-0 right-0 z-[60] h-1 bg-black/10">
          <div 
            className={`h-full transition-all duration-300 ${
              theme === 'green' 
                ? 'bg-green-400' 
                : 'bg-[#ff6600]'
            }`}
            style={{ 
              width: `${(displayedComments.length / totalComments) * 100}%` 
            }}
          />
        </div>
      )}

      <div 
        ref={containerRef}
        className={`fixed inset-0 overflow-y-auto z-50 pt-1
          ${font === 'mono' ? 'font-mono' : 
            font === 'jetbrains' ? 'font-jetbrains' :
            font === 'fira' ? 'font-fira' :
            font === 'source' ? 'font-source' :
            font === 'sans' ? 'font-sans' :
            font === 'serif' ? 'font-serif' :
            'font-system'}
          ${theme === 'green'
            ? 'bg-black text-green-400'
            : theme === 'og'
            ? 'bg-[#f6f6ef] text-[#828282]'
            : 'bg-[#1a1a1a] text-[#828282]'}
          text-${fontSize}
        `}
      >
        {/* Header */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => navigate(`/item/${itemId}`)}
              className={`${
                theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
              } font-bold tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity`}
            >
              ← Back to Discussion
            </button>
          </div>

          {/* Story content */}
          {story && (
            <div className="max-w-4xl mx-auto">
              {/* Story header */}
              <h1 className="text-xl font-bold mb-2">
                {story.url ? (
                  <a href={story.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-75">
                    {story.title}
                    <span className="ml-2 font-normal text-base opacity-50">
                      ({new URL(story.url).hostname})
                    </span>
                  </a>
                ) : (
                  story.title
                )}
              </h1>

              {/* Story metadata */}
              <div className="text-sm opacity-75 mb-4">
                by <a 
                  onClick={(e) => {
                    e.preventDefault();
                    setViewingUser(story.by);
                  }}
                  href={`/user/${story.by}`}
                  className={`hover:underline text-[#ff6600] ${isTopUser(story.by) ? 'font-bold' : ''}`}
                >
                  {story.by}
                </a> • 
                <a
                  href={`https://news.ycombinator.com/item?id=${story.id}`}
                  className="hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  title={new Date(story.time * 1000).toLocaleString()}
                >
                  {new Date(story.time * 1000).toLocaleString()}
                </a>
              </div>

              {/* Story text if any */}
              {story.text && (
                <div 
                  className="prose max-w-none mb-8"
                  dangerouslySetInnerHTML={{ __html: story.text }}
                />
              )}

              {/* Comments */}
              <div className="space-y-4">
                {displayedComments.map(comment => (
                  <div 
                    key={comment.id}
                    className="py-2 animate-fade-in"
                  >
                    <div className="text-sm opacity-75 mb-1 flex items-center gap-1">
                      <a 
                        onClick={(e) => {
                          e.preventDefault();
                          setViewingUser(comment.by);
                        }}
                        href={`/user/${comment.by}`}
                        className={`hover:underline text-[#ff6600] ${isTopUser(comment.by) ? 'font-bold' : ''}`}
                      >
                        {comment.by}
                      </a>
                      {comment.by === story?.by && (
                        <span className="opacity-50">[OP]</span>
                      )} • 
                      <a
                        href={`https://news.ycombinator.com/item?id=${comment.id}`}
                        className="hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                        title={new Date(comment.time * 1000).toLocaleString()}
                      >
                        {new Date(comment.time * 1000).toLocaleString()}
                      </a>
                    </div>
                    <div 
                      className="prose max-w-none break-words whitespace-pre-wrap overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: comment.text }}
                    />
                  </div>
                ))}

                {/* Bottom links - only show when all comments are displayed */}
                {displayedComments.length === totalComments && displayedComments.length > 0 && (
                  <div className="mt-8 mb-32 text-center space-y-2 opacity-75 animate-fade-in">
                    <a
                      href={`https://news.ycombinator.com/item?id=${story.id}`}
                      className={`block hover:underline ${
                        theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      → View this story on Hacker News
                    </a>
                    <div>or</div>
                    <a
                      href="/"
                      className={`block hover:underline ${
                        theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/');
                      }}
                    >
                      → Head back to the live feed to see real-time stories and discussions
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop controls */}
        <div className={`
          hidden sm:flex fixed bottom-8 right-8 z-[60] 
          flex-col gap-1.5 p-3 rounded-lg shadow-lg
          ${theme === 'green'
            ? 'bg-black/90 text-green-400 border border-green-500/20'
            : theme === 'og'
            ? 'bg-[#f6f6ef]/90 text-[#828282] border border-[#ff6600]/20'
            : 'bg-[#1a1a1a]/90 text-[#828282] border border-[#828282]/20'
          }
        `}>
          <button
            onClick={handleReset}
            className="opacity-75 hover:opacity-100 transition-opacity py-0.5"
            title="Reset"
          >
            [RESET]
          </button>
          <button
            onClick={handleSpeedChange}
            className="opacity-75 hover:opacity-100 transition-opacity py-0.5"
            title="Change playback speed"
          >
            [{playbackSpeed}x]
          </button>
          <button
            onClick={handleAutoScrollToggle}
            className={`opacity-75 hover:opacity-100 transition-opacity py-0.5 ${!autoScroll ? 'opacity-50' : ''}`}
            title="Toggle auto-scroll"
          >
            [SCROLL: {autoScroll ? 'ON' : 'OFF'}]
          </button>
          <button
            onClick={handlePlayPause}
            className="opacity-75 hover:opacity-100 transition-opacity py-0.5"
            title="Change playback speed"
          >
            [{isPlaying ? 'PAUSE' : 'PLAY'}]
          </button>
        </div>

        {/* Mobile drawer - media player style */}
        <div className={`
          sm:hidden fixed top-[70%] right-0 z-[60]
          transition-transform duration-300 ease-in-out
          ${isDrawerOpen ? 'translate-x-0' : 'translate-x-[calc(100%-1rem)]'}
          ${theme === 'green'
            ? 'bg-black/90 text-green-400 border-green-500/20'
            : theme === 'og'
            ? 'bg-[#f6f6ef]/90 text-[#828282] border-[#ff6600]/20'
            : 'bg-[#1a1a1a]/90 text-[#828282] border-[#828282]/20'
          }
          backdrop-blur-sm rounded-l-lg shadow-lg border-l
          max-w-[240px] h-12
        `}>
          {/* Handle - minimal version */}
          <div 
            className="absolute left-0 top-0 bottom-0 -translate-x-full
              w-5 flex items-center justify-center cursor-pointer"
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          >
            <span className={`
              text-lg transition-transform duration-300
              ${isDrawerOpen ? 'rotate-180' : ''}
              ${theme === 'green'
                ? 'text-green-400'
                : theme === 'og'
                ? 'text-[#828282]'
                : 'text-[#828282]'
              }
            `}>
              ⏵
            </span>
          </div>

          {/* Controls container with separators */}
          <div className="h-full px-4 flex items-center justify-between">
            {/* Reset icon */}
            <button 
              onClick={handleReset}
              className="p-2 opacity-75 hover:opacity-100 transition-opacity border-r border-current/10"
              title="Reset"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
            </button>

            {/* Speed */}
            <button 
              onClick={handleSpeedChange}
              className="p-2 opacity-75 hover:opacity-100 transition-opacity border-r border-current/10 w-[4.5rem] text-center"
              title="Change speed"
            >
              {playbackSpeed}x
            </button>

            {/* Play/Pause icon */}
            <button 
              onClick={handlePlayPause}
              className="p-2 opacity-75 hover:opacity-100 transition-opacity border-r border-current/10"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                {isPlaying ? (
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>  // Pause icon
                ) : (
                  <path d="M8 5v14l11-7z"/>  // Play icon
                )}
              </svg>
            </button>

            {/* Autoscroll icon */}
            <button 
              onClick={handleAutoScrollToggle}
              className={`p-2 opacity-75 hover:opacity-100 transition-opacity ${!autoScroll ? 'opacity-50' : ''}`}
              title="Toggle auto-scroll"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                {/* Double chevron down to indicate continuous scrolling */}
                <path d="M7 7l5 5 5-5M7 13l5 5 5-5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* User modal */}
      {viewingUser && (
        <UserModal
          userId={viewingUser}
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
          theme={theme}
          fontSize={fontSize}
        />
      )}

      {/* Notification overlay */}
      <div className="fixed inset-0 pointer-events-none z-[70] flex items-center justify-center">
        {showAutoScrollNotif && (
          <div className={`
            px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm
            ${theme === 'green'
              ? 'bg-black/90 text-green-400 border border-green-500/20'
              : theme === 'og'
              ? 'bg-[#f6f6ef]/90 text-[#828282] border border-[#ff6600]/20'
              : 'bg-[#1a1a1a]/90 text-[#828282] border border-[#828282]/20'
            }
            animate-fade-in-out
          `}>
            Auto-scroll {autoScroll ? 'enabled' : 'disabled'}
          </div>
        )}
        {showPlaybackNotif && (
          <div className={`
            px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm
            ${theme === 'green'
              ? 'bg-black/90 text-green-400 border border-green-500/20'
              : theme === 'og'
              ? 'bg-[#f6f6ef]/90 text-[#828282] border border-[#ff6600]/20'
              : 'bg-[#1a1a1a]/90 text-[#828282] border border-[#828282]/20'
            }
            animate-fade-in-out
          `}>
            Playback {isPlaying ? 'resumed' : 'paused'}
          </div>
        )}
      </div>
    </>
  );
}

// Helper function to flatten nested comments
function flattenComments(comments: any[], level: number = 0): ReplayComment[] {
  return comments.reduce((acc: ReplayComment[], comment: any) => {
    if (comment.text) {
      acc.push({
        id: comment.id,
        text: comment.text,
        by: comment.author,
        time: comment.created_at_i,
        level,
        parent_id: comment.parent_id
      });
    }
    if (comment.children) {
      acc.push(...flattenComments(comment.children, level + 1));
    }
    return acc;
  }, []);
} 