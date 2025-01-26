import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';

type FontOption = 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';

interface ProfilePageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: FontOption;
  onShowSettings: () => void;
  isSettingsOpen: boolean;
  isRunning: boolean;
  onUserClick: (username: string) => void;
}

interface Comment {
  id: string;
  comment_text: string;
  author: string;
  created_at: string;
  story_id: string;
  story_title: string;
  story_url?: string;
  objectID: string;
}

interface TrackerComment {
  id: string;
  replyIds: string[];
  timestamp: number;
}

interface TrackerData {
  lastChecked: number;
  comments: TrackerComment[];
  lastSeenReplies: {
    [commentId: string]: string[];  // Store reply IDs we've seen for each comment
  };
}

interface NewReply {
  id: string;
  seen: boolean;
}

function processCommentData(comments: any[] = [], replies: any[] = []): Comment[] {
  // Ensure both inputs are arrays, defaulting to empty arrays if undefined
  const validComments = Array.isArray(comments) ? comments : [];
  const validReplies = Array.isArray(replies) ? replies : [];
  
  // Create a map of story IDs to titles from comments
  const storyTitles = new Map<string, string>();
  validComments.forEach(comment => {
    if (comment.story_id && comment.story_title) {
      storyTitles.set(comment.story_id.toString(), comment.story_title);
    }
  });
  
  // Combine comments and replies into a single array
  return [...validComments, ...validReplies].map(item => {
    const storyId = item.story_id?.toString() || '';
    return {
      id: item.objectID || '',
      comment_text: item.comment_text || '',
      author: item.author || '',
      created_at: item.created_at || '',
      story_id: storyId,
      story_title: item.story_title || storyTitles.get(storyId) || 'Unknown Story',
      story_url: item.story_url || '',
      objectID: item.objectID || ''
    };
  });
}

export function ProfilePage({ 
  theme,
  fontSize,
  font,
  onShowSettings,
  isSettingsOpen,
  isRunning,
  onUserClick
}: ProfilePageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const hnUsername = localStorage.getItem('hn-username');
  const [comments, setComments] = useState<Comment[]>([]);
  const [trackerData, setTrackerData] = useState<TrackerData | null>(null);
  const [loading, setLoading] = useState(location.pathname === '/profile');
  const [unreadCount, setUnreadCount] = useState<number>(() => {
    try {
      const newReplies = JSON.parse(localStorage.getItem('hn-new-replies') || '{}') as Record<string, NewReply[]>;
      return Object.values(newReplies).reduce((count: number, replies: NewReply[]) => {
        const unseenReplies = replies.filter(r => !r.seen).length;
        return count + unseenReplies;
      }, 0);
    } catch (e) {
      console.warn('Could not calculate initial unread count');
      return 0;
    }
  });

  // Separate useEffect for loading comments
  useEffect(() => {
    if (!trackerData) return;
    
    const loadComments = async () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('Loading comments from tracker data...');
      }
      
      // Don't set loading state if no username
      if (!hnUsername) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        const commentIds = trackerData.comments.map((comment: TrackerComment) => comment.id);
        
        if (commentIds.length === 0) {
          setComments([]);
          return;
        }

        // Fetch comments
        const commentsResponse = await fetch(
          `https://hn.algolia.com/api/v1/search_by_date?tags=comment&numericFilters=created_at_i>0&filters=${encodeURIComponent(commentIds.map((id: string) => `objectID:${id}`).join(' OR '))}`
        );
        
        if (!commentsResponse.ok) {
          throw new Error(`Comments API error: ${commentsResponse.status}`);
        }
        
        const commentsData = await commentsResponse.json();

        // Get reply IDs
        const replyIds = trackerData.comments.reduce((ids: string[], comment: TrackerComment) => 
          [...ids, ...comment.replyIds], []);

        if (replyIds.length === 0) {
          const processedData = processCommentData(commentsData.hits, []);
          setComments(processedData);
          return;
        }

        // Fetch replies
        const repliesResponse = await fetch(
          `https://hn.algolia.com/api/v1/search_by_date?tags=comment&numericFilters=created_at_i>0&filters=${encodeURIComponent(replyIds.map((id: string) => `objectID:${id}`).join(' OR '))}`
        );

        if (!repliesResponse.ok) {
          throw new Error(`Replies API error: ${repliesResponse.status}`);
        }

        const repliesData = await repliesResponse.json();

        // Process and set all data
        const processedData = processCommentData(commentsData.hits, repliesData.hits);
        setComments(processedData);

      } catch (error) {
        console.error('Error fetching comments:', error);
        setComments([]);
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [trackerData]);

  // Service worker message handler
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      if (event.data.type === 'updateCommentTracker') {
        const { trackerData: newTrackerData, newReplies, isFirstLoad } = event.data.data;
        
        setTrackerData(newTrackerData);

        if (!isFirstLoad) {
          const existingNewReplies = JSON.parse(localStorage.getItem('hn-new-replies') || '{}') as Record<string, NewReply[]>;
          const mergedNewReplies: Record<string, NewReply[]> = { ...existingNewReplies };
          
          Object.entries(newReplies as Record<string, NewReply[]>).forEach(([commentId, replies]) => {
            if (!mergedNewReplies[commentId]) {
              mergedNewReplies[commentId] = [];
            }
            
            const existingIds = new Set(mergedNewReplies[commentId].map(r => r.id));
            const uniqueNewReplies = replies.filter(reply => !existingIds.has(reply.id));
            
            mergedNewReplies[commentId] = [
              ...mergedNewReplies[commentId],
              ...uniqueNewReplies
            ];
          });

          Object.keys(mergedNewReplies).forEach(commentId => {
            if (mergedNewReplies[commentId].length === 0) {
              delete mergedNewReplies[commentId];
            }
          });

          localStorage.setItem('hn-new-replies', JSON.stringify(mergedNewReplies));
          
          const totalUnreadCount = Object.values(mergedNewReplies)
            .reduce((count, replies) => {
              const uniqueUnseenReplies = new Set(
                replies.filter(r => !r.seen).map(r => r.id)
              );
              return count + uniqueUnseenReplies.size;
            }, 0);
            
          localStorage.setItem('hn-unread-count', totalUnreadCount.toString());
          setUnreadCount(totalUnreadCount);
        }
      }
    };

    const startTracking = async () => {
      if (!hnUsername) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Profile: No username set');
        }
        return;
      }

      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          registration.active?.postMessage({
            type: 'startTracking',
            username: hnUsername
          });
        } catch (error) {
          console.error('Profile: Error starting tracking:', error);
        }
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', messageHandler);
      startTracking();
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      }
    };
  }, [hnUsername]);

  // Memoize comment grouping
  const commentGroups = useMemo(() => {
    if (!trackerData?.comments) return {};
    
    return comments.reduce<Record<string, Comment[]>>((groups, comment) => {
      const isUserComment = comment.author === hnUsername;
      
      if (isUserComment) {
        const trackerEntry = trackerData.comments.find(c => c.id === comment.objectID);
        
        if (trackerEntry) {
          if (!groups[comment.objectID]) {
            groups[comment.objectID] = [comment];
          }
          
          const replies = comments.filter(c => trackerEntry.replyIds.includes(c.objectID));
          if (replies.length > 0) {
            groups[comment.objectID].push(...replies);
          }
        }
      }
      
      return groups;
    }, {});
  }, [comments, trackerData, hnUsername]);

  // Memoize sorted groups
  const sortedGroups = useMemo(() => {
    return Object.entries(commentGroups)
      .filter(([_, group]) => group.length > 0)
      .sort((a, b) => {
        const commentA = a[1][0];
        const commentB = b[1][0];
        return new Date(commentB.created_at).getTime() - new Date(commentA.created_at).getTime();
      });
  }, [commentGroups]);

  // Function to handle marking all as read
  const handleMarkAllAsRead = () => {
    // Clear new replies and unread count
    localStorage.setItem('hn-new-replies', '{}');
    localStorage.setItem('hn-unread-count', '0');
    setUnreadCount(0);
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('unreadCountChange', {
      detail: { unreadCount: 0 }
    }));
  };

  // Function to handle marking a comment's replies as read
  const handleMarkAsRead = (commentId: string) => {
    const newReplies = JSON.parse(localStorage.getItem('hn-new-replies') || '{}') as Record<string, NewReply[]>;
    if (newReplies[commentId]) {
      // Mark all replies for this comment as seen
      newReplies[commentId] = newReplies[commentId].map(reply => ({
        ...reply,
        seen: true
      }));
      
      // Calculate new total unread count
      const totalUnreadCount = Object.values(newReplies)
        .reduce((count: number, replies: NewReply[]) => {
          const unseenReplies = replies.filter(r => !r.seen).length;
          return count + unseenReplies;
        }, 0);
      
      // Update localStorage and state
      localStorage.setItem('hn-new-replies', JSON.stringify(newReplies));
      localStorage.setItem('hn-unread-count', totalUnreadCount.toString());
      setUnreadCount(totalUnreadCount);
      
      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('unreadCountChange', {
        detail: { unreadCount: totalUnreadCount }
      }));
    }
  };

  // Add this helper function to check if a comment has unread replies
  const hasUnreadReplies = (commentId: string): boolean => {
    const newReplies = JSON.parse(localStorage.getItem('hn-new-replies') || '{}') as Record<string, NewReply[]>;
    // Check if there are any unseen replies for this comment
    return !!newReplies[commentId]?.some(reply => !reply.seen);
  };

  return (
    <>
      <Helmet>
        <title>Profile | HN Live</title>
        <meta 
          name="description" 
          content="Your HN Live profile and settings" 
        />
      </Helmet>
      
      <div className={`
        fixed inset-0 overflow-y-auto z-50
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
      `}>
        <div className="h-full overflow-y-auto p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
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
            <div className="flex items-center gap-4">
              <button 
                onClick={onShowSettings}
                className="opacity-75 hover:opacity-100"
              >
                [SETTINGS]
              </button>
              <button 
                onClick={() => navigate('/')} 
                className="opacity-75 hover:opacity-100"
              >
                [ESC]
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-4xl mx-auto">
            {!hnUsername ? (
              <div className="text-center py-8">
                <div className="mb-4">Connect your HN username in settings to see your recent comments and replies</div>
                <button
                  onClick={onShowSettings}
                  className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} hover:opacity-75`}
                >
                  [CONNECT USERNAME]
                </button>
              </div>
            ) : loading ? (
              <div className="text-center py-8">Loading comments...</div>
            ) : (
              <>
                {/* Updated profile header */}
                <div className={`mb-8 ${
                  theme === 'green' 
                    ? 'text-green-400' 
                    : 'text-[#828282]'
                }`}>
                  <span className="opacity-75">Connected as </span>
                  <span className={
                    theme === 'green' 
                      ? 'text-green-500' 
                      : 'text-[#ff6600]'
                  }>{hnUsername}</span>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Recent Comments and Replies</h2>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllAsRead}
                      className={`text-xs opacity-75 hover:opacity-100 ${
                        theme === 'green' ? 'text-green-400' : 'text-[#828282]'
                      }`}
                    >
                      [mark all as read]
                    </button>
                  )}
                </div>

                {/* Filter groups with replies first, then check length */}
                {(() => {
                  const groupsWithReplies = sortedGroups.filter(([_, group]) => group.length > 1);
                  
                  return groupsWithReplies.length === 0 ? (
                    <div className="text-center py-8 opacity-75">
                      {comments.length > 0 ? 
                        "No replies found for your last 10 comments" :
                        "No recent comments found"
                      }
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {groupsWithReplies.map(([commentId, group]) => {
                        const originalComment = group[0];
                        const replies = group.slice(1);

                        return (
                          <div key={commentId} className="border-b border-current/10 pb-6 last:border-0">
                            {/* Story Title */}
                            <div className="mb-4">
                              <a
                                href={originalComment.story_url || `https://news.ycombinator.com/item?id=${originalComment.story_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-sm hover:underline ${
                                  theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
                                }`}
                              >
                                {originalComment.story_title || 'Unknown Story'}
                              </a>
                            </div>

                            {/* Replies Section - Now shown first */}
                            {replies.length > 0 && (
                              <div className="mb-4">
                                {replies.map(reply => (
                                  <div key={reply.objectID} className="mb-6 border-l-2 border-current/10 pl-4">
                                    <div className="text-xs opacity-70 mb-2">
                                      <button
                                        onClick={() => onUserClick(reply.author)}
                                        className={`hover:underline ${
                                          theme === 'green' 
                                            ? 'text-green-500' 
                                            : 'text-[#ff6600]'
                                        }`}
                                      >
                                        {reply.author}
                                      </button>
                                      {' replied '}
                                      <a
                                        href={`https://news.ycombinator.com/item?id=${reply.objectID}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline"
                                      >
                                        {formatDistanceToNow(new Date(reply.created_at))} ago
                                      </a>
                                      {' in response to:'}
                                    </div>
                                    <div 
                                      className="prose prose-sm max-w-none"
                                      dangerouslySetInnerHTML={{ __html: reply.comment_text }}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Original Comment - Now shown last */}
                            <div className="bg-current/5 p-4 rounded">
                              <div 
                                className="prose prose-sm max-w-none mb-2"
                                dangerouslySetInnerHTML={{ __html: originalComment.comment_text }}
                              />
                              <div className={`text-xs ${
                                theme === 'green' ? 'text-green-400/70' : 'text-[#828282]/70'
                              }`}>
                                <a
                                  href={`https://news.ycombinator.com/item?id=${originalComment.objectID}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline"
                                >
                                  {formatDistanceToNow(new Date(originalComment.created_at))} ago
                                </a>
                              </div>
                            </div>

                            {/* Mark as Read Button */}
                            {hasUnreadReplies(commentId) && (
                              <div className="mt-2 text-right">
                                <button 
                                  onClick={() => handleMarkAsRead(commentId)}
                                  className={`text-xs opacity-75 hover:opacity-100 ${
                                    theme === 'green' ? 'text-green-400' : 'text-[#828282]'
                                  }`}
                                >
                                  [mark as read]
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 