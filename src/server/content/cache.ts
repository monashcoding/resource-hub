import { createHash } from 'node:crypto';
import { loadTree } from './tree.js';

// The public tree is read on every page load and changes only when a committee
// member edits something, so it is built once and held in memory with an ETag.
// This is what makes the map's zoom transitions instant — the SPA has the whole
// dataset before the first click, so no drill-down waits on a request.
//
// Invalidated by every admin mutation (see src/server/admin/audit.ts callers).
interface Cached {
  body: string;
  etag: string;
}

let cached: Cached | null = null;

export async function getPublicTree(): Promise<Cached> {
  if (cached) return cached;
  const tree = await loadTree({ includeHidden: false });
  const body = JSON.stringify(tree);
  const etag = `"${createHash('sha1').update(body).digest('hex')}"`;
  cached = { body, etag };
  return cached;
}

/** Drop the cached public tree. Call after ANY write to content tables. */
export function invalidatePublicTree(): void {
  cached = null;
}
