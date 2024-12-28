import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// ES Module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generateSitemap = () => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://hn.live/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

  fs.writeFileSync(
    join(__dirname, '../public/sitemap.xml'),
    sitemap
  );
};

generateSitemap(); 