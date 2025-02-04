interface NavigationItem {
  label: string | ((username: string | null) => string);
  path: string;
  external?: boolean;
  id?: string;
  icon?: string;
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
    label: 'USER TAGS',
    path: '/tags'
  },
  {
    label: 'FOLLOWING',
    path: '/following'
  },
  {
    label: 'MY FEED',
    path: '/feed'
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
    label: 'User Tags',
    path: '/tags'
  },
  {
    label: 'Following',
    path: '/following'
  },
  {
    label: 'My Feed',
    path: '/feed'
  },
  {
    id: 'profile',
    label: (username: string | null) => username || 'Profile',
    path: '/profile'
  }
]; 