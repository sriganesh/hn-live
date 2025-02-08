import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import HNLiveTerminal from "./pages/hnlive";
import { register as registerServiceWorker } from './registerServiceWorker';
import { useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';

// Add type definitions at the top
interface NewReply {
  id: string;
  seen: boolean;
}

export function App() {
  useEffect(() => {
    registerServiceWorker();

    // Global message listener for service worker
    const messageHandler = (event: MessageEvent) => {
      console.log('App: Received message:', event.data.type);
      if (event.data.type === 'updateCommentTracker') {
        console.log('App: Received comment tracker update with data:', event.data.data);
        const { trackerData, newReplies, unreadCount, isFirstLoad } = event.data.data;

        // Always update tracker data
        localStorage.setItem('hn-comment-tracker', JSON.stringify(trackerData));
        
        // Only update new replies and unread count if not first load
        if (!isFirstLoad) {
          // Merge with existing new replies to prevent overwriting
          const existingNewReplies = JSON.parse(localStorage.getItem('hn-new-replies') || '{}') as Record<string, NewReply[]>;
          const mergedNewReplies: Record<string, NewReply[]> = { ...existingNewReplies };
          
          // Add new replies while preserving existing ones and deduplicating
          Object.entries(newReplies as Record<string, NewReply[]>).forEach(([commentId, replies]) => {
            if (!mergedNewReplies[commentId]) {
              mergedNewReplies[commentId] = [];
            }
            
            // Create a Set of existing reply IDs for this comment
            const existingIds = new Set(mergedNewReplies[commentId].map((r: NewReply) => r.id));
            
            // Only add replies that don't already exist
            const uniqueNewReplies = replies.filter((reply: NewReply) => !existingIds.has(reply.id));
            
            if (uniqueNewReplies.length > 0) {
              mergedNewReplies[commentId] = [
                ...mergedNewReplies[commentId],
                ...uniqueNewReplies
              ];
            }
          });

          // Clean up any empty comment entries
          Object.keys(mergedNewReplies).forEach(commentId => {
            if (mergedNewReplies[commentId].length === 0) {
              delete mergedNewReplies[commentId];
            }
          });

          localStorage.setItem('hn-new-replies', JSON.stringify(mergedNewReplies));
          
          // Calculate total unread count from merged data
          const totalUnreadCount = Object.values(mergedNewReplies)
            .reduce((count: number, replies: NewReply[]) => {
              // Use a Set to ensure we only count each unique reply once
              const uniqueUnseenReplies = new Set(
                replies.filter((r: NewReply) => !r.seen).map((r: NewReply) => r.id)
              );
              return count + uniqueUnseenReplies.size;
            }, 0);
          
          localStorage.setItem('hn-unread-count', totalUnreadCount.toString());
        } else {
          // First load, initialize with empty values
          console.log('App: First load, initializing with empty values');
          localStorage.setItem('hn-new-replies', '{}');
          localStorage.setItem('hn-unread-count', '0');
        }
      } else if (event.data.type === 'getTrackerState') {
        // Send current state back to service worker
        const trackerData = JSON.parse(localStorage.getItem('hn-comment-tracker') || '{"comments":[]}');
        const newReplies = JSON.parse(localStorage.getItem('hn-new-replies') || '{}');
        navigator.serviceWorker.controller?.postMessage({
          type: 'trackerState',
          data: trackerData,
          newReplies
        });
      } else if (event.data.type === 'clearCommentTracker') {
        localStorage.removeItem('hn-comment-tracker');
        localStorage.setItem('hn-new-replies', '{}');
        localStorage.setItem('hn-unread-count', '0');
      }
    };

    // Add message listener
    if ('serviceWorker' in navigator) {
      console.log('App: Setting up service worker message listener');
      navigator.serviceWorker.addEventListener('message', messageHandler);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      }
    };
  }, []);

  return (
    <HelmetProvider>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HNLiveTerminal />}>
              <Route path="front" element={null} />
              <Route path="item/:itemId" element={null} />
              <Route path="item/:itemId/comment/:commentId" element={null} />
              <Route path="show" element={null} />
              <Route path="ask" element={null} />
              <Route path="jobs" element={null} />
              <Route path="best" element={null} />
              <Route path="user/:userId" element={null} />
              <Route path="bookmarks" element={null} />
              <Route path="replay/:itemId" element={null} />
              <Route path="profile" element={null} />
              <Route path="links/:itemId" element={null} />
              <Route path="feed" element={null} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </HelmetProvider>
  );
}

export default App;
