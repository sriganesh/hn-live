import { useState } from 'react';
import { getRandomAnnouncement } from '../components/common/Announcement';

interface Announcement {
  text: string;
  link: string;
}

interface Announcements {
  top: Announcement;
  bottom: Announcement;
  preComments: Announcement;
}

export function useAnnouncements() {
  const [announcements] = useState<Announcements>(() => ({
    top: getRandomAnnouncement('TOP'),
    bottom: getRandomAnnouncement('BOTTOM'),
    preComments: getRandomAnnouncement('PRECOMMENTS')
  }));

  return announcements;
} 