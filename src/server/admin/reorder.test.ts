import { describe, it, expect } from 'vitest';
import { renormalise, nextSortOrder } from './reorder.js';

const current = [
  { id: 1, sortOrder: 10 },
  { id: 2, sortOrder: 20 },
  { id: 3, sortOrder: 30 },
];

describe('renormalise', () => {
  it('renumbers a full reordering to 10, 20, 30', () => {
    const result = renormalise([3, 1, 2], current);
    expect(result).toEqual({
      ok: true,
      updates: [
        { id: 3, sortOrder: 10 },
        { id: 1, sortOrder: 20 },
        { id: 2, sortOrder: 30 },
      ],
    });
  });

  it('appends siblings the client did not know about, keeping their order', () => {
    const result = renormalise([3, 1], current);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.updates.map((u) => u.id)).toEqual([3, 1, 2]);
  });

  it('rejects ids that do not belong to the parent', () => {
    expect(renormalise([1, 2, 99], current)).toEqual({
      ok: false,
      reason: 'unknown_ids',
      unknown: [99],
    });
  });

  it('tolerates a duplicated id without emitting it twice', () => {
    const result = renormalise([2, 2, 1, 3], current);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.updates.map((u) => u.id)).toEqual([2, 1, 3]);
  });
});

describe('nextSortOrder', () => {
  it('places a new item after the current last', () => {
    expect(nextSortOrder(current)).toBe(40);
  });

  it('starts at 10 for an empty parent', () => {
    expect(nextSortOrder([])).toBe(10);
  });
});
