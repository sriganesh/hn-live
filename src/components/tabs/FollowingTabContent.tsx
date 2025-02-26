import React from 'react';
import { useFollowing } from '../../hooks/useFollowing';

interface FollowingTabContentProps {
  theme: 'green' | 'og' | 'dog';
  onUserClick: (username: string) => void;
}

export function FollowingTabContent({
  theme,
  onUserClick
}: FollowingTabContentProps) {
  const { 
    following, 
    syncStatus, 
    error, 
    followUser,
    unfollowUser, 
    syncWithCloud, 
    exportFollowing 
  } = useFollowing();

  // Get theme-specific styles
  const getThemeStyles = () => {
    switch (theme) {
      case 'green':
        return {
          text: 'text-green-400',
          accent: 'text-green-500',
          link: 'text-green-500 hover:text-green-400',
          buttonText: 'opacity-75 hover:opacity-100 text-green-400 hover:text-green-300',
          itemBg: 'bg-green-500/5',
          error: 'text-red-500'
        };
      case 'og':
        return {
          text: 'text-[#111]',
          accent: 'text-[#111]',
          link: 'text-[#111] hover:text-[#111]/80 font-medium',
          buttonText: 'opacity-75 hover:opacity-100 text-[#111]',
          itemBg: 'bg-[#f6f6ef]',
          error: 'text-red-500'
        };
      case 'dog':
        return {
          text: 'text-[#c9d1d9]',
          accent: 'text-[#c9d1d9]',
          link: 'text-[#c9d1d9] hover:text-white font-medium',
          buttonText: 'opacity-75 hover:opacity-100 text-[#c9d1d9] hover:text-white',
          itemBg: 'bg-[#828282]/5',
          error: 'text-red-500'
        };
      default:
        return {
          text: 'text-green-400',
          accent: 'text-green-500',
          link: 'text-green-500 hover:text-green-400',
          buttonText: 'opacity-75 hover:opacity-100 text-green-400 hover:text-green-300',
          itemBg: 'bg-green-500/5',
          error: 'text-red-500'
        };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className={`${themeStyles.text}`}>
          {following.length} followed user{following.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-4">
          {following.length > 0 && (
            <button
              onClick={exportFollowing}
              className={themeStyles.buttonText}
            >
              [EXPORT]
            </button>
          )}
          <button
            onClick={syncWithCloud}
            className={themeStyles.buttonText}
          >
            {syncStatus === 'syncing' ? '[SYNCING...]' :
             syncStatus === 'success' ? '[SYNCED!]' :
             '[SYNC]'}
          </button>
        </div>
      </div>

      {error && (
        <div className={`${themeStyles.error} py-2`}>
          Error: {error}
        </div>
      )}

      <div className={`text-sm ${themeStyles.text}`}>
        Note: Following data is stored locally. Use [EXPORT] to save them, or create an HN Live account for automatic cloud sync.
      </div>

      {following.length === 0 && (
        <div className="text-center py-8 opacity-75">
          <div>No followed users yet. Click on usernames to follow users.</div>
          <div className="mt-2 text-sm">
            Following users lets you see their stories and comments in your personalized feed.
          </div>
        </div>
      )}

      {following.map(follow => (
        <div 
          key={follow.userId}
          className={`p-4 rounded ${themeStyles.itemBg}`}
        >
          <div className="flex items-center justify-between">
            <a
              href={`#user-${follow.userId}`}
              onClick={(e) => {
                e.preventDefault();
                onUserClick(follow.userId);
              }}
              className={`${theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'} hover:underline`}
            >
              {follow.userId}
            </a>
            <button
              onClick={() => unfollowUser(follow.userId)}
              className={themeStyles.buttonText}
            >
              [unfollow]
            </button>
          </div>
        </div>
      ))}
    </div>
  );
} 