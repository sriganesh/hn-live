import { memo } from 'react';

type AnnouncementPosition = 'top' | 'bottom' | 'preComments';

interface AnnouncementProps {
  text: string;
  link?: string;
  position: AnnouncementPosition;
  theme: 'green' | 'og' | 'dog';
  className?: string;
}

// Helper function to get random announcement
export const getRandomAnnouncement = (prefix: string): { text: string; link: string } => {
  const variations = [1, 2, 3];
  const randomIndex = Math.floor(Math.random() * variations.length);
  const variation = variations[randomIndex];
  
  return {
    text: import.meta.env[`VITE_STORY_${prefix}_ANNOUNCEMENT_${variation}`] || '',
    link: import.meta.env[`VITE_STORY_${prefix}_ANNOUNCEMENT_LINK_${variation}`] || ''
  };
};

export const Announcement = memo(({ 
  text, 
  link, 
  position, 
  theme,
  className = '' 
}: AnnouncementProps) => {
  if (!text) return null;

  const themeColor = theme === 'green' 
    ? 'text-green-500' 
    : 'text-[#ff6600]';

  return (
    <div className={`mb-4 text-sm ${themeColor} ${className}`}>
      {link ? (
        <a 
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-75"
        >
          {text}
        </a>
      ) : (
        text
      )}
    </div>
  );
}); 