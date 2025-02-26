// API base URL
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.hn.live';

// Local storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'hnlive_token',
  USER_INFO: 'hnlive_user',
  BOOKMARKS: 'hn-bookmarks',
  FOLLOWING: 'hn-following',
  HISTORY: 'hn-history',
  SETTINGS: 'hn-settings',
  THEME: 'hn-theme'
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