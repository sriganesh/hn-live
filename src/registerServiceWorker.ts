export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      console.log('Registering service worker...');
      navigator.serviceWorker.register('/serviceWorker.js').then(registration => {
        console.log('ServiceWorker registration successful:', registration);
        
        // Start tracking immediately if service worker is already active
        const username = localStorage.getItem('hn-username');
        if (username && registration.active) {
          console.log('Service worker already active, starting tracking for', username);
          registration.active.postMessage({
            type: 'startTracking',
            username
          });
        }

        // Also listen for future activations
        registration.addEventListener('activate', () => {
          console.log('Service worker activated');
          const username = localStorage.getItem('hn-username');
          if (username && registration.active) {
            console.log('Starting tracking after activation for', username);
            registration.active.postMessage({
              type: 'startTracking',
              username
            });
          }
        });

      }).catch(err => {
        console.error('ServiceWorker registration failed:', err);
      });
    });
  } else {
    console.log('Service workers are not supported');
  }
}

// Add a function to manually start tracking
export function startTracking(username: string) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      console.log('Manually starting tracking for', username);
      registration.active?.postMessage({
        type: 'startTracking',
        username
      });
    });
  }
} 