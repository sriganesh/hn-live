export interface Comment {
  id: string;
  text?: string;
  by?: string;
  time?: number;
  parent?: string;
  parentTitle?: string;
  parentBy?: string;
  score?: number;
  kids?: string[];
}

export type FontOption = 'system' | 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif'; 