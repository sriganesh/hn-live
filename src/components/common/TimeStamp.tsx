import { memo } from 'react';

interface TimeStampProps {
  time: number;
  className?: string;
  showFull?: boolean;
  storyId?: number;
  commentId?: number;
}

const formatTimeAgo = (timestamp: number): string => {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return 'now';
  }
};

export const TimeStamp = memo(({ time, className = '', showFull = false, storyId, commentId }: TimeStampProps) => {
  const formattedTime = formatTimeAgo(time);
  const fullDate = new Date(time * 1000).toLocaleString();
  const hnLink = commentId 
    ? `https://news.ycombinator.com/item?id=${commentId}`
    : storyId 
    ? `https://news.ycombinator.com/item?id=${storyId}`
    : null;

  return (
    <time 
      dateTime={new Date(time * 1000).toISOString()}
      title={fullDate}
      className={`hover:underline ${className}`}
    >
      {hnLink ? (
        <a 
          href={hnLink}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-75"
        >
          {showFull ? fullDate : formattedTime}
        </a>
      ) : (
        showFull ? fullDate : formattedTime
      )}
    </time>
  );
}); 