// ── Region presentation map ──────────────────────────────────────────────────
//
// INVARIANT: every `slug` here must match a slug in `src/server/db/seed.ts`.
// The database owns a region's name, blurb, order and visibility (a committee
// member can edit those). This file owns how it LOOKS on the map: its colour,
// its slot in the grid, and its artwork. That split is why regions are seeded
// rather than admin-created — a new region needs a slot and a picture, which is
// a PR, not a form.
//
// The server warns at boot about any region row missing an entry here (see
// src/server/content/artwork-check.ts), and `presentationFor` returns a neutral
// fallback so an unknown slug renders a plain card instead of nothing.

export interface RegionPresentation {
  /** Base colour for the card. */
  accent: string;
  /** Second colour for the card's gradient. */
  accentDeep: string;
  /**
   * Desktop grid placement, `grid-area: row-start / col-start / row-end / col-end`
   * on the 4x4 map grid. Deliberately irregular — a uniform grid of equal cards
   * reads as a list, not a map.
   */
  area: string;
  /** Artwork in web/public/regions/. Optional: cards work without it. */
  art?: string;
}

export const REGION_PRESENTATION: Record<string, RegionPresentation> = {
  'starting-comp-sci': {
    accent: '#4f8ef7',
    accentDeep: '#1b3d80',
    area: '1 / 1 / 3 / 3',
    art: '/regions/starting-comp-sci.svg',
  },
  'internships-careers': {
    accent: '#f7a13f',
    accentDeep: '#8a4b12',
    area: '1 / 3 / 2 / 5',
    art: '/regions/internships-careers.svg',
  },
  'postgrad-grad-jobs': {
    accent: '#3fb98c',
    accentDeep: '#155f45',
    area: '2 / 3 / 4 / 5',
    art: '/regions/postgrad-grad-jobs.svg',
  },
  'competitive-programming': {
    accent: '#b06ef7',
    accentDeep: '#4a1f80',
    area: '3 / 1 / 4 / 3',
    art: '/regions/competitive-programming.svg',
  },
};

const FALLBACK: RegionPresentation = {
  accent: '#7c8794',
  accentDeep: '#39424d',
  area: 'auto',
};

/**
 * Presentation for a slug, or a neutral card if the slug is unknown.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⭐ EXERCISE 5 — looking something up, with a safe fallback
 * ─────────────────────────────────────────────────────────────────────────────
 *     npx vitest web/src/regions.test.ts
 *
 * WHAT IT HAS TO DO
 * Look `slug` up in `REGION_PRESENTATION` above. If there is an entry, return
 * it. If there isn't — someone added a region to the database seed but not to
 * this file — return `FALLBACK` so the region still renders, just in grey.
 *
 * The point of this one is the fallback. A missing entry is a design bug worth
 * fixing; a crash on the home page is an outage. Given the choice, degrade.
 *
 * WORKED EXAMPLES
 *   presentationFor('starting-comp-sci')   → the blue entry defined above
 *   presentationFor('not-a-real-region')   → FALLBACK (grey, area 'auto')
 *
 * THE TOOLS YOU NEED
 *
 *   `REGION_PRESENTATION` is an object used as a lookup table. Square brackets
 *   read a key whose name you have in a variable:
 *
 *       const colours = { red: '#f00', blue: '#00f' };
 *       colours.red;         // '#f00'   — when you know the key as you type
 *       colours['red'];      // '#f00'   — the same thing
 *       const key = 'blue';
 *       colours[key];        // '#00f'   — when the key is in a variable
 *       colours['green'];    // undefined — no such key. NOT an error, just undefined.
 *
 *   `??` is the "nullish coalescing" operator: use the left side unless it is
 *   `null` or `undefined`, in which case use the right side.
 *
 *       undefined ?? 'backup';   // 'backup'
 *       '#f00'    ?? 'backup';   // '#f00'
 *
 *   So the whole function is one `return` with a `??` in it.
 *
 * ⚠️  GOTCHA: don't reach for `||` here. `||` falls back on ANY falsy value —
 *     `0`, `''`, `false` — which is a bug waiting to happen the day a legitimate
 *     value is one of those. `??` only falls back on null/undefined, which is
 *     what "there was no entry" actually means.
 */
export function presentationFor(slug: string): RegionPresentation {
  // TODO(exercise 5): return the entry for `slug`, falling back to FALLBACK.
  // Right now every region on the map is drawn in the same neutral grey.
  return FALLBACK;
}
