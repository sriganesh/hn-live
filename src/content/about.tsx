interface AboutOverlayProps {
  theme: 'green' | 'og' | 'dog';
  themeColors: string;
  themeBg: string;
  headerColor: string;
  onClose: () => void;
}

export const AboutOverlay = ({ theme, themeColors, themeBg, headerColor, onClose }: AboutOverlayProps) => {
  const extraContent = import.meta.env.VITE_ABOUT_TEXT;
  const extraLink = import.meta.env.VITE_ABOUT_LINK;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className={`${themeBg} border ${themeColors} p-8 max-w-lg rounded-lg space-y-4`}>
        <div className="flex justify-between items-center">
          <h2 className={`${headerColor} text-lg font-bold`}>About HN Live</h2>
          <button onClick={onClose} className={themeColors}>[×]</button>
        </div>
        <div className="space-y-4 text-sm">
          <p>
            A real-time interface for Hacker News that shows new posts and comments as they happen.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Real-time feed with auto-scroll and live filtering</li>
            <li>Classic Sections: Browse Front Page, Show HN, Ask HN, Jobs, and Best stories</li>
            <li>Features: GREP/SEARCH, user profiles, threaded comments, keyboard shortcuts, mobile optimized</li>
            <li>Themes: HN Orange, Dark, Terminal</li>
          </ul>
          {extraContent && extraLink && (
            <p>
              <a 
                href={extraLink}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:opacity-75"
              >
                {extraContent}
              </a>
            </p>
          )}
          <p>
            Built by <a 
              href="https://sri.xyz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:opacity-75"
            >
              sri.xyz
            </a> using the {' '}
            <a 
              href="https://github.com/HackerNews/API"
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:opacity-75"
            >
              official HN API
            </a>
            {' '} and {' '}
            <a 
              href="https://hn.algolia.com/api"
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:opacity-75"
            >
              Algolia Search API
            </a>
          </p>
          <p className="flex items-center gap-2">
            <svg 
              viewBox="0 0 24 24" 
              className="w-4 h-4" 
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <a 
              href="https://github.com/sriganesh/hn-live"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-75"
            >
              View source on GitHub
            </a>
          </p>
          <p className="text-sm opacity-75">
            An independent project, not affiliated with HN/YC (yet)
          </p>
        </div>
      </div>
    </div>
  );
}; 