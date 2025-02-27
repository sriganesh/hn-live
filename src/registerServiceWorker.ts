import { getUsername } from './utils/localStorage';

// Register the service worker
export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Use the base URL of the current page
      const swUrl = `${window.location.origin}/serviceWorker.js`;
      
      navigator.serviceWorker.register(swUrl)
        .then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
          
          // Start tracking if we have a username
          const username = getUsername();
          if (username) {
            startTracking(username);
          }
        })
        .catch(error => {
          console.error('ServiceWorker registration failed: ', error);
        });
    });
  }
}

// Start tracking comments for a user
export function startTracking(username: string) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      if (registration.active && username) {
        console.log('Starting tracking for user:', username);
        registration.active.postMessage({
          type: 'startTracking',
          username
        });
      }
    });
  }
}

// Unregister the service worker
export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error(error.message);
      });
  }
} 