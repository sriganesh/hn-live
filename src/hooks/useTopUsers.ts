import topUsers from '../data/top-users.json';

const topUsersSet = new Set(topUsers.topUsers);

export const useTopUsers = () => {
  const isTopUser = (username: string) => topUsersSet.has(username);
  
  const getTopUserClass = (theme: 'green' | 'og' | 'dog') => 
    theme === 'green' 
      ? 'text-green-300 font-semibold' 
      : theme === 'dog'
      ? 'text-yellow-500 font-semibold'
      : 'text-[#ff6600] font-semibold';

  return { isTopUser, getTopUserClass };
}; 