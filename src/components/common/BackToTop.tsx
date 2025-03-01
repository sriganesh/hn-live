import React, { useState, useEffect, useRef } from 'react';
import { ThemeOption } from '../../types/common';

interface BackToTopProps {
  theme: ThemeOption;
  containerRef?: React.RefObject<HTMLElement>;
  scrollThreshold?: number;
  bottomOffset?: string;
}

export const BackToTop: React.FC<BackToTopProps> = ({
  theme,
  containerRef,
  scrollThreshold = 500,
  bottomOffset = 'bottom-28'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const defaultContainerRef = useRef<HTMLElement | null>(null);

  // Set up the scroll handler
  useEffect(() => {
    // Use the provided containerRef or default to document.documentElement
    const container = containerRef?.current || defaultContainerRef.current;
    
    if (!container) {
      // If no container is provided, use document.documentElement (the <html> element)
      defaultContainerRef.current = document.documentElement;
      return;
    }

    const handleScroll = () => {
      // For document.documentElement, use scrollY instead of scrollTop
      const scrollTop = container === document.documentElement 
        ? window.scrollY 
        : container.scrollTop;
        
      setIsVisible(scrollTop > scrollThreshold);
    };

    // Add the scroll listener
    if (container === document.documentElement) {
      window.addEventListener('scroll', handleScroll);
    } else {
      container.addEventListener('scroll', handleScroll);
    }

    // Initial check
    handleScroll();

    // Clean up
    return () => {
      if (container === document.documentElement) {
        window.removeEventListener('scroll', handleScroll);
      } else {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [containerRef, scrollThreshold]);

  // Scroll to top function
  const scrollToTop = () => {
    const container = containerRef?.current || defaultContainerRef.current;
    
    if (!container) return;
    
    if (container === document.documentElement) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      container.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      className={`fixed ${bottomOffset} right-8 p-2 rounded-full shadow-lg z-[60] 
        ${theme === 'green' 
          ? 'bg-green-500/10 hover:bg-green-500/20 text-green-400' 
          : theme === 'og'
          ? 'bg-[#ff6600]/10 hover:bg-[#ff6600]/20 text-[#ff6600]'
          : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
        }
        transition-all duration-200 opacity-90 hover:opacity-100`}
      aria-label="Back to top"
    >
      <svg 
        className="w-6 h-6" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  );
}; 