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

/** Presentation for a slug, or a neutral card if the slug is unknown. */
export function presentationFor(slug: string): RegionPresentation {
  return REGION_PRESENTATION[slug] ?? FALLBACK;
}
