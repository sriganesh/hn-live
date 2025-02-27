// API base URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.hn.live';

// Local storage keys
export const STORAGE_KEYS = {
  // Authentication
  AUTH_TOKEN: 'hnlive_token',
  USER_INFO: 'hnlive_user',
  
  // User content
  BOOKMARKS: 'hn-live-bookmarks',
  BOOKMARK_CACHE: 'hn-live-bookmark-cache',
  FOLLOWING: 'hn-live-following',
  HISTORY: 'hn-live-history',
  USER_TAGS: 'hn-live-user-tags',
  
  // User data for notifications
  USERNAME: 'hn-live-username',
  COMMENT_TRACKER: 'hn-live-comment-tracker',
  NEW_REPLIES: 'hn-live-new-replies',
  UNREAD_COUNT: 'hn-live-unread-count',
  
  // Settings
  SETTINGS: 'hn-live-settings',
  THEME: 'hn-live-theme',
  FONT_SIZE: 'hn-live-font-size',
  FONT: 'hn-live-font',
  AUTOSCROLL: 'hn-live-autoscroll',
  COLORIZE_USERNAMES: 'hn-live-colorize-usernames',
  CLASSIC_LAYOUT: 'hn-live-classic-layout',
  SHOW_COMMENT_PARENTS: 'hn-live-show-comment-parents',
  DIRECT_LINKS: 'hn-live-direct-links',
  USE_ALGOLIA_API: 'hn-live-use-algolia-api',
  
  // Application state
  RUNNING: 'hn-live-running'
};

// Default pagination limits
export const PAGINATION = {
  FEED_ITEMS_PER_PAGE: 20,
  BOOKMARKS_PER_PAGE: 20,
  HISTORY_ITEMS_PER_PAGE: 30
};

// Time filter options
export const TIME_FILTERS = {
  LAST_24H: '24h',
  LAST_WEEK: 'week',
  LAST_MONTH: 'month',
  ALL_TIME: 'all'
};

// Sort options
export const SORT_OPTIONS = {
  DATE: 'date',
  POINTS: 'points'
};

// Item types
export const ITEM_TYPES = {
  STORY: 'story',
  COMMENT: 'comment'
}; 