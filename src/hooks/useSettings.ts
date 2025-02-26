import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../config/constants';

export interface UserSettings {
  theme: 'green' | 'og' | 'dog';
  hnUsername: string | null;
  showReadComments: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'green',
  hnUsername: null,
  showReadComments: false
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return savedSettings 
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) } 
        : DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  });

  const [error, setError] = useState<string | null>(null);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      setError(null);
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    }
  }, [settings]);

  // Update a single setting
  const updateSetting = useCallback(<K extends keyof UserSettings>(
    key: K, 
    value: UserSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Update multiple settings at once
  const updateSettings = useCallback((newSettings: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Reset settings to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  // Export settings
  const exportSettings = useCallback(() => {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const content = JSON.stringify(settings, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `hn.live-settings-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setError(null);
      return true;
    } catch (error) {
      console.error('Error exporting settings:', error);
      setError('Failed to export settings');
      return false;
    }
  }, [settings]);

  // Import settings
  const importSettings = useCallback(async (file: File) => {
    try {
      const content = await file.text();
      const importedSettings = JSON.parse(content);
      
      // Validate imported settings
      if (typeof importedSettings !== 'object' || importedSettings === null) {
        throw new Error('Invalid settings format');
      }
      
      // Apply imported settings with defaults for missing values
      setSettings(prev => ({ ...prev, ...importedSettings }));
      setError(null);
      return true;
    } catch (error) {
      console.error('Error importing settings:', error);
      setError('Failed to import settings: Invalid format');
      return false;
    }
  }, []);

  return {
    settings,
    error,
    updateSetting,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings
  };
} 