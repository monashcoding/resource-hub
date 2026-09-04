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

  it('always starts at 10 and steps by 10, however messy the input order was', () => {
    const messy = [
      { id: 7, sortOrder: 3 },
      { id: 8, sortOrder: 999 },
      { id: 9, sortOrder: 3 },
    ];
    const result = renormalise([9, 8, 7], messy);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.updates).toEqual([
      { id: 9, sortOrder: 10 },
      { id: 8, sortOrder: 20 },
      { id: 7, sortOrder: 30 },
    ]);
  });

  it('appends siblings the client did not know about, keeping their order', () => {
    const result = renormalise([3, 1], current);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.updates.map((u) => u.id)).toEqual([3, 1, 2]);
  });

  // Two committee members with the page open at once: the one who saves second
  // sends a list missing whatever the first one added. Those rows must survive.
  it('appends several unknown-to-the-client siblings in their current order', () => {
    const result = renormalise([3], current);
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

  it('reports every unknown id, not just the first', () => {
    const result = renormalise([99, 1, 98], current);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.unknown).toEqual([99, 98]);
  });

  it('tolerates a duplicated id without emitting it twice', () => {
    const result = renormalise([2, 2, 1, 3], current);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.updates.map((u) => u.id)).toEqual([2, 1, 3]);
  });

  it('handles an empty request by keeping the existing order', () => {
    const result = renormalise([], current);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.updates.map((u) => u.id)).toEqual([1, 2, 3]);
  });

  it('handles an empty parent', () => {
    expect(renormalise([], [])).toEqual({ ok: true, updates: [] });
  });

  it('does not mutate the current rows it was given', () => {
    const rows = [
      { id: 1, sortOrder: 10 },
      { id: 2, sortOrder: 20 },
    ];
    renormalise([2, 1], rows);
    expect(rows).toEqual([
      { id: 1, sortOrder: 10 },
      { id: 2, sortOrder: 20 },
    ]);
  });
});

describe('nextSortOrder', () => {
  it('places a new item after the current last', () => {
    expect(nextSortOrder(current)).toBe(40);
  });

  it('starts at 10 for an empty parent', () => {
    expect(nextSortOrder([])).toBe(10);
  });

  // Rows are not necessarily handed to us in order, so "the last one" means the
  // biggest sortOrder, not the final element of the array.
  it('uses the largest sortOrder, not the last element', () => {
    expect(nextSortOrder([{ id: 1, sortOrder: 90 }, { id: 2, sortOrder: 20 }])).toBe(100);
  });
});
