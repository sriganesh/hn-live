import { STORAGE_KEYS } from '../config/constants';

/**
 * Standardized utility functions for localStorage operations
 * This ensures consistent handling of different data types across the application
 */

/**
 * Get a boolean value from localStorage
 * @param key The localStorage key
 * @param defaultValue The default value if the key doesn't exist
 * @returns The boolean value
 */
export function getBooleanValue(key: string, defaultValue: boolean = false): boolean {
  try {
    const value = localStorage.getItem(key);
    // If the key doesn't exist, return the default value
    if (value === null) return defaultValue;
    // Otherwise, return true only if the value is exactly 'true'
    return value === 'true';
  } catch (error) {
    console.warn(`Error reading boolean value for key ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set a boolean value in localStorage
 * @param key The localStorage key
 * @param value The boolean value to store
 */
export function setBooleanValue(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value.toString());
  } catch (error) {
    console.warn(`Error saving boolean value for key ${key}:`, error);
  }
}

/**
 * Get a string value from localStorage
 * @param key The localStorage key
 * @param defaultValue The default value if the key doesn't exist
 * @returns The string value
 */
export function getStringValue(key: string, defaultValue: string = ''): string {
  try {
    const value = localStorage.getItem(key);
    return value === null ? defaultValue : value;
  } catch (error) {
    console.warn(`Error reading string value for key ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set a string value in localStorage
 * @param key The localStorage key
 * @param value The string value to store
 */
export function setStringValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Error saving string value for key ${key}:`, error);
  }
}

/**
 * Get a JSON value from localStorage
 * @param key The localStorage key
 * @param defaultValue The default value if the key doesn't exist or is invalid JSON
 * @returns The parsed JSON value
 */
export function getJSONValue<T>(key: string, defaultValue: T): T {
  try {
    const value = localStorage.getItem(key);
    return value === null ? defaultValue : JSON.parse(value);
  } catch (error) {
    console.warn(`Error reading JSON value for key ${key}:`, error);
    return defaultValue;
  }
}

/**
 * Set a JSON value in localStorage
 * @param key The localStorage key
 * @param value The value to stringify and store
 */
export function setJSONValue<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error saving JSON value for key ${key}:`, error);
  }
}

/**
 * Remove a value from localStorage
 * @param key The localStorage key to remove
 */
export function removeValue(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Error removing value for key ${key}:`, error);
  }
}

/**
 * Clear all values from localStorage
 */
export function clearAll(): void {
  try {
    localStorage.clear();
  } catch (error) {
    console.warn('Error clearing localStorage:', error);
  }
}

// Specific helper functions for common settings

/**
 * Get the theme setting
 * @returns The current theme
 */
export function getTheme(): 'green' | 'og' | 'dog' {
  return getStringValue(STORAGE_KEYS.THEME, 'og') as 'green' | 'og' | 'dog';
}

/**
 * Set the theme setting
 * @param theme The theme to set
 */
export function setTheme(theme: 'green' | 'og' | 'dog'): void {
  setStringValue(STORAGE_KEYS.THEME, theme);
  // Also update the document element's data-theme attribute
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Get the autoscroll setting
 * @returns Whether autoscroll is enabled
 */
export function getAutoscroll(): boolean {
  return getBooleanValue(STORAGE_KEYS.AUTOSCROLL, false);
}

/**
 * Set the autoscroll setting
 * @param enabled Whether autoscroll should be enabled
 */
export function setAutoscroll(enabled: boolean): void {
  setBooleanValue(STORAGE_KEYS.AUTOSCROLL, enabled);
}

/**
 * Get the direct links setting
 * @returns Whether direct links are enabled
 */
export function getDirectLinks(): boolean {
  return getBooleanValue(STORAGE_KEYS.DIRECT_LINKS, false);
}

/**
 * Set the direct links setting
 * @param enabled Whether direct links should be enabled
 */
export function setDirectLinks(enabled: boolean): void {
  setBooleanValue(STORAGE_KEYS.DIRECT_LINKS, enabled);
}

/**
 * Get the show comment parents setting
 * @returns Whether comment parents are shown
 */
export function getShowCommentParents(): boolean {
  return getBooleanValue(STORAGE_KEYS.SHOW_COMMENT_PARENTS, true);
}

/**
 * Set the show comment parents setting
 * @param enabled Whether comment parents should be shown
 */
export function setShowCommentParents(enabled: boolean): void {
  setBooleanValue(STORAGE_KEYS.SHOW_COMMENT_PARENTS, enabled);
}

/**
 * Get the classic layout setting
 * @returns Whether classic layout is enabled
 */
export function getClassicLayout(): boolean {
  return getBooleanValue(STORAGE_KEYS.CLASSIC_LAYOUT, false);
}

/**
 * Set the classic layout setting
 * @param enabled Whether classic layout should be enabled
 */
export function setClassicLayout(enabled: boolean): void {
  setBooleanValue(STORAGE_KEYS.CLASSIC_LAYOUT, enabled);
}

/**
 * Get the use Algolia API setting
 * @returns Whether the Algolia API is used
 */
export function getUseAlgoliaApi(): boolean {
  return getBooleanValue(STORAGE_KEYS.USE_ALGOLIA_API, true);
}

/**
 * Set the use Algolia API setting
 * @param enabled Whether the Algolia API should be used
 */
export function setUseAlgoliaApi(enabled: boolean): void {
  setBooleanValue(STORAGE_KEYS.USE_ALGOLIA_API, enabled);
}

/**
 * Get the colorize usernames setting
 * @returns Whether usernames are colorized
 */
export function getColorizeUsernames(): boolean {
  return getBooleanValue(STORAGE_KEYS.COLORIZE_USERNAMES, false);
}

/**
 * Set the colorize usernames setting
 * @param enabled Whether usernames should be colorized
 */
export function setColorizeUsernames(enabled: boolean): void {
  setBooleanValue(STORAGE_KEYS.COLORIZE_USERNAMES, enabled);
}

/**
 * Get the font size setting
 * @returns The current font size
 */
export function getFontSize(): 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' {
  // Check if there's a stored font size
  const storedFontSize = localStorage.getItem(STORAGE_KEYS.FONT_SIZE);
  
  // If there's no stored font size, determine default based on device
  if (storedFontSize === null) {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const isMobile = window.innerWidth < 640; // 640px is Tailwind's 'sm' breakpoint
    
    if (isPWA || isMobile) {
      return 'sm';
    }
    return 'base';
  }
  
  // If there is a stored font size, validate it
  if (['xs', 'sm', 'base', 'lg', 'xl', '2xl'].includes(storedFontSize)) {
    return storedFontSize as 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  }
  
  // Fallback to base if the stored value is invalid
  return 'base';
}

/**
 * Set the font size setting
 * @param fontSize The font size to set
 */
export function setFontSize(fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl'): void {
  setStringValue(STORAGE_KEYS.FONT_SIZE, fontSize);
}

/**
 * Get the font setting
 * @returns The current font
 */
export function getFont(): 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system' {
  const font = getStringValue(STORAGE_KEYS.FONT, 'mono');
  // Validate the font
  if (['mono', 'jetbrains', 'fira', 'source', 'sans', 'serif', 'system'].includes(font)) {
    return font as 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system';
  }
  return 'mono';
}

/**
 * Set the font setting
 * @param font The font to set
 */
export function setFont(font: 'mono' | 'jetbrains' | 'fira' | 'source' | 'sans' | 'serif' | 'system'): void {
  setStringValue(STORAGE_KEYS.FONT, font);
}

/**
 * Get the username setting
 * @returns The current username
 */
export function getUsername(): string | null {
  const username = getStringValue(STORAGE_KEYS.USERNAME, '');
  return username === '' ? null : username;
}

/**
 * Set the username setting
 * @param username The username to set
 */
export function setUsername(username: string | null): void {
  if (username) {
    setStringValue(STORAGE_KEYS.USERNAME, username);
  } else {
    removeValue(STORAGE_KEYS.USERNAME);
  }
}

/**
 * Get the running status
 * @returns Whether the feed is running
 */
export function getRunningStatus(): boolean {
  return getBooleanValue(STORAGE_KEYS.RUNNING, true);
}

/**
 * Set the running status
 * @param running Whether the feed should be running
 */
export function setRunningStatus(running: boolean): void {
  setBooleanValue(STORAGE_KEYS.RUNNING, running);
} 