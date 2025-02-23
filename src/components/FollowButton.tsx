import { useState, useEffect } from 'react';
import { Following } from '../types/Following';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../types/auth';

interface FollowButtonProps {
  userId: string;
  theme: 'green' | 'og' | 'dog';
}

export function FollowButton({ userId, theme }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const { isAuthenticated } = useAuth();
  const token = localStorage.getItem('hnlive_token');

  useEffect(() => {
    try {
      const following: Following[] = JSON.parse(localStorage.getItem('hn-following') || '[]');
      setIsFollowing(following.some(f => f.userId === userId));
    } catch (e) {
      console.error('Error loading following data:', e);
    }
  }, [userId]);

  const toggleFollow = async () => {
    try {
      const following: Following[] = JSON.parse(localStorage.getItem('hn-following') || '[]');
      
      if (isFollowing) {
        // Remove from local storage
        const updatedFollowing = following.filter(f => f.userId !== userId);
        localStorage.setItem('hn-following', JSON.stringify(updatedFollowing));
        setIsFollowing(false);

        // If authenticated, remove from cloud
        if (isAuthenticated && token) {
          await fetch(`${API_BASE_URL}/api/following/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
        }
      } else {
        // Add to local storage
        const newFollowing = [
          ...following,
          {
            userId,
            timestamp: Date.now()
          }
        ];
        localStorage.setItem('hn-following', JSON.stringify(newFollowing));
        setIsFollowing(true);

        // If authenticated, add to cloud
        if (isAuthenticated && token) {
          await fetch(`${API_BASE_URL}/api/following`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
          });
        }
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