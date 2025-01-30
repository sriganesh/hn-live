export function register() {
  if ('serviceWorker' in navigator) {
    // Add timestamp as query parameter to force update check on new deploys
    const timestamp = new Date().getTime();
    const swUrl = `/serviceWorker.js?v=${timestamp}`;
    
    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        console.log('ServiceWorker registration successful');
        
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

      })
      .catch((error) => {
        console.error('ServiceWorker registration failed:', error);
      });
  } else {
    console.log('Service workers are not supported');
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
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