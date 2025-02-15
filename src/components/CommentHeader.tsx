import { memo } from 'react';
import { useThemeStyles } from '../hooks/useThemeStyles';

interface CommentHeaderProps {
  sortMode: 'nested' | 'recent';
  setSortMode: (mode: 'nested' | 'recent') => void;
  toggleTopLevelOnly: () => void;
  isTopLevelOnly: boolean;
  theme: 'green' | 'og' | 'dog';
  useAlgoliaApi: boolean;
  storyDescendants?: number;
}

export const CommentHeader = memo(function CommentHeader({
  sortMode,
  setSortMode,
  toggleTopLevelOnly,
  isTopLevelOnly,
  theme,
  useAlgoliaApi,
  storyDescendants
}: CommentHeaderProps) {
  const styles = useThemeStyles(theme);

  if (!useAlgoliaApi || !storyDescendants || storyDescendants === 0) {
    return null;
  }

  return (
    <div className="text-sm opacity-75 flex justify-end items-center mt-4">
      <div className="flex gap-2">
        {sortMode === 'nested' && (
          <>
            <button
              onClick={toggleTopLevelOnly}
              className={`hover:underline ${isTopLevelOnly ? 'opacity-50' : ''}`}
            >
              top level view
            </button>
            <span>|</span>
          </>
        )}
        <button
          onClick={() => setSortMode('nested')}
          className={`hover:underline ${sortMode === 'nested' ? 'opacity-50' : ''}`}
        >
          default view
        </button>
        <span>|</span>
        <button
          onClick={() => setSortMode('recent')}
          className={`hover:underline ${sortMode === 'recent' ? 'opacity-50' : ''}`}
        >
          recent first
        </button>
      </div>
    </div>
  );
}); 