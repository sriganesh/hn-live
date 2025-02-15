import { memo } from 'react';
import { useTopUsers } from '../../hooks/useTopUsers';

interface UserLinkProps {
  username: string;
  isOP?: boolean;
  theme: 'green' | 'og' | 'dog';
  className?: string;
  onUserClick?: (username: string) => void;
}

export const UserLink = memo(({ 
  username, 
  isOP = false, 
  theme,
  className = '',
  onUserClick
}: UserLinkProps) => {
  const { isTopUser, getTopUserClass } = useTopUsers();
  const isTop = isTopUser(username);

  return (
    <div className="flex items-center gap-1 min-w-0">
      <a 
        onClick={(e) => {
          e.preventDefault();
          onUserClick?.(username);
        }}
        href={`/user/${username}`}
        className={`hn-username hover:underline truncate ${
          isTop ? getTopUserClass(theme) : ''
        } ${className}`}
      >
        {username}
      </a>
      {isOP && (
        <span className="opacity-50 ml-1">[OP]</span>
      )}
    </div>
  );
}); 