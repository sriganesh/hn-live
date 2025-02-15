import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { Announcement } from './common';

interface StoryFooterProps {
  storyId: number;
  theme: Theme;
  bottomAnnouncement: {
    text: string;
    link: string;
  };
}

export const StoryFooter = memo(function StoryFooter({
  storyId,
  theme,
  bottomAnnouncement
}: StoryFooterProps) {
  const navigate = useNavigate();
  const styles = useThemeStyles(theme);

  return (
    <div className="text-center py-8 pb-24 sm:pb-8 space-y-4">
      <Announcement
        text={bottomAnnouncement.text}
        link={bottomAnnouncement.link}
        position="bottom"
        theme={theme}
      />

      <div className="text-sm space-y-2">
        <div>
          <a
            href={`https://news.ycombinator.com/item?id=${storyId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.accentText} hover:opacity-75`}
          >
            → View this story on Hacker News
          </a>
        </div>
        <div className="my-2">
          <span className="opacity-50">or</span>
        </div>
        <div>
          <button
            onClick={() => navigate('/')}
            className={`${styles.accentText} hover:opacity-75`}
          >
            → Head back to the live feed to see real-time stories and discussions
          </button>
        </div>
      </div>
    </div>
  );
}); 