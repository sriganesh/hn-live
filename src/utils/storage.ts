import { FontOption } from '../types/hn';
import { defaults, mobileDefaults } from '../config/defaults';

const isMobileView = () => window.innerWidth < 640;

export const getStoredTheme = () => {
  try {
    const storedTheme = localStorage.getItem('hn-live-theme');
    if (storedTheme && ['green', 'og', 'dog'].includes(storedTheme)) {
      return storedTheme as 'green' | 'og' | 'dog';
    }
  } catch (e) {
    console.warn('Could not access localStorage');
  }
  return defaults.theme;
};

export const getStoredAutoscroll = () => {
  try {
    const storedAutoscroll = localStorage.getItem('hn-live-autoscroll');
    return storedAutoscroll === 'true';
  } catch (e) {
    console.warn('Could not access localStorage');
  }
  return false;
};

export const getStoredFontSize = () => {
  try {
    const storedSize = localStorage.getItem('hn-live-font-size');
    if (storedSize && ['xs', 'sm', 'base', 'lg', 'xl', '2xl'].includes(storedSize)) {
      return storedSize as 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
    }
    return isMobileView() ? 'sm' : 'base';
  } catch (e) {
    console.warn('Could not access localStorage');
    return isMobileView() ? 'sm' : 'base';
  }
};

export const getStoredLayout = () => {
  try {
    const storedLayout = localStorage.getItem('hn-live-classic-layout');
    return storedLayout === null ? true : storedLayout === 'true';
  } catch (e) {
    console.warn('Could not access localStorage');
  }
  return true;
};

export const getStoredCommentParents = () => {
  try {
    const stored = localStorage.getItem('hn-live-comment-parents');
    return stored === 'true';
  } catch (e) {
    console.warn('Could not access localStorage');
  }
  return false;
};

export const getStoredFont = () => {
  try {
    const storedFont = localStorage.getItem('hn-live-font');
    if (storedFont && ['mono', 'jetbrains', 'fira', 'source', 'sans', 'serif', 'system'].includes(storedFont)) {
      return storedFont as FontOption;
    }
  } catch (e) {
    console.warn('Could not access localStorage');
  }
  return defaults.font;
};

export const getStoredDirectLinks = () => {
  try {
    const storedDirectLinks = localStorage.getItem('hn-live-direct');
    return storedDirectLinks === 'true';
  } catch (e) {
    console.warn('Could not access localStorage');
  }
  return false;
};


export const setStoredBackToTop = (value: boolean) => {
  localStorage.setItem('hn-show-back-to-top', value.toString());
};

export const getStoredBackToTop = () => {
  const stored = localStorage.getItem('hn-show-back-to-top');
  return stored === null ? true : stored === 'true';
}; 