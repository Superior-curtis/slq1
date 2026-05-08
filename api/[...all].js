import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function handler(req, res) {
  // Check if it's a real file request
  const filePath = path.join(__dirname, '../dist/public', req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      // It's a file, let Vercel serve it
      return res.status(404).end('File should be served statically');
    }
  } catch (e) {
    // File doesn't exist, continue
  }
  
  // For all routes, serve index.html for SPA routing
  const indexPath = path.join(__dirname, '../dist/public/index.html');
  try {
    const html = fs.readFileSync(indexPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(html);
  } catch (e) {
    res.status(500).json({ error: 'Could not load app' });
  }
}
