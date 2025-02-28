/**
 * Displays a friendly greeting in the console for developers
 */
export const showConsoleGreeting = (): void => {
  const styles = [
    'color: #ff6600',
    'font-size: 20px',
    'font-weight: bold',
    'padding: 10px',
  ].join(';');

  const secondaryStyles = [
    'color: #828282',
    'font-size: 14px',
    'padding: 5px',
  ].join(';');

  console.log('%c👋 Hello fellow hacker!', styles);
  console.log(
    '%c💡 Have ideas for making HN Live faster/better? Let me know!', 
    secondaryStyles
  );
  console.log(
    '%c🐛 Found a bug? Want to add a feature? PRs are welcome!', 
    secondaryStyles
  );
  console.log(
    '%c🌟 HN Live is open source: https://github.com/sriganesh/hn-live', 
    secondaryStyles
  );
}; 