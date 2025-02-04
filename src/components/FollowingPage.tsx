import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Following } from '../types/Following';
import { MobileBottomBar } from './MobileBottomBar';

interface FollowingPageProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: FontOption;
  onShowSearch: () => void;
  onCloseSearch: () => void;
  onShowSettings: () => void;
  isRunning: boolean;
}

export function FollowingPage({ theme, fontSize, font, onShowSearch, onCloseSearch, onShowSettings, isRunning }: FollowingPageProps) {
  const navigate = useNavigate();
  const [following, setFollowing] = useState<Following[]>([]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        navigate(-1);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    try {
      const savedFollowing: Following[] = JSON.parse(localStorage.getItem('hn-following') || '[]');
      setFollowing(savedFollowing.sort((a, b) => b.timestamp - a.timestamp));
    } catch (e) {
      console.error('Error loading following:', e);
      setFollowing([]);
    }
  }, []);

  const removeFollowing = (userId: string) => {
    try {
      const updatedFollowing = following.filter(f => f.userId !== userId);
      localStorage.setItem('hn-following', JSON.stringify(updatedFollowing));
      setFollowing(updatedFollowing);
    } catch (e) {
      console.error('Error removing following:', e);
    }
  };

  const exportFollowing = () => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      // Clean up the data before export
      const cleanedFollowing = following.map(({ userId, timestamp, notes }) => ({
        userId,
        timestamp,
        ...(notes && { notes }) // Only include notes if it exists
      }));
      const content = JSON.stringify(cleanedFollowing, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hn.live-following-${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Error exporting following:', e);
    }
  };

  return (
    <div className={`
      fixed inset-0 z-50 overflow-hidden
      ${theme === 'green'
        ? 'bg-black text-green-400'
        : theme === 'og'
        ? 'bg-[#f6f6ef] text-[#828282]'
        : 'bg-[#1a1a1a] text-[#828282]'}
      text-${fontSize}
    `}>
      <div className="h-full overflow-y-auto p-4 pb-20">
        {/* Header */}
        <div className="max-w-3xl mx-auto mb-8">
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
              <span className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} font-bold`}>
                / FOLLOWING
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={exportFollowing}
                className="opacity-75 hover:opacity-100"
              >
                [EXPORT]
              </button>
              <button 
                onClick={() => navigate(-1)}
                className="opacity-75 hover:opacity-100"
              >
                [ESC]
              </button>
            </div>
          </div>
        </div>

        {/* Following List */}
        <div className="max-w-3xl mx-auto">
          {following.length === 0 ? (
            <div className="text-center py-8 opacity-75">
              No followed users yet. Click on usernames to follow users.
            </div>
          ) : (
            <div className="space-y-4">
              {following.map(follow => (
                <div 
                  key={follow.userId} 
                  className={`
                    p-4 rounded
                    ${theme === 'green'
                      ? 'bg-green-500/5 hover:bg-green-500/10'
                      : theme === 'og'
                      ? 'bg-[#ff6600]/5 hover:bg-[#ff6600]/10'
                      : 'bg-[#828282]/5 hover:bg-[#828282]/10'}
                    transition-colors
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <a
                        href={`/user/${follow.userId}`}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/user/${follow.userId}`);
                        }}
                        className={`
                          ${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} 
                          hover:opacity-75 text-lg
                        `}
                      >
                        {follow.userId}
                      </a>
                      <span className="text-sm opacity-50">
                        followed {formatTimeAgo(follow.timestamp / 1000)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFollowing(follow.userId)}
                      className="opacity-75 hover:opacity-100"
                    >
                      [unfollow]
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <MobileBottomBar 
        theme={theme}
        onShowSearch={onShowSearch}
        onCloseSearch={onCloseSearch}
        onShowSettings={onShowSettings}
      />
    </div>
  );
}

// Helper function for time formatting
const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}; 