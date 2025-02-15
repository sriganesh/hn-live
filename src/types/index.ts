export interface HNComment {
  id: number;
  text: string;
  by: string;
  time: number;
  kids?: number[];
  comments?: HNComment[];
  level: number;
  hasDeepReplies?: boolean;
  isCollapsed?: boolean;
  parentTitle?: string;
  parentText?: string;
}

export interface HNStory {
  id: number;
  title: string;
  text?: string;
  url?: string;
  by: string;
  time: number;
  kids?: number[];
  descendants?: number;
  comments?: HNComment[];
  score: number;
}

export type Theme = 'green' | 'og' | 'dog';
export type FontOption = 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';
export type CommentSortMode = 'nested' | 'recent'; 