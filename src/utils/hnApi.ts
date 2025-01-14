import { HNItem } from '../types/hn';

export const fetchItem = async (id: number, signal?: AbortSignal): Promise<HNItem> => {
  try {
    const response = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal });
    return await response.json();
  } catch (error: unknown) {
    throw error;
  }
};

export const fetchMaxItem = async (signal?: AbortSignal) => {
  const response = await fetch('https://hacker-news.firebaseio.com/v0/maxitem.json', {
    signal
  });
  return response.json();
};

export const isValidItem = (item: HNItem) => {
  return item && 
    (item.type === 'story' || item.type === 'comment') && 
    item.by && 
    item.text !== '[deleted]' && 
    item.text !== '[dead]' &&
    !item.dead;
}; 