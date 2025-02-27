import React, { createContext, useState, useContext, useEffect } from 'react';
import { STORAGE_KEYS } from '../config/constants';
import { getBooleanValue, setBooleanValue } from '../utils/localStorage';

interface RunningStatusContextType {
  isRunning: boolean;
  setIsRunning: (isRunning: boolean) => void;
  toggleRunning: () => void;
}

const RunningStatusContext = createContext<RunningStatusContextType | undefined>(undefined);

export const useRunningStatus = () => {
  const context = useContext(RunningStatusContext);
  if (!context) {
    throw new Error('useRunningStatus must be used within a RunningStatusProvider');
  }
  return context;
};

export const RunningStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize isRunning from localStorage or default to true
  const [isRunning, setIsRunningState] = useState<boolean>(() => {
    try {
      return getBooleanValue(STORAGE_KEYS.RUNNING, true);
    } catch (e) {
      console.warn('Could not access localStorage for running status');
      return true;
    }
  });

  // Update localStorage when isRunning changes
  useEffect(() => {
    try {
      setBooleanValue(STORAGE_KEYS.RUNNING, isRunning);
    } catch (e) {
      console.warn('Could not save running status to localStorage');
    }
  }, [isRunning]);

  const setIsRunning = (value: boolean) => {
    setIsRunningState(value);
  };

  const toggleRunning = () => {
    setIsRunningState(prev => !prev);
  };

  return (
    <RunningStatusContext.Provider value={{ isRunning, setIsRunning, toggleRunning }}>
      {children}
    </RunningStatusContext.Provider>
  );
}; 