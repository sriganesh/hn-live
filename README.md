# HN Live

A real-time terminal interface for Hacker News that lets you watch stories and discussions unfold live.

## What is this?

HN Live shows you what's happening on Hacker News right now. Instead of refreshing the homepage every few minutes, you can see new stories and comments appear instantly in a clean terminal-like interface.

## Features

- Live feed of new stories and comments
- Front page view with infinite scrolling
- Show HN, Ask HN, Jobs, and Best views with infinite scrolling
- Bookmark stories and comments for later reading.
- User profiles with karma history
- Flexible story viewing options:
  - Sort comments by recent first or traditional nested view
  - Choose between Algolia API (faster loading) or Firebase API
  - Fallback option if one API is experiencing issues
- Multiple font choices (system, mono, JetBrains, Fira Code, etc.)
- Adjustable font sizes for better readability
- Collapsible comment threads with reply counts
- Three themes to choose from:
  - Classic HN orange
  - Dark mode
  - Terminal green (for that retro feel)
- Works great on mobile and desktop (atleast on mine 😉)
- Live search (grep) to filter content
- Auto-scrolling (can be toggled)
- Click on stories to view them without leaving the site
- Keyboard shortcuts for power users
- Choose between viewing stories in our UI or going straight to HN

## URL Structure

The site supports direct links to stories and comments:

- Home feed: `/`
- Front page: `/front`
- Show HN: `/show`
- Ask HN: `/ask`
- Jobs: `/jobs`
- Best: `/best`
- Story view: `/item/123`
- Comment view: `/item/123/comment/456`

You can share these URLs directly and they will load the appropriate content.

## HN Live Bookmarklet

To install the bookmarklet:

1. Create a new bookmark / favorite in your browser
2. Name it "⚡ Open in HN Live"
3. Copy and paste this code as the URL:
```javascript
javascript:!function(){const t=window.location.href,n={'':"front",news:"front",show:"show",ask:"ask",jobs:"jobs",best:"best"},e=/item\?id=(\d+)/.exec(t);if(e&&e[1])return void window.open(`https://hn.live/item/${e[1]}`,"_blank");const i=new URL(t).pathname.replace("/","");return i in n?void window.open(`https://hn.live/${n[i]}`,"_blank"):void alert("This doesn't appear to be a supported Hacker News page.")}();
```

When viewing any page on news.ycombinator.com, click the bookmarklet to open that page in HN Live.

## Keyboard Shortcuts

- `⌘/Ctrl + S` - Start/Stop the feed
- `⌘/Ctrl + L` - Clear the screen
- `⌘/Ctrl + F` - Filter live feed (grep)
- `⌘/Ctrl + K` - Search all HN content
- `ESC` - Close modals or return to feed

## Development Notes

I'm primarily a backend developer who loves building things. This project started as a way to browse HN the way I personally enjoy with a clean, terminal like interface and real time updates. Viewing these real time comments has made me want to revisit threads and engage in discussions more often than I used to, which has been unexpectedly rewarding.

The design is intentionally minimalist, inspired by both HN's simplicity and old school terminal UIs. Since I'm not a designer by trade, I built it based on how I like to browse HN but I'm always open to suggestions for improvements!

What made this project possible was the amazing AI tooling available today. As someone more comfortable with backend work, tools like Claude and ChatGPT were invaluable in helping me debug frontend issues and implement UI features. They really helped bridge the gap between my backend expertise and frontend needs.

These AI tools have been game changing for someone like me  they complement my existing skills and help me ship full stack projects that I wouldn't have attempted before. While they don't replace proper engineering knowledge, they're incredible at helping you learn and implement things outside your core expertise. They're surprisingly good at helping you figure out tricky UI problems or debugging weird edge cases. Not gonna lie, without them, I probably would've given up on the frontend parts pretty early on.

Is the code perfect? Probably not. But it works, and I learned a ton building it. 

The implementation here reflects my current understanding of frontend development and the solutions I've learned along the way both through AI assistance and general research. There might be more efficient or elegant ways to accomplish some things, but I've focused on making it work reliably with the knowledge and tools at hand. I'm always learning and open to better approaches!

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

## Deployment

This project is deployed on [Cloudflare Pages](https://pages.cloudflare.com/).

## Contributing

If you find any bugs (especially with different screen sizes - I've only tested on my laptop and phone), please let me know in the issues! Would love to fix them and make this better for everyone.

Also welcome suggestions on the UI/UX. While I built it for my personal browsing style, I'm sure there are ways to make it work better for everyone while keeping the minimal aesthetic.

## Credits

Built using:
- [Official Hacker News API](https://github.com/HackerNews/API) - Thanks to HN for providing this amazing API that powers our real-time updates and story/comment data
- [Algolia HN Search API](https://hn.algolia.com/api) - Huge thanks to Algolia for their powerful search API that makes the search experience possible

Not affiliated with HN/YC.

## Acknowledgments

Special thanks to:
- [Cursor](https://cursor.com/) - Honestly, this editor is incredible! Made me feel like I had a coding buddy helping me out 24/7.
- [Claude](https://anthropic.com/claude) & [ChatGPT](https://chat.openai.com) - Sometimes I had to jump directly to them to brainstorm ideas or debug tricky errors.
- [Cloudflare Pages](https://pages.cloudflare.com/) - For making deployment super easy.
- [Wispr Flow](https://wisprflow.ai/) - An incredible voice-to-text tool helping me "type" faster.

These tools helped me build and debug this way faster than I could have imagined. They turned what could have been weeks of debugging and learning into a fun ~~weekend~~ project (it turned into several weekends because I wanted to refine and add more features). It's amazing how they can help you quickly turn ideas into working products!

## License

MIT
