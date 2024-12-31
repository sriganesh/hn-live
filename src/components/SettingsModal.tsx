import React, { useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: 'green' | 'og' | 'dog';
  options: {
    theme: 'green' | 'og' | 'dog';
    autoscroll: boolean;
    directLinks: boolean;
    fontSize: 'xs' | 'sm' | 'base';
  };
  onUpdateOptions: (options: {
    theme: 'green' | 'og' | 'dog';
    autoscroll: boolean;
    directLinks: boolean;
    fontSize: 'xs' | 'sm' | 'base';
  }) => void;
}

export default function SettingsModal({ isOpen, onClose, theme, options, onUpdateOptions }: SettingsModalProps) {
  if (!isOpen) return null;

  // Add keyboard event listener for ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const themeColors = theme === 'green'
    ? 'text-green-400 bg-black'
    : theme === 'og'
    ? 'text-[#828282] bg-[#f6f6ef]'
    : 'text-[#828282] bg-[#1a1a1a]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`${themeColors} p-6 max-w-md w-full mx-4 border border-current/20`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">Settings</h2>
          <button 
            onClick={onClose}
            className="opacity-75 hover:opacity-100"
          >
            [ESC]
          </button>
        </div>

        <div className="space-y-6">
          {/* Theme Selection */}
          <div>
            <h3 className="font-bold mb-2">Theme</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="theme"
                  value="og"
                  checked={options.theme === 'og'}
                  onChange={(e) => onUpdateOptions({ ...options, theme: 'og' })}
                />
                Original HN
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="theme"
                  value="dog"
                  checked={options.theme === 'dog'}
                  onChange={(e) => onUpdateOptions({ ...options, theme: 'dog' })}
                />
                Dark HN
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="theme"
                  value="green"
                  checked={options.theme === 'green'}
                  onChange={(e) => onUpdateOptions({ ...options, theme: 'green' })}
                />
                Green Terminal
              </label>
            </div>
          </div>

          {/* Auto-scroll Toggle */}
          <div>
            <h3 className="font-bold mb-2">Behavior</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.autoscroll}
                  onChange={(e) => onUpdateOptions({ ...options, autoscroll: e.target.checked })}
                />
                Auto-scroll new items
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={options.directLinks}
                  onChange={(e) => onUpdateOptions({ ...options, directLinks: e.target.checked })}
                />
                Direct HN links
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-bold">Font Size</div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => onUpdateOptions({ ...options, fontSize: 'xs' })}
                className={`${
                  options.fontSize === 'xs' 
                    ? 'opacity-100 underline' 
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                [Small]
              </button>
              <button
                onClick={() => onUpdateOptions({ ...options, fontSize: 'sm' })}
                className={`${
                  options.fontSize === 'sm'
                    ? 'opacity-100 underline'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                [Medium]
              </button>
              <button
                onClick={() => onUpdateOptions({ ...options, fontSize: 'base' })}
                className={`${
                  options.fontSize === 'base'
                    ? 'opacity-100 underline'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                [Large]
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 