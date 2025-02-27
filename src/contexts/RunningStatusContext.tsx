import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface RunningStatusContextType {
  isRunning: boolean;
  setIsRunning: (isRunning: boolean) => void;
}

const RunningStatusContext = createContext<RunningStatusContextType | undefined>(undefined);

export const useRunningStatus = () => {
  const context = useContext(RunningStatusContext);
  if (context === undefined) {
    throw new Error('useRunningStatus must be used within a RunningStatusProvider');
  }
  return context;
};

interface RunningStatusProviderProps {
  children: ReactNode;
}

export const RunningStatusProvider: React.FC<RunningStatusProviderProps> = ({ children }) => {
  const [isRunning, setIsRunning] = useState<boolean>(() => {
    try {
      // Try to get the running status from localStorage
      const storedStatus = localStorage.getItem('hn-live-running');
      return storedStatus === null ? true : storedStatus === 'true';
    } catch (e) {
      console.warn('Could not access localStorage for running status');
      return true; // Default to running
    }
  });

  // Save running status to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('hn-live-running', isRunning.toString());
    } catch (e) {
      console.warn('Could not save running status to localStorage');
    }
  }, [isRunning]);

  return (
    <RunningStatusContext.Provider value={{ isRunning, setIsRunning }}>
      {children}
    </RunningStatusContext.Provider>
  );
}; 