import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Must be imported before the routers: patches Express 4 so errors thrown from
// async route handlers reach the error middleware instead of becoming unhandled
// rejections (which, on Node's default, crash the process → Traefik 502s).
import 'express-async-errors';
import express from 'express';
import { attachUser } from './auth/mac-auth.js';
import { contentRouter } from './routes/content.js';
import { adminRouter } from './routes/admin.js';
import { checkRegionArtwork } from './content/artwork-check.js';

const app = express();
app.use(express.json());

// Populate req.macUser from a mac-auth JWT when present (never rejects here) —
// the public browsing experience must work with no token at all.
app.use(attachUser);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'mac-resource-hub' });
});

// Public: the whole published tree, no auth.
app.use('/api/content', contentRouter);

// Committee/exec only.
app.use('/api/admin', adminRouter);

// Serve the built SPA (single container serving SPA + API). Compiled server
// lives at dist/server/, the SPA build at dist/web/.
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../web');
app.use(express.static(webDir));
// SPA fallback for client-side routes (/, /r/:slug, /admin) — but never /api.
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(webDir, 'index.html'));
});

// Central error handler so route handlers can `throw`.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'internal_error' });
});

// Belt-and-suspenders: never let a stray rejection take the whole service down.
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});

const port = Number(process.env.PORT ?? 3000);
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`mac-resource-hub listening on :${port}`);
    // Warn loudly if a seeded region has no artwork entry — the one invariant
    // that spans the server seed and the SPA's presentation map.
    void checkRegionArtwork();
  });
}

export { app };
