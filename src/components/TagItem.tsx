import React from 'react';
import { ThemeOption } from '../types/common';
import { Tag } from '../types/tags';

interface TagItemProps {
  tag: Tag;
  theme: ThemeOption;
  onViewTag: (tag: string) => void;
  onDeleteTag?: (tagId: string) => void;
  onUpdateTag?: (tagId: string, newData: Partial<Tag>) => void;
  isEditable?: boolean;
}

export const TagItem: React.FC<TagItemProps> = ({
  tag,
  theme,
  onViewTag,
  onDeleteTag,
  onUpdateTag,
  isEditable = false
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(tag.name);

  const handleSave = () => {
    if (editName.trim() && onUpdateTag) {
      onUpdateTag(tag.id, { name: editName.trim() });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName(tag.name);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (onDeleteTag) {
      onDeleteTag(tag.id);
    }
  };

  return (
    <div className={`p-4 rounded ${
      theme === 'dog'
        ? 'bg-[#222222]'
        : theme === 'green'
        ? 'bg-green-500/[0.04]'
        : 'bg-[#fafaf7]'
    }`}>
      {isEditing ? (
        <div className="space-y-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className={`w-full p-2 rounded ${
              theme === 'green'
                ? 'bg-black border border-green-500 text-green-400'
                : theme === 'og'
                ? 'bg-[#f6f6ef] border border-[#ff6600] text-[#333]'
                : 'bg-[#222] border border-[#444] text-[#ccc]'
            }`}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!editName.trim()}
              className={`px-3 py-1 rounded text-sm ${
                theme === 'green'
                  ? 'bg-green-500 text-black hover:bg-green-600'
                  : theme === 'og'
                  ? 'bg-[#ff6600] text-white hover:bg-[#ff7700]'
                  : 'bg-[#444] text-white hover:bg-[#555]'
              } disabled:opacity-50`}
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              className={`px-3 py-1 rounded text-sm ${
                theme === 'green'
                  ? 'bg-black border border-green-500 text-green-400'
                  : theme === 'og'
                  ? 'bg-[#f6f6ef] border border-[#ff6600] text-[#333]'
                  : 'bg-[#222] border border-[#444] text-[#ccc]'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div 
            className={`font-medium cursor-pointer hover:underline ${
              theme === 'green'
                ? 'text-green-400'
                : theme === 'og'
                ? 'text-[#ff6600]'
                : 'text-[#ccc]'
            }`}
            onClick={() => onViewTag(tag.name)}
          >
            {tag.name}
          </div>
          
          {isEditable && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className={`opacity-75 hover:opacity-100 ${
                  theme === 'green'
                    ? 'text-green-400'
                    : theme === 'og'
                    ? 'text-[#ff6600]'
                    : 'text-[#ccc]'
                }`}
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className={`opacity-75 hover:opacity-100 ${
                  theme === 'green'
                    ? 'text-green-400'
                    : theme === 'og'
                    ? 'text-[#ff6600]'
                    : 'text-[#ccc]'
                }`}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 