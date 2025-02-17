interface NavigationItem {
  label: string | ((username: string | null) => string);
  path: string;
  external?: boolean;
  id?: string;
  icon?: string;
  onClick?: () => void;
}

// Main navigation items that appear in MORE dropdown
export const navigationItems: NavigationItem[] = [
  {
    label: 'TRENDING',
    path: '/trending'
  },
  {
    label: 'SHOW HN',
    path: '/show'
  },
  {
    label: 'ASK HN',
    path: '/ask'
  },
  {
    label: 'BEST',
    path: '/best'
  },
  {
    label: 'BEST COMMENTS',
    path: '/best-comments'
  },
  {
    label: 'JOBS',
    path: '/jobs'
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
    label: 'MY FEED',
    path: '/feed'
  },
  {
    label: 'DASHBOARD',
    path: '/dashboard',
    external: false
  }
];

// Mobile menu items (with different labels)
export const MOBILE_MENU_ITEMS: NavigationItem[] = [
  {
    label: 'Trending',
    path: '/trending'
  },
  {
    label: 'Show HN',
    path: '/show'
  },
  {
    label: 'Ask HN',
    path: '/ask'
  },
  {
    label: 'Best',
    path: '/best'
  },
  {
    label: 'Best Comments',
    path: '/best-comments'
  },
  {
    label: 'Jobs',
    path: '/jobs'
  },
  {
    label: 'Bookmarks',
    path: '/bookmarks'
  },
  {
    label: 'My Feed',
    path: '/feed'
  },
  {
    id: 'profile',
    label: (username: string | null) => username ? username : 'HN Profile',
    path: '/profile'
  }
]; 