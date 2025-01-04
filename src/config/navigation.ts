export interface MobileMenuItem {
  label: string;
  path: string;
  external?: boolean;
}

export const MOBILE_MENU_ITEMS: MobileMenuItem[] = [
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
  }
]; 