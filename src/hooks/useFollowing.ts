import { useState, useEffect, useCallback } from 'react';
import { 
  getFollowedUsers, 
  followUser as followUserService, 
  unfollowUser as unfollowUserService,
  syncFollowedUsers,
  exportFollowedUsers
} from '../services/followingService';

export interface FollowedUser {
  userId: string;
  followedAt: string;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export function useFollowing() {
  const [following, setFollowing] = useState<FollowedUser[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchFollowing = useCallback(async () => {
    try {
      const users = await getFollowedUsers();
      setFollowing(users);
      setError(null);
    } catch (err) {
      console.error('Error fetching followed users:', err);
      setError('Failed to load followed users');
    }
  }, []);

  const followUser = useCallback(async (userId: string) => {
    try {
      await followUserService(userId);
      await fetchFollowing();
      setError(null);
    } catch (err) {
      console.error('Error following user:', err);
      setError('Failed to follow user');
    }
  }, [fetchFollowing]);

  const unfollowUser = useCallback(async (userId: string) => {
    try {
      await unfollowUserService(userId);
      setFollowing(prev => prev.filter(user => user.userId !== userId));
      setError(null);
    } catch (err) {
      console.error('Error unfollowing user:', err);
      setError('Failed to unfollow user');
    }
  }, []);

  const syncWithCloud = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      await syncFollowedUsers();
      await fetchFollowing();
      setSyncStatus('success');
      setError(null);
      
      // Reset success status after 3 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    } catch (err) {
      console.error('Error syncing followed users:', err);
      setError('Failed to sync followed users');
      setSyncStatus('error');
    }
  }, [fetchFollowing]);

  const exportFollowing = useCallback(async () => {
    try {
      await exportFollowedUsers();
      setError(null);
    } catch (err) {
      console.error('Error exporting followed users:', err);
      setError('Failed to export followed users');
    }
  }, []);

  useEffect(() => {
    fetchFollowing();
  }, [fetchFollowing]);

  return {
    following,
    syncStatus,
    error,
    followUser,
    unfollowUser,
    syncWithCloud,
    exportFollowing
  };
} 