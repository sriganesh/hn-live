interface UserTagsManagerProps {
  theme: 'green' | 'og' | 'dog';
}

export function UserTagsManager({ theme }: UserTagsManagerProps) {
  const exportTags = () => {
    const tags: UserTag[] = JSON.parse(localStorage.getItem('hn-user-tags') || '[]');
    const timestamp = Math.floor(Date.now() / 1000);
    const content = JSON.stringify(tags, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hn.live-user-tags-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportTags}
      className="opacity-75 hover:opacity-100 transition-opacity"
    >
      [EXPORT TAGS]
    </button>
  );
} 