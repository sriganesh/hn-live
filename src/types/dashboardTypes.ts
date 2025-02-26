// Types specific to the dashboard functionality
export interface DashboardComment {
  id: string;
  comment_text: string;
  author: string;
  created_at: string;
  story_id: string;
  story_title: string;
  story_url?: string;
  objectID: string;
  points?: number;
  parent_id?: string;
  replies: DashboardReply[];
  hasUnread: boolean;
  isUserComment?: boolean;
}

export interface AlgoliaHit {
  objectID: string;
  comment_text?: string;
  author: string;
  created_at_i: number;
  story_id?: string;
  story_title?: string;
  url?: string;
  points?: number;
  parent_id?: string;
}

export interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbPages: number;
  page: number;
  hitsPerPage: number;
}

export interface FeedFilters {
  type: 'all' | 'stories' | 'comments';
  timeRange: '24h' | '7d' | '30d' | 'all';
  sortBy: 'date' | 'points';
}

// Add these types
export interface NewReply {
  id: string;
  seen: boolean;
  text: string;
  author: string;
  created_at: string;
  parent_id?: string;
  story_id?: string;
  story_title?: string;
}

export interface TrackerData {
  lastChecked: number;
  comments: Array<{
    id: string;
    replyIds: string[];
    timestamp: number;
  }>;
  lastSeenReplies: Record<string, string[]>;
}

export interface MessageHandlerData {
  trackerData: TrackerData;
  newReplies: Record<string, NewReply[]>;
  isFirstLoad: boolean;
}

export interface FeedItem {
  id: string;
  type: 'story' | 'comment';
  title?: string;
  url?: string;
  by: string;
  time: number;
  score?: number;
  text?: string;
  parent?: string;
}

export interface Bookmark {
  id: number;
  type: 'story' | 'comment';
  title?: string;
  text?: string;
  by: string;
  time: number;
  url?: string;
  storyId?: number;
  story?: {
    title: string;
    id: number;
  };
}

export interface DashboardReply {
  id: string;
  text: string;
  author: string;
  created_at: string;
  seen: boolean;
  parent_id?: string;
  story_id?: string;
  story_title?: string;
}

// Add type for grouped comments
export interface CommentGroup {
  originalComment: DashboardComment;
  replies: DashboardReply[];
  hasUnread: boolean;
} 