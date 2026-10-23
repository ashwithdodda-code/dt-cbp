import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/routes.js';
import { getDb } from './server/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize SQLite database
  await getDb();
  console.log('[AI-HRO] SQLite persistent database initialized successfully.');

  app.use(express.json());

  // Mount REST API routes
  app.use('/api', apiRouter);

  // In development, hook Vite's dev server middleware
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[AI-HRO] Vite middleware connected in development mode.');
  } else {
    // In production, serve built static assets from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI-HRO] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[AI-HRO] Failed to start server:', err);
  process.exit(1);
});
