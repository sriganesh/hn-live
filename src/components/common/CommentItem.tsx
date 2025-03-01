import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Comment } from '../../types/comments';
import { ThemeOption } from '../../types/common';

interface CommentItemProps {
  comment: Comment;
  theme: ThemeOption;
  colorizeUsernames: boolean;
  onViewUser: (userId: string) => void;
  isTopUser?: (username: string) => boolean;
  getTopUserClass?: (theme: string) => string;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  theme,
  colorizeUsernames,
  onViewUser,
  isTopUser = () => false,
  getTopUserClass = () => ''
}) => {
  const navigate = useNavigate();

  // Format date
  const formatDate = (timestamp: number = 0) => {
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'just now';
    }
  };

  // Format text with HTML
  const formatText = (text: string = '') => {
    return { __html: text };
  };

  return (
    <div className={`p-4 rounded break-words ${
      theme === 'dog'
        ? 'bg-[#222222]'
        : theme === 'green'
        ? 'bg-green-500/[0.04]'
        : 'bg-[#fafaf7]'
    }`}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className={`hover:underline cursor-pointer ${
            theme === 'green'
              ? 'text-green-400'
              : colorizeUsernames 
                ? `hn-username ${isTopUser(comment.by || '') ? getTopUserClass(theme) : ''}`
                : 'opacity-75'
          }`}
          onClick={() => comment.by && onViewUser(comment.by)}
        >
          {comment.by}
        </span>
        <span className="opacity-75">·</span>
        <a
          href={`/item/${comment.parent}/comment/${comment.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/item/${comment.parent}/comment/${comment.id}`);
          }}
          className="opacity-75 hover:opacity-100"
        >
          {formatDate(comment.time || 0)}
        </a>
      </div>
      
      <div
        className={`prose max-w-none mb-3 break-words overflow-hidden overflow-wrap-anywhere prose-pre:whitespace-pre-wrap prose-pre:break-words prose-code:break-words ${
          theme === 'dog' 
            ? 'prose-invert' 
            : theme === 'green'
            ? 'prose-green'
            : ''
        }`}
        dangerouslySetInnerHTML={formatText(comment.text || '')}
      />
      
      <div className="opacity-75 break-words overflow-hidden overflow-wrap-anywhere">
        on:{' '}
        <a
          href={`/item/${comment.parent}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/item/${comment.parent}`);
          }}
          className={`${
            theme === 'green'
              ? 'text-green-400'
              : 'text-[#ff6600]'
          } hover:underline hover:opacity-100`}
        >
          {comment.parentTitle}
        </a>
      </div>
    </div>
  );
}; 