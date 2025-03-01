/**
 * Common types used across the application
 */

export type FontOption = 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';
export type ThemeOption = 'green' | 'og' | 'dog';

/**
 * Common props shared across page components
 */
export interface BasePageProps {
  theme: ThemeOption;
  fontSize: string;
  font: FontOption;
  colorizeUsernames: boolean;
  classicLayout: boolean;
  onShowSearch: () => void;
  onCloseSearch: () => void;
  onShowGrep: () => void;
  onShowSettings: () => void;
  isSettingsOpen: boolean;
  isSearchOpen: boolean;
  onViewUser: (userId: string) => void;
  isRunning: boolean;
  username: string | null;
  unreadCount?: number;
}

/**
 * Common HN story structure
 */
export interface HNStory {
  id: number;
  title: string;
  url?: string;
  by: string;
  time: number;
  score: number;
  descendants: number;
  text?: string;
}

/**
 * Common state structure for pages that display stories
 */
export interface StoriesPageState {
  stories: HNStory[];
  loading: boolean;
  loadingMore: boolean;
  page: number;
  hasMore: boolean;
}

/**
 * Common grep/filter state structure
 */
export interface GrepState {
  isActive: boolean;
  searchTerm: string;
  matchedStories: HNStory[];
} 