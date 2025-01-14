import { useState } from 'react';

interface TimeStampProps {
  time: string;
  fullDate: string;
}

export const TimeStamp = ({ time, fullDate }: TimeStampProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative">
      <span 
        className="opacity-50 shrink-0"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {time}
      </span>
      {showTooltip && (
        <div className="absolute left-0 bottom-full mb-1 z-50 animate-fade-in">
          <div className="bg-black border border-current px-2 py-1 rounded whitespace-nowrap text-xs">
            {fullDate}
          </div>
        </div>
      )}
    </div>
  );
}; 