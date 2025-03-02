import React, { ReactNode, RefObject } from 'react';
import { ThemeOption, FontOption } from '../../types/common';
import { MobileBottomBar } from '../navigation/MobileBottomBar';

interface PageContainerProps {
  theme: ThemeOption;
  fontSize: string;
  font: FontOption;
  children: ReactNode;
  onShowSearch: () => void;
  onShowSettings: () => void;
  isRunning: boolean;
  username?: string | null;
  unreadCount?: number;
  onCloseSearch?: () => void;
  containerRef?: RefObject<HTMLDivElement>;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  theme,
  fontSize,
  font,
  children,
  onShowSearch,
  onShowSettings,
  isRunning,
  username = null,
  unreadCount = 0,
  onCloseSearch = () => {},
  containerRef
}) => {
  return (
    <div 
      ref={containerRef}
      className={`
      fixed inset-0 z-50 overflow-hidden
      ${font === 'mono' ? 'font-mono' : 
        font === 'jetbrains' ? 'font-jetbrains' :
        font === 'fira' ? 'font-fira' :
        font === 'source' ? 'font-source' :
        font === 'sans' ? 'font-sans' :
        font === 'serif' ? 'font-serif' :
        'font-system'}
      ${theme === 'green'
        ? 'bg-black text-green-400'
        : theme === 'og'
        ? 'bg-[#f6f6ef] text-[#828282]'
        : 'bg-[#1a1a1a] text-[#828282]'}
      text-${fontSize}
    `}>
      <div className="h-full overflow-y-auto overflow-x-hidden p-2">
        {children}
      </div>

      <MobileBottomBar 
        theme={theme}
        onShowSearch={onShowSearch}
        onShowSettings={onShowSettings}
        onCloseSearch={onCloseSearch}
        isRunning={isRunning}
        username={username}
        unreadCount={unreadCount}
      />
    </div>
  );
}; 