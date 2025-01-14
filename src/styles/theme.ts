export const themeStyles = `
  [data-theme='dog'] ::selection {
    background: rgba(255, 255, 255, 0.1);
    color: inherit;
  }
  
  [data-theme='green'] ::selection {
    background: rgba(34, 197, 94, 0.2);
    color: inherit;
  }
`;

export const mobileNavStyles = `
  .mobile-nav-button {
    @apply flex-1 py-3 flex items-center justify-center transition-colors border-r last:border-r-0 border-current/30;
  }
`;

export const getThemeColors = (theme: string) => ({
  text: theme === 'green' ? 'text-green-400' : 'text-[#828282]',
  bg: theme === 'green' ? 'bg-black' : theme === 'og' ? 'bg-[#f6f6ef]' : 'bg-[#1a1a1a]',
  headerBg: theme === 'green' ? 'bg-black/90' : theme === 'og' ? 'bg-[#f6f6ef]/90' : 'bg-[#1a1a1a]/90',
  headerColor: theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
}); 