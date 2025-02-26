import { FollowedUser } from '../hooks/useFollowing';

// Auth API base URL
const AUTH_API_URL = 'https://auth.hn.live';

// Get the auth token from localStorage
const getToken = () => localStorage.getItem('hnlive_token');

// Check if user is authenticated
const isAuthenticated = () => !!getToken();

// Get followed users from localStorage only
export const getFollowedUsers = async (): Promise<FollowedUser[]> => {
  try {
    // Get local data only
    const savedFollowing = localStorage.getItem('hn-following');
    let followingData: FollowedUser[] = savedFollowing ? JSON.parse(savedFollowing) : [];
    
    // Sort by followedAt, most recent first
    return followingData.sort((a, b) => 
      new Date(b.followedAt).getTime() - new Date(a.followedAt).getTime()
    );
  } catch (error) {
    console.error('Error getting followed users:', error);
    throw new Error('Failed to get followed users');
  }
};

// Follow a user - store in localStorage only
export const followUser = async (userId: string): Promise<void> => {
  try {
    // Get current following data
    const savedFollowing = localStorage.getItem('hn-following');
    const followingData: FollowedUser[] = savedFollowing ? JSON.parse(savedFollowing) : [];
    
    // Check if already following
    if (followingData.some(f => f.userId === userId)) {
      return; // Already following this user
    }
    
    // Add to local following data
    const newFollowing: FollowedUser = {
      userId,
      followedAt: new Date().toISOString()
    };
    
    followingData.push(newFollowing);
    localStorage.setItem('hn-following', JSON.stringify(followingData));
  } catch (error) {
    console.error('Error following user:', error);
    throw new Error('Failed to follow user');
  }
};

// Unfollow a user - update localStorage only
export const unfollowUser = async (userId: string): Promise<void> => {
  try {
    // Update local storage
    const savedFollowing = localStorage.getItem('hn-following');
    let followingData: FollowedUser[] = savedFollowing ? JSON.parse(savedFollowing) : [];
    
    followingData = followingData.filter(f => f.userId !== userId);
    localStorage.setItem('hn-following', JSON.stringify(followingData));
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw new Error('Failed to unfollow user');
  }
};

// Sync followed users with cloud - only if authenticated
export const syncFollowedUsers = async (): Promise<void> => {
  if (!isAuthenticated()) {
    throw new Error('User is not authenticated');
  }
  
  try {
    const token = getToken();
    
    // Get local data
    const savedFollowing = localStorage.getItem('hn-following');
    const localData: FollowedUser[] = savedFollowing ? JSON.parse(savedFollowing) : [];
    
    // Send local data to cloud
    const response = await fetch(`${AUTH_API_URL}/api/following/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ following: localData })
    });
    
    if (!response.ok) {
      throw new Error('Failed to sync with server');
    }
    
    // Get merged data from server
    const syncedData = await response.json();
    
    // Update local storage with synced data
    localStorage.setItem('hn-following', JSON.stringify(syncedData));
    
    // Dispatch sync event
    window.dispatchEvent(new Event('following-synced'));
  } catch (error) {
    console.error('Error syncing followed users:', error);
    throw error;
  }
};

// Export followed users
export const exportFollowedUsers = async (): Promise<void> => {
  try {
    const savedFollowing = localStorage.getItem('hn-following');
    const followingData = savedFollowing ? JSON.parse(savedFollowing) : [];
    
    const timestamp = Math.floor(Date.now() / 1000);
    const content = JSON.stringify(followingData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `hn.live-following-${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting followed users:', error);
    throw new Error('Failed to export followed users');
  }
}; 