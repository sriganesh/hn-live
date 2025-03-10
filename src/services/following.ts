import { Following } from '../types/Following';
import { AUTH_TOKEN_KEY } from '../types/auth';
import { STORAGE_KEYS } from '../config/constants';

// Auth API base URL
const AUTH_API_URL = 'https://auth.hn.live';

export async function syncFollowing() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!token) return;

  try {
    // Get local following list
    const localFollowing: Following[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWING) || '[]');

    // Get cloud following list
    const response = await fetch(`${AUTH_API_URL}/api/following`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch cloud following');
    }

    const { following: cloudFollowing } = await response.json();

    // Merge lists (prefer newer timestamps)
    const mergedFollowing = new Map<string, Following>();

    // Add local following
    localFollowing.forEach(item => {
      mergedFollowing.set(item.userId, item);
    });

    // Add cloud following
    cloudFollowing.forEach((item: { userId: string; created_at: string }) => {
      const timestamp = new Date(item.created_at).getTime();
      const existing = mergedFollowing.get(item.userId);
      
      if (!existing || timestamp > existing.timestamp) {
        mergedFollowing.set(item.userId, {
          userId: item.userId,
          timestamp
        });
      }
    });

    // Convert map back to array
    const finalFollowing = Array.from(mergedFollowing.values());

    // Update local storage
    localStorage.setItem(STORAGE_KEYS.FOLLOWING, JSON.stringify(finalFollowing));

    // Sync to cloud
    await fetch(`${AUTH_API_URL}/api/following/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        following: finalFollowing
      })
    });

    return finalFollowing;
  } catch (error) {
    console.error('Error syncing following:', error);
    throw error;
  }
} 