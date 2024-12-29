# HN Live

A real-time terminal interface for Hacker News. Watch stories and discussions unfold live as they happen.

## What is this?

HN Live shows you what's happening on Hacker News right now. Instead of refreshing the homepage every few minutes, you can see new stories and comments appear instantly in a clean terminal-like interface.

## Features

- Live feed of new stories and comments
- Three themes to choose from:
  - Classic HN orange
  - Dark mode
  - Terminal green (for that retro feel)
- Works great on mobile and desktop
- Live search (grep) to filter content
- Auto-scrolling (can be toggled)
- Click on stories to view them without leaving the site
- Keyboard shortcuts for power users
- Choose between viewing stories in our UI or going straight to HN

## URL Structure

The site supports direct links to stories and comments:

- Home feed: `/`
- Story view: `/item/123`
- Comment view: `/item/123/comment/456`

You can share these URLs directly and they will load the appropriate content.

## Keyboard Shortcuts

- `⌘/Ctrl + S` - Start/Stop the feed
- `⌘/Ctrl + L` - Clear the screen
- `⌘/Ctrl + F` - Search/Filter content
- `ESC` - Close story view

## Development

```bash
# Get it running
npm install
npm run dev

# Build it
npm run build

# Try the production build
npm run preview
```

## Contributing

Found a bug? Have a feature idea? PRs are welcome! Feel free to open an issue first to discuss what you'd like to change.

## Credits

Built using:
- [Official Hacker News API](https://github.com/HackerNews/API) for real-time updates and story/comment data
- [Algolia HN Search API](https://hn.algolia.com/api) for search functionality

Not affiliated with HN/YC.

## License

MIT
