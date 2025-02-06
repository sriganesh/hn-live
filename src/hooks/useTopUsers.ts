import topUsers from '../data/top-users.json';

const topUsersSet = new Set(topUsers.topUsers);

export const useTopUsers = () => {
  const isTopUser = (username: string) => topUsersSet.has(username);
  
  const getTopUserClass = (theme: 'green' | 'og' | 'dog') => 
    theme === 'green' 
      ? 'text-green-300'
      : theme === 'dog'
      ? 'text-yellow-500'
      : 'text-[#ff6600]';

  return { isTopUser, getTopUserClass };
}; 