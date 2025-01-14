import { FontOption } from '../types/hn';

export const defaults = {
  theme: 'og' as const,
  fontSize: 'base',
  font: 'mono' as FontOption,
  classicLayout: false,
  colorizeUsernames: true,
  showCommentParents: false,
  showBackToTop: true,
  autoscroll: false,
  directLinks: false
} as const;

// For mobile-specific defaults
export const mobileDefaults = {
  ...defaults,
  fontSize: 'sm'
}; 