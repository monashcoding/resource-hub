import { describe, it, expect } from 'vitest';
import { REGION_PRESENTATION, presentationFor } from './regions.js';

describe('presentationFor', () => {
  it('returns the entry for a known slug', () => {
    const look = presentationFor('starting-comp-sci');
    expect(look).toBe(REGION_PRESENTATION['starting-comp-sci']);
    expect(look.art).toBe('/regions/starting-comp-sci.svg');
  });

  // A region added to the database seed but not here must still render. A card
  // in neutral grey is a design bug; a card that throws is a broken site.
  it('falls back to a neutral card for an unknown slug', () => {
    const look = presentationFor('not-a-real-region');
    expect(look.accent).toBeTruthy();
    expect(look.accentDeep).toBeTruthy();
    expect(look.area).toBe('auto');
    expect(look.art).toBeUndefined();
  });

  it('gives every known region a colour pair and a grid slot', () => {
    for (const [slug, look] of Object.entries(REGION_PRESENTATION)) {
      expect(look.accent, slug).toMatch(/^#[0-9a-f]{6}$/i);
      expect(look.accentDeep, slug).toMatch(/^#[0-9a-f]{6}$/i);
      expect(look.area, slug).toMatch(/^\d+ \/ \d+ \/ \d+ \/ \d+$/);
    }
  });

  // Two regions sharing a grid slot would silently stack on top of each other.
  it('gives no two regions the same grid slot', () => {
    const areas = Object.values(REGION_PRESENTATION).map((p) => p.area);
    expect(new Set(areas).size).toBe(areas.length);
  });
});
