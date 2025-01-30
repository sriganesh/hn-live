import { useState, useEffect } from 'react';

interface UpdateNotifierProps {
  className?: string;
  buttonClassName?: string;
}

export function UpdateNotifier({ className = '', buttonClassName = '' }: UpdateNotifierProps) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  // Check for updates
  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // First time: store current version
        if (!currentVersion) {
          const response = await fetch('/version.json');
          const data = await response.json();
          setCurrentVersion(data.buildTime);
          return;
        }

        // Check for new version
        const response = await fetch('/version.json', { cache: 'no-store' });
        const data = await response.json();
        
        if (data.buildTime !== currentVersion) {
          setUpdateAvailable(true);
        }
      } catch (err) {
        console.error('Error checking for updates:', err);
      }
    };

    // Check immediately and then every 5 minutes
    checkForUpdates();
    const interval = setInterval(checkForUpdates, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentVersion]);

  const handleUpdate = () => {
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className={`
      fixed top-[70px] sm:top-[80px] left-1/2 -translate-x-1/2 
      z-[9999] backdrop-blur-sm rounded-lg p-4 shadow-lg 
      flex flex-col items-center
      w-[calc(100%-2rem)] sm:w-auto sm:min-w-[280px] sm:max-w-md
      text-center
      ${className}
    `}>
      <div className="flex items-center gap-2">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
        </span>
        <span>New Site Version Available</span>
      </div>
      <button
        onClick={handleUpdate}
        className={`mt-3 px-4 py-1.5 rounded transition-colors ${buttonClassName}`}
      >
        Update Now
      </button>
    </div>
  );
} 