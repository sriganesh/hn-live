import { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../config/constants';

export interface UserSettings {
  theme: 'green' | 'og' | 'dog';
  hnUsername: string | null;
  showCommentParents: boolean;
}

// Get theme from localStorage or use default
const getThemeFromStorage = (): 'green' | 'og' | 'dog' => {
  try {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME);
    return (theme === 'green' || theme === 'og' || theme === 'dog') ? theme : 'green';
  } catch (e) {
    return 'green';
  }
};

const DEFAULT_SETTINGS: UserSettings = {
  theme: getThemeFromStorage(),
  hnUsername: null,
  showCommentParents: false
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      // Always use the theme from localStorage if available
      const theme = getThemeFromStorage();
      
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        return { 
          ...DEFAULT_SETTINGS, 
          ...parsedSettings,
          // Override with the theme from localStorage
          theme 
        };
      }
      
      return { ...DEFAULT_SETTINGS, theme };
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
      
      // Also update the theme in localStorage for compatibility with the main site
      if (settings.theme) {
        localStorage.setItem(STORAGE_KEYS.THEME, settings.theme);
      }
      
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
    
    // Special handling for theme to ensure it's also saved to hn-live-theme
    if (key === 'theme' && typeof value === 'string') {
      try {
        localStorage.setItem(STORAGE_KEYS.THEME, value);
      } catch (error) {
        console.error('Error saving theme to localStorage:', error);
      }
    }
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