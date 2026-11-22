import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

interface SessionRecord {
  state: unknown;
  updatedAt: number;
  clients: Set<Response>;
}

const sessions = new Map<string, SessionRecord>();

function getOrCreateSession(sessionId: string): SessionRecord {
  const cleanId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'FAMILY';
  let record = sessions.get(cleanId);
  if (!record) {
    record = {
      state: null,
      updatedAt: 0,
      clients: new Set<Response>(),
    };
    sessions.set(cleanId, record);
  }
  return record;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Get current state for a hall session
  app.get('/api/session/:id', (req: Request, res: Response) => {
    const id = String(req.params.id || 'FAMILY');
    const record = getOrCreateSession(id);
    res.json({
      sessionId: id,
      state: record.state,
      updatedAt: record.updatedAt,
    });
  });

  // Publish new state from Caller Console and fan out via SSE
  app.post('/api/session/:id', (req: Request, res: Response) => {
    const id = String(req.params.id || 'FAMILY');
    const record = getOrCreateSession(id);
    const incoming = req.body?.state;
    if (!incoming || typeof incoming !== 'object') {
      res.status(400).json({ error: 'Invalid state payload' });
      return;
    }

    record.state = incoming;
    record.updatedAt = Date.now();

    const payload = `data: ${JSON.stringify({ state: record.state, updatedAt: record.updatedAt })}\n\n`;
    for (const client of record.clients) {
      try {
        client.write(payload);
      } catch {
        record.clients.delete(client);
      }
    }

    res.json({ ok: true, updatedAt: record.updatedAt });
  });

  // SSE stream for Player Displays (cross-device / multi-screen)
  app.get('/api/session/:id/stream', (req: Request, res: Response) => {
    const id = String(req.params.id || 'FAMILY');
    const record = getOrCreateSession(id);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    record.clients.add(res);

    if (record.state) {
      res.write(`data: ${JSON.stringify({ state: record.state, updatedAt: record.updatedAt })}\n\n`);
    }

    const heartbeat = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(heartbeat);
        record.clients.delete(res);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      record.clients.delete(res);
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Family Bingo Hall server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
