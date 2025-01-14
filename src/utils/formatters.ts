import { HNItem } from '../types/hn';

export const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return {
    time: date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
    fullDate: date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  };
};

export const formatItem = async (item: HNItem, showCommentParents: boolean) => {
  if (!item.by || 
      (item.type === 'comment' && !item.text) || 
      item.text === '[delayed]') return null;

  let text = '';
  let links = {
    main: '',
    comments: ''
  };
  let parentStory = null;
  
  // Update the user link to use our modal instead of direct HN link
  const userLink = `<a 
    href="#"
    class="hn-username hover:underline"
    data-username="${item.by}"
    onclick="event.preventDefault(); event.stopPropagation(); window.dispatchEvent(new CustomEvent('viewUser', { detail: '${item.by}' }))"
  >${item.by}</a>`;
  
  if (item.type === 'comment') {
    // Fetch parent story if needed
    if (showCommentParents && item.parent) {
      try {
        let currentParent = await fetch(`https://hacker-news.firebaseio.com/v0/item/${item.parent}.json`).then(r => r.json());
        
        // Keep going up until we find the root story
        while (currentParent.type === 'comment' && currentParent.parent) {
          currentParent = await fetch(`https://hacker-news.firebaseio.com/v0/item/${currentParent.parent}.json`).then(r => r.json());
        }
        
        if (currentParent.type === 'story') {
          parentStory = currentParent;
        }
      } catch (error) {
        console.error('Error fetching parent story:', error);
      }
    }

    // First show the comment with the username
    text = `${userLink}: ${item.text?.replace(/<[^>]*>/g, '')}`;
    
    // Then add the parent story info if available
    if (parentStory) {
      text += ` <span class="opacity-50">| re: </span><a href="https://news.ycombinator.com/item?id=${parentStory.id}" 
        class="opacity-75 hover:opacity-100"
        target="_blank"
        rel="noopener noreferrer"
        onclick="event.stopPropagation()"
      >${parentStory.title}</a>`;
    }
    
    links.main = `https://news.ycombinator.com/item?id=${item.id}`;
    links.comments = ''; 
  } else if (item.type === 'story') {
    text = `${userLink}: ${item.title || '[untitled]'}`;
    links.main = item.url || `https://news.ycombinator.com/item?id=${item.id}`;
    links.comments = `https://news.ycombinator.com/item?id=${item.id}`;
  }
  
  return {
    timestamp: formatTimestamp(item.time),
    text,
    links
  };
}; 