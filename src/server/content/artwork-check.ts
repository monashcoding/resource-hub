import { db } from '../db/index.js';
import { regions } from '../db/schema.js';
import { REGION_SEED } from '../db/seed.js';

/**
 * Boot-time guard for the one invariant that spans server and client: every
 * region row must have a matching presentation entry (colour, grid slot,
 * artwork) keyed on the same `slug` in `web/src/regions.ts`.
 *
 * The server cannot import the SPA module, so it checks against the seed list —
 * which is the same list `web/src/regions.ts` must mirror. A mismatch here means
 * someone added a region on one side only. The SPA still renders a neutral
 * fallback card, so this warns rather than crashes; a missing card is a design
 * bug, not a reason to take the site down.
 */
export async function checkRegionArtwork(): Promise<void> {
  try {
    const known = new Set<string>(REGION_SEED.map((r) => r.slug));
    const rows = await db.select({ slug: regions.slug }).from(regions);
    const orphans = rows.map((r) => r.slug).filter((slug) => !known.has(slug));
    if (orphans.length > 0) {
      console.warn(
        `[artwork] ${orphans.length} region(s) have no seed/presentation entry and will render ` +
          `a fallback card: ${orphans.join(', ')}. Add them to src/server/db/seed.ts and ` +
          `web/src/regions.ts (same slug), with artwork at web/public/regions/<slug>.svg.`,
      );
    }
  } catch (err) {
    console.warn('[artwork] could not verify region artwork coverage:', err);
  }
}
