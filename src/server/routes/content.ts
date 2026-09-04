import { Router } from 'express';
import { getPublicTree } from '../content/cache.js';

export const contentRouter: Router = Router();

/**
 * The entire published tree in one response. The SPA fetches this once on load
 * and every drill-down is local state after that — which is what keeps the map's
 * zoom transitions free of a loading spinner.
 */
contentRouter.get('/', async (req, res) => {
  const { body, etag } = await getPublicTree();
  res.setHeader('ETag', etag);
  // Short max-age only: a committee edit should show up on the next reload, and
  // the ETag makes the revalidation cheap.
  res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }
  res.type('application/json').send(body);
});
