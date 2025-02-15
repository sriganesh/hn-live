import { useMemo } from 'react';

type Theme = 'green' | 'og' | 'dog';

interface ThemeStyles {
  background: string;
  text: string;
  border: string;
  highlight: string;
  buttonHover: string;
  accentText: string;
  accentBg: string;
  separator: string;
}

export function useThemeStyles(theme: Theme) {
  return useMemo(() => ({
    background: theme === 'green' 
      ? 'bg-black' 
      : theme === 'og' 
      ? 'bg-[#f6f6ef]' 
      : 'bg-[#1a1a1a]',
    text: theme === 'green' 
      ? 'text-green-400' 
      : 'text-[#828282]',
    border: theme === 'green'
      ? 'border-green-500/10'
      : theme === 'og'
      ? 'border-[#ff6600]/10'
      : 'border-[#828282]/10',
    highlight: theme === 'dog'
      ? 'bg-yellow-500/5'
      : theme === 'green'
      ? 'bg-green-500/20'
      : 'bg-yellow-500/10',
    buttonHover: theme === 'green'
      ? 'text-green-500/50 hover:text-green-500'
      : 'text-[#ff6600]/50 hover:text-[#ff6600]',
    accentText: theme === 'green'
      ? 'text-green-500'
      : 'text-[#ff6600]',
    accentBg: theme === 'green'
      ? 'bg-green-500/10 hover:bg-green-500/20'
      : theme === 'og'
      ? 'bg-[#ff6600]/10 hover:bg-[#ff6600]/20'
      : 'bg-gray-800 hover:bg-gray-700',
    separator: theme === 'green'
      ? 'border-green-500/10'
      : theme === 'og'
      ? 'border-[#ff6600]/10'
      : 'border-[#828282]/10'
  }), [theme]);
} 