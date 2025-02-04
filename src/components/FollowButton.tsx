import { useState, useEffect } from 'react';
import { Following } from '../types/Following';

interface FollowButtonProps {
  userId: string;
  theme: 'green' | 'og' | 'dog';
}

export function FollowButton({ userId, theme }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    try {
      const following: Following[] = JSON.parse(localStorage.getItem('hn-following') || '[]');
      setIsFollowing(following.some(f => f.userId === userId));
    } catch (e) {
      console.error('Error loading following data:', e);
    }
  }, [userId]);

  const toggleFollow = () => {
    try {
      const following: Following[] = JSON.parse(localStorage.getItem('hn-following') || '[]');
      
      if (isFollowing) {
        const updatedFollowing = following.filter(f => f.userId !== userId);
        localStorage.setItem('hn-following', JSON.stringify(updatedFollowing));
        setIsFollowing(false);
      } else {
        const newFollowing = [
          ...following,
          {
            userId,
            timestamp: Date.now()
          }
        ];
        localStorage.setItem('hn-following', JSON.stringify(newFollowing));
        setIsFollowing(true);
      }
    } catch (e) {
      console.error('Error updating following:', e);
    }
  };

  return (
    <button
      onClick={toggleFollow}
      className={`
        px-3 py-1 rounded text-sm transition-all
        ${theme === 'green'
          ? 'bg-green-500/10 border border-green-500/30 hover:bg-green-500/20'
          : theme === 'og'
          ? 'bg-[#ff6600]/10 border border-[#ff6600]/30 hover:bg-[#ff6600]/20'
          : 'bg-[#ff6600]/10 border border-[#ff6600]/30 hover:bg-[#ff6600]/20 text-[#ff6600]'
        }
      `}
    >
      {isFollowing ? 'unfollow' : 'follow'}
    </button>
  );
} 