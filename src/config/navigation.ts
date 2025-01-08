interface NavigationItem {
  label: string;
  path: string;
  external?: boolean;
}

// Main navigation items that appear in MORE dropdown
export const navigationItems: NavigationItem[] = [
  {
    label: 'SHOW HN',
    path: '/show'
  },
  {
    label: 'ASK HN',
    path: '/ask'
  },
  {
    label: 'JOBS',
    path: '/jobs'
  },
  {
    label: 'BEST',
    path: '/best'
  },
  // Separator can be handled by a special path
  { 
    label: '---',  // Separator
    path: 'separator'
  },
  {
    label: 'BOOKMARKS',
    path: '/bookmarks'
  },
  {
    label: 'HN',
    path: 'https://news.ycombinator.com',
    external: true
  }
];

// Mobile menu items (with different labels)
export const MOBILE_MENU_ITEMS: NavigationItem[] = [
  {
    label: 'Show HN',
    path: '/show'
  },
  {
    label: 'Ask HN',
    path: '/ask'
  },
  {
    label: 'Jobs',
    path: '/jobs'
  },
  {
    label: 'Best',
    path: '/best'
  },
  {
    label: 'Bookmarks',
    path: '/bookmarks'
  },
  {
    label: 'Hacker News',
    path: 'https://news.ycombinator.com',
    external: true
  }
]; 