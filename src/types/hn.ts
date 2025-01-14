export interface HNItem {
  id: number;
  title?: string;
  text?: string;
  by: string;
  time: number;
  url?: string;
  score?: number;
  kids?: number[];
  type: 'story' | 'comment' | 'job' | 'poll' | 'pollopt';
  parent?: number;
  dead?: boolean;
  formatted?: {
    timestamp: {
      time: string;
      fullDate: string;
    };
    text: string;
    links: {
      main: string;
      comments: string;
    };
  };
}

export type FontOption = 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';

export interface TerminalOptions {
  theme: 'green' | 'og' | 'dog';
  autoscroll: boolean;
  directLinks: boolean;
  fontSize: FontSize;
  classicLayout: boolean;
  showCommentParents: boolean;
  font: FontOption;
  showBackToTop: boolean;
}

export type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';

export interface SearchFilters {
  text: string;
} 