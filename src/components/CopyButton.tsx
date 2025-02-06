import { useState } from 'react';

interface CopyButtonProps {
  url: string;
  theme: 'green' | 'og' | 'dog';
  variant?: 'icon' | 'text';
}

export function CopyButton({ url, theme, variant = 'icon' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (variant === 'text') {
    return (
      <button
        onClick={handleCopy}
        className={`hover:underline ${
          copied 
            ? theme === 'green'
              ? 'text-green-500'
              : 'text-[#ff6600]'
            : ''
        }`}
        title={copied ? 'Copied!' : 'Copy link'}
      >
        {copied ? 'copied!' : 'copy link'}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={`hover:opacity-75 transition-opacity flex items-center ${
        copied ? (theme === 'green' ? 'text-green-500' : 'text-[#ff6600]') : ''
      }`}
      title={copied ? 'Copied!' : 'Copy link'}
    >
      <svg 
        className="w-5 h-5" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path 
          stroke="currentColor" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M14 4v3a1 1 0 0 1-1 1h-3m4 10v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h2m11-3v10a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V7.87a1 1 0 0 1 .24-.65l2.46-2.87a1 1 0 0 1 .76-.35H18a1 1 0 0 1 1 1Z"
        />
      </svg>
    </button>
  );
} 