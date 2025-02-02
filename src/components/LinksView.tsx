import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { UserModal } from './UserModal';

interface LinksViewProps {
  theme: 'green' | 'og' | 'dog';
  fontSize: string;
  font: string;
  isRunning: boolean;
}

interface StoryLink {
  url: string;
  title?: string;
  commentId: number;
  commentBy: string;
  commentText: string;
  time: number;
  isHNLink: boolean;
}

interface Story {
  id: number;
  title: string;
  url?: string;
  by: string;
  time: number;
}

export function LinksView({ theme, fontSize, font, isRunning }: LinksViewProps) {
  const navigate = useNavigate();
  const { itemId } = useParams();
  
  const [story, setStory] = useState<Story | null>(null);
  const [links, setLinks] = useState<StoryLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'external' | 'hn'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingUser, setViewingUser] = useState<string | null>(null);

  // Helper function to extract links from HTML text
  const extractLinks = (html: string): { url: string; title?: string }[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'));
    return links.map(link => ({
      url: link.href,
      title: link.textContent || undefined
    }));
  };

  // Helper to check if a URL is a Hacker News link
  const isHackerNewsLink = (url: string): boolean => {
    return url.includes('news.ycombinator.com') || url.includes('hn.algolia.com');
  };

  useEffect(() => {
    const fetchStoryAndLinks = async () => {
      setIsLoading(true);
      try {
        // Fetch story and comments using Algolia API
        const response = await fetch(`https://hn.algolia.com/api/v1/items/${itemId}`);
        const data = await response.json();

        setStory({
          id: data.id,
          title: data.title,
          url: data.url,
          by: data.author,
          time: data.created_at_i
        });

        // Function to recursively process comments and extract links
        const processComments = (comments: any[]): StoryLink[] => {
          return comments.reduce((acc: StoryLink[], comment: any) => {
            if (comment.text) {
              const extractedLinks = extractLinks(comment.text);
              const commentLinks = extractedLinks.map(link => ({
                url: link.url,
                title: link.title,
                commentId: comment.id,
                commentBy: comment.author,
                commentText: comment.text,
                time: comment.created_at_i,
                isHNLink: isHackerNewsLink(link.url)
              }));
              acc.push(...commentLinks);
            }
            if (comment.children) {
              acc.push(...processComments(comment.children));
            }
            return acc;
          }, []);
        };

        const allLinks = processComments(data.children || []);
        
        // Remove duplicates based on URL
        const uniqueLinks = allLinks.filter((link, index, self) =>
          index === self.findIndex((l) => l.url === link.url)
        );

        setLinks(uniqueLinks);
      } catch (error) {
        console.error('Error fetching story:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (itemId) {
      fetchStoryAndLinks();
    }
  }, [itemId]);

  // Filter links based on active tab and search term
  const filteredLinks = links.filter(link => {
    const matchesTab = 
      activeTab === 'all' || 
      (activeTab === 'external' && !link.isHNLink) ||
      (activeTab === 'hn' && link.isHNLink);

    const matchesSearch = 
      link.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (link.title?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      link.commentText.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
  };

  // Add useEffect for escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingUser) {
          setViewingUser(null);
        } else {
          navigate(-1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, viewingUser]);

  return (
    <>
      {story && (
        <Helmet>
          <title>{`Links: ${story.title} | HN Live`}</title>
        </Helmet>
      )}

      <div 
        className={`fixed inset-0 overflow-y-auto z-50
          ${font === 'mono' ? 'font-mono' : 
            font === 'jetbrains' ? 'font-jetbrains' :
            font === 'fira' ? 'font-fira' :
            font === 'source' ? 'font-source' :
            font === 'sans' ? 'font-sans' :
            font === 'serif' ? 'font-serif' :
            'font-system'}
          ${theme === 'green'
            ? 'bg-black text-green-400'
            : theme === 'og'
            ? 'bg-[#f6f6ef] text-[#828282]'
            : 'bg-[#1a1a1a] text-[#828282]'}
          text-${fontSize}
        `}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button 
              onClick={() => navigate(`/item/${itemId}`)}
              className={`${
                theme === 'green' ? 'text-green-500' : 'text-[#ff6600]'
              } font-bold tracking-wider flex items-center gap-2 hover:opacity-75 transition-opacity`}
            >
              ← Back to Discussion
            </button>
          </div>

          {/* Story info */}
          {story && (
            <div className="max-w-4xl mx-auto mb-8">
              <h1 className="text-xl font-bold mb-2">
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
            </div>
          )}

          {/* Search and filters */}
          <div className="max-w-4xl mx-auto mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  activeTab === 'all' 
                    ? theme === 'green'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-[#ff6600]/20 text-[#ff6600]'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                All ({links.length})
              </button>
              <button
                onClick={() => setActiveTab('external')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  activeTab === 'external'
                    ? theme === 'green'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-[#ff6600]/20 text-[#ff6600]'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                External ({links.filter(l => !l.isHNLink).length})
              </button>
              <button
                onClick={() => setActiveTab('hn')}
                className={`px-3 py-1 rounded-full transition-colors ${
                  activeTab === 'hn'
                    ? theme === 'green'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-[#ff6600]/20 text-[#ff6600]'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                HN ({links.filter(l => l.isHNLink).length})
              </button>
            </div>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search links..."
              className={`px-3 py-1 rounded-full w-full sm:w-64
                ${theme === 'green'
                  ? 'bg-green-500/10 focus:bg-green-500/20'
                  : theme === 'og'
                  ? 'bg-[#ff6600]/10 focus:bg-[#ff6600]/20'
                  : 'bg-gray-800 focus:bg-gray-700'
                } 
                border-none outline-none transition-colors`
              }
            />
          </div>

          {/* Links list */}
          <div className="max-w-4xl mx-auto space-y-6">
            {isLoading ? (
              <div className="text-center py-8">Loading links...</div>
            ) : filteredLinks.length === 0 ? (
              <div className="text-center py-8 opacity-75">
                {searchTerm ? 'No matching links found' : 'No links found in comments'}
              </div>
            ) : (
              filteredLinks.map((link, index) => (
                <div 
                  key={`${link.url}-${index}`}
                  className={`py-3 ${
                    index !== filteredLinks.length - 1 ? 
                      theme === 'green'
                        ? 'border-b border-green-500/10'
                        : theme === 'og'
                        ? 'border-b border-[#ff6600]/10'
                        : 'border-b border-gray-700/20'
                      : ''
                  }`}
                >
                  <div className="space-y-2">
                    <a 
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:opacity-75 transition-opacity"
                    >
                      <span className="break-words">
                        {link.title || link.url}
                      </span>
                      <span className="ml-2 opacity-50 text-sm">
                        ({new URL(link.url).hostname})
                      </span>
                    </a>
                    
                    <div className="text-sm opacity-75">
                      Shared by{' '}
                      <a 
                        onClick={(e) => {
                          e.preventDefault();
                          setViewingUser(link.commentBy);
                        }}
                        href={`/user/${link.commentBy}`}
                        className="hover:underline cursor-pointer"
                      >
                        {link.commentBy}
                      </a>
                      {' '} • {' '}
                      <a
                        href={`/item/${story?.id}/comment/${link.commentId}`}
                        className="hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/item/${story?.id}/comment/${link.commentId}`);
                        }}
                      >
                        {formatTimeAgo(link.time)}
                      </a>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Add footer message */}
            <div className="text-center py-8 pb-24 sm:pb-8 space-y-4">
              <div className="text-sm space-y-2">
                <div>
                  <a
                    href={`https://news.ycombinator.com/item?id=${story?.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${
                      theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                    } hover:opacity-75`}
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
                    className={`${
                      theme === 'green' ? 'text-green-400' : 'text-[#ff6600]'
                    } hover:opacity-75`}
                  >
                    → Head back to the live feed to see real-time stories and discussions
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add UserModal at the bottom of the component */}
      {viewingUser && (
        <UserModal
          userId={viewingUser}
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
          theme={theme}
          fontSize={fontSize}
        />
      )}
    </>
  );
} 