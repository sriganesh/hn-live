import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Theme, HNStory } from '../types';
import { useThemeStyles } from '../hooks/useThemeStyles';
import { TimeStamp, UserLink, ActionButtons } from './common';

interface StoryPreviewProps {
  story: HNStory;
  theme: Theme;
  onUserClick: (username: string) => void;
}

export const StoryPreview = memo(function StoryPreview({
  story,
  theme,
  onUserClick
}: StoryPreviewProps) {
  const navigate = useNavigate();
  const styles = useThemeStyles(theme);

  return (
    <div className="group">
      <div className="space-y-2">
        {/* Top row - user, time, points, and comments */}
        <div className="text-sm opacity-75 flex items-center flex-wrap gap-1">
          <UserLink
            username={story.by}
            theme={theme}
            onUserClick={onUserClick}
            className="inline-flex items-center"
          />
          <span>•</span>
          <TimeStamp time={story.time} storyId={story.id} className="inline-flex items-center" />
          <span>•</span>
          <span className="font-mono inline-flex items-center">{story.score} points</span>
          <span>•</span>
          <span className="inline-flex items-center">{story.descendants || 0} comments</span>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold">
          {story.url ? (
            <a href={story.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-75">
              {story.title}
              <span className="ml-2 font-normal text-base opacity-50">
                ({new URL(story.url).hostname})
              </span>
            </a>
          ) : (
            story.title
          )}
        </h1>

        {/* Actions */}
        <div className="text-sm opacity-75 flex items-center gap-2">
          <ActionButtons
            item={{
              id: story.id,
              type: 'story',
              title: story.title,
              by: story.by,
              time: story.time,
              url: story.url
            }}
            theme={theme}
            variant="text"
          />
          {story && typeof story.descendants === 'number' && story.descendants > 0 && (
            <>
              <span>•</span>
              <button
                onClick={() => navigate(`/links/${story.id}`)}
                className="hover:opacity-75 transition-opacity flex items-center gap-1"
                title="View shared links"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                links
              </button>
              <span>•</span>
              <button
                onClick={() => navigate(`/replay/${story.id}`)}
                className="hover:opacity-75 transition-opacity flex items-center gap-1"
                title="Replay discussion"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                replay
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}); 