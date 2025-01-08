export interface BookmarkMetadata {
  id: number;
  type: 'story' | 'comment';
  timestamp: number;  // When it was bookmarked
  by: string;
  // For stories
  title?: string;
  url?: string;
  // For comments
  preview?: string;  // First ~100 chars of comment
  storyId?: number;
  storyTitle?: string;
}

export interface FullBookmark extends BookmarkMetadata {
  text?: string;      // Full comment text
  score?: number;     // For stories
  descendants?: number; // For stories
} 