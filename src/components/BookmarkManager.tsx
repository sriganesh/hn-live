interface BookmarkEntry {
  id: number;
  type: 'story' | 'comment';
  storyId?: number;  // Only for comments, to link back to parent story
}

export function BookmarkManager() {
  const exportBookmarks = () => {
    // Just get the raw bookmarks data from localStorage
    const bookmarks: BookmarkEntry[] = JSON.parse(localStorage.getItem('hn-bookmarks') || '[]');
    
    // Get Unix timestamp for filename
    const timestamp = Math.floor(Date.now() / 1000);

    // Create and download JSON file with timestamp
    const content = JSON.stringify(bookmarks, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hn.live-bookmarks-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportBookmarks}
      className="opacity-75 hover:opacity-100 transition-opacity"
    >
      [EXPORT]
    </button>
  );
} 