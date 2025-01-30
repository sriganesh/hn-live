// Service Worker to track HN user comments and replies
const CACHE_NAME = 'hn-live-comments-v1';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Instead of direct localStorage access, we should receive username through messages
let currentUsername = null;
let checkInterval = null;

// Track initial load per username
let initialLoadMap = new Map();

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Log active state
      new Promise(resolve => {
        console.log('Service Worker: Now active and controlling pages');
        resolve();
      })
    ])
  );
});

// Function to fetch user comments and their replies
async function checkUserComments() {
  try {
    if (!currentUsername) return;
    
    // Get existing data and new-replies from client
    const clients = await self.clients.matchAll();
    const client = clients[0];
    if (client) {
      client.postMessage({ type: 'getTrackerState' });
    }

    // Wait for both tracker state and new-replies state
    const { trackerData: existingData, newRepliesData } = await new Promise(resolve => {
      const handler = (event) => {
        if (event.data.type === 'trackerState') {
          self.removeEventListener('message', handler);
          resolve({
            trackerData: event.data.data,
            newRepliesData: event.data.newReplies || {}
          });
        }
      };
      self.addEventListener('message', handler);
    });

    // Fetch new data from API
    const userCommentsResponse = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?tags=comment,author_${currentUsername}&hitsPerPage=10`
    );
    const userCommentsData = await userCommentsResponse.json();
    
    // Second API call for replies
    const commentIds = userCommentsData.hits.map(hit => hit.objectID);
    const filters = commentIds.map(id => `parent_id=${id}`).join(' OR ');
    const repliesResponse = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?filters=${filters}&tags=comment`
    );
    const repliesData = await repliesResponse.json();

    // Prepare current data
    const trackerData = {
      lastChecked: Date.now(),
      comments: userCommentsData.hits.map(comment => ({
        id: comment.objectID,
        replyIds: repliesData.hits
          .filter(reply => String(reply.parent_id) === comment.objectID)
          .map(reply => reply.objectID),
        timestamp: comment.created_at_i
      }))
    };

    // Initialize variables
    let newReplies = {...newRepliesData}; // Start with existing replies
    let foundNewReplies = false;

    // Calculate new replies for each comment
    trackerData.comments.forEach(comment => {
      const existingComment = existingData?.comments?.find(c => c.id === comment.id);
      if (existingComment) {
        // Only count replies that aren't in existing data or current new-replies
        const existingNewReplies = Object.values(newRepliesData).flat()
          .map(r => r.id);
        
        const newReplyIds = comment.replyIds.filter(replyId => 
          !existingComment.replyIds.includes(replyId) &&
          !existingNewReplies.includes(replyId)
        );

        if (newReplyIds.length > 0) {
          newReplies[comment.id] = [
            ...(newReplies[comment.id] || []),
            ...newReplyIds.map(id => ({
              id,
              seen: false
            }))
          ];
          foundNewReplies = true;
        }
      }
    });

    // Send updates to client
    clients.forEach(client => {
      client.postMessage({
        type: 'updateCommentTracker',
        data: {
          trackerData,
          newReplies,
          unreadCount: Object.values(newReplies)
            .reduce((count, replies) => count + replies.filter(r => !r.seen).length, 0),
          isFirstLoad: false // Never treat as first load
        }
      });
    });

  } catch (error) {
    console.error('Service Worker: Error in checkUserComments:', error);
  }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { type, username } = event.data;
  console.log('Service Worker: Received message:', { type, username, time: new Date().toISOString() });
  
  if (type === 'startTracking') {
    console.log('Service Worker: Starting tracking for', username);
    currentUsername = username;
    // Only set as initial load if we haven't seen this username before
    if (!initialLoadMap.has(username)) {
      initialLoadMap.set(username, false);
    }
    
    try {
      await checkUserComments();
      
      if (!checkInterval) {
        console.log('Service Worker: Setting up interval checks');
        checkInterval = setInterval(() => {
          console.log('Service Worker: Running scheduled check');
          checkUserComments();
        }, CHECK_INTERVAL);
      }
    } catch (error) {
      console.error('Service Worker: Error in message handler:', error);
    }
  } else if (type === 'stopTracking') {
    currentUsername = null;
    stopTracking();
  } else if (type === 'START_REPLY_CHECK') {
    startReplyCheck(username);
  } else if (type === 'STOP_REPLY_CHECK') {
    stopReplyCheck();
  }
});

function stopTracking() {
  if (checkInterval) {
    console.log('Service Worker: Stopping tracking');
    clearInterval(checkInterval);
    checkInterval = null;
    
    // Notify client to clear stored data
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'clearCommentTracker'
        });
      });
    });
  }
}

async function startReplyCheck(username) {
  // Initial load of tracker data
  const trackerData = JSON.parse(localStorage.getItem('hn-comment-tracker') || '{"comments":[], "lastSeenReplies":{}}');
  
  checkInterval = setInterval(async () => {
    // Get all comment IDs to check
    const allIds = trackerData.comments.reduce((ids, comment) => 
      [...ids, comment.id, ...comment.replyIds], []);

    // Fetch latest replies
    const response = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?tags=comment&numericFilters=created_at_i>0&filters=objectID:${allIds.join(' OR objectID:')}`
    );
    const result = await response.json();

    // Check for new replies
    const newReplies = {};
    result.hits.forEach(comment => {
      const parentComment = trackerData.comments.find(c => c.replyIds.includes(comment.objectID));
      if (parentComment && comment.author !== username) {
        if (!trackerData.lastSeenReplies[parentComment.id]?.includes(comment.objectID)) {
          if (!newReplies[parentComment.id]) {
            newReplies[parentComment.id] = [];
          }
          newReplies[parentComment.id].push({
            id: comment.objectID,
            seen: false
          });
        }
      }
    });

    // Update localStorage if new replies found
    if (Object.keys(newReplies).length > 0) {
      localStorage.setItem('hn-new-replies', JSON.stringify(newReplies));
      localStorage.setItem('hn-unread-count', Object.values(newReplies)
        .reduce((count, replies) => count + replies.filter(r => !r.seen).length, 0)
      );
    }
  }, 30000); // Check every 30 seconds
}

function stopReplyCheck() {
  if (checkInterval) {
    clearInterval(checkInterval);
  }
} 