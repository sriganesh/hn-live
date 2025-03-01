/**
 * Common formatting utility functions used across the application
 */

/**
 * Formats a timestamp into a human-readable relative time string
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted string like "2d ago", "3h ago", etc.
 */
export const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'just now';
  }
};

/**
 * Truncates a URL to a specified maximum length
 * @param url The URL to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated URL string
 */
export const truncateUrl = (url: string, maxLength: number): string => {
  if (url.length <= maxLength) return url;
  
  const parts = url.split('.');
  if (parts.length <= 2) return url.slice(0, maxLength) + '...';
  
  if (parts[0].length > 15) {
    parts[0] = parts[0].slice(0, 15) + '...';
  }
  
  return parts.join('.');
}; 