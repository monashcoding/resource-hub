import { describe, it, expect } from 'vitest';
import { buildTree, isPubliclyVisible, type RegionRow, type CategoryRow, type ResourceRow } from './tree.js';

const now = new Date();

function region(over: Partial<RegionRow> & { id: number; slug: string }): RegionRow {
  return {
    name: over.slug,
    blurb: '',
    sortOrder: 0,
    visible: true,
    createdAt: now,
    updatedAt: now,
    ...over,
  } as RegionRow;
}

function category(over: Partial<CategoryRow> & { id: number; regionId: number; slug: string }): CategoryRow {
  return {
    name: over.slug,
    description: '',
    sortOrder: 0,
    visible: true,
    createdAt: now,
    updatedAt: now,
    ...over,
  } as CategoryRow;
}

function resource(over: Partial<ResourceRow> & { id: number; categoryId: number }): ResourceRow {
  return {
    title: `r${over.id}`,
    url: 'https://example.com',
    description: '',
    type: 'other',
    tags: [],
    sortOrder: 0,
    status: 'published',
    submittedByMacUserId: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  } as ResourceRow;
}

const regions = [region({ id: 1, slug: 'alpha', sortOrder: 20 }), region({ id: 2, slug: 'beta', sortOrder: 10 })];
const categories = [category({ id: 10, regionId: 1, slug: 'cat' })];

describe('buildTree — public payload', () => {
  const opts = { includeHidden: false };

  it('orders regions, categories and resources by sortOrder', () => {
    const tree = buildTree(
      regions,
      [category({ id: 11, regionId: 1, slug: 'second', sortOrder: 20 }), category({ id: 10, regionId: 1, slug: 'first', sortOrder: 10 })],
      [
        resource({ id: 100, categoryId: 10, sortOrder: 20 }),
        resource({ id: 101, categoryId: 10, sortOrder: 10 }),
      ],
      opts,
    );
    expect(tree.regions.map((r) => r.slug)).toEqual(['beta', 'alpha']);
    const alpha = tree.regions.find((r) => r.slug === 'alpha')!;
    expect(alpha.categories.map((c) => c.slug)).toEqual(['first', 'second']);
    expect(alpha.categories[0]!.resources.map((r) => r.id)).toEqual([101, 100]);
  });

  // The core guarantee: nothing unvetted, hidden or archived can reach a visitor.
  it.each([
    ['hidden', { status: 'hidden' as const }],
    ['pending (a v2 community submission)', { status: 'pending' as const }],
    ['rejected', { status: 'rejected' as const }],
    ['archived', { archivedAt: now }],
  ])('excludes %s resources', (_label, over) => {
    const tree = buildTree(regions, categories, [resource({ id: 100, categoryId: 10, ...over })], opts);
    expect(tree.regions.find((r) => r.slug === 'alpha')!.categories[0]!.resources).toEqual([]);
  });

  it('excludes hidden categories and hidden regions entirely', () => {
    const hiddenCat = buildTree(regions, [category({ id: 10, regionId: 1, slug: 'cat', visible: false })], [], opts);
    expect(hiddenCat.regions.find((r) => r.slug === 'alpha')!.categories).toEqual([]);

    const hiddenRegion = buildTree([region({ id: 1, slug: 'alpha', visible: false })], categories, [], opts);
    expect(hiddenRegion.regions).toEqual([]);
  });

  it('never leaks the status field to the public payload', () => {
    const tree = buildTree(regions, categories, [resource({ id: 100, categoryId: 10 })], opts);
    const published = tree.regions.find((r) => r.slug === 'alpha')!.categories[0]!.resources[0]!;
    expect(published).not.toHaveProperty('status');
    expect(published).not.toHaveProperty('archived');
  });

  it('counts only live resources in resourceCount', () => {
    const tree = buildTree(
      regions,
      categories,
      [
        resource({ id: 100, categoryId: 10 }),
        resource({ id: 101, categoryId: 10, status: 'hidden' }),
        resource({ id: 102, categoryId: 10, archivedAt: now }),
      ],
      opts,
    );
    expect(tree.regions.find((r) => r.slug === 'alpha')!.resourceCount).toBe(1);
  });
});

describe('buildTree — admin payload', () => {
  const opts = { includeHidden: true };

  it('includes hidden and archived rows, annotated', () => {
    const tree = buildTree(
      [region({ id: 1, slug: 'alpha', visible: false })],
      [category({ id: 10, regionId: 1, slug: 'cat', visible: false })],
      [resource({ id: 100, categoryId: 10, status: 'hidden' }), resource({ id: 101, categoryId: 10, archivedAt: now })],
      opts,
    );
    const alpha = tree.regions[0]!;
    expect(alpha.visible).toBe(false);
    expect(alpha.categories[0]!.visible).toBe(false);
    expect(alpha.categories[0]!.resources).toHaveLength(2);
    expect(alpha.categories[0]!.resources[0]!.status).toBe('hidden');
    expect(alpha.categories[0]!.resources[1]!.archived).toBe(true);
  });

  it('still reports resourceCount as what the public would see', () => {
    const tree = buildTree(regions, categories, [resource({ id: 100, categoryId: 10, status: 'hidden' })], opts);
    expect(tree.regions.find((r) => r.slug === 'alpha')!.resourceCount).toBe(0);
  });
});

// ── The single visibility rule ───────────────────────────────────────────────
// buildTree is where this rule is applied; isPubliclyVisible is the rule itself.
// If these tests pass and buildTree calls it, no unvetted row can reach a
// visitor — which is the one thing in this codebase that must never regress.

describe('isPubliclyVisible', () => {
  it('accepts a published, un-archived resource', () => {
    expect(isPubliclyVisible({ status: 'published', archivedAt: null })).toBe(true);
  });

  it.each(['hidden', 'pending', 'rejected'] as const)('rejects a %s resource', (status) => {
    expect(isPubliclyVisible({ status, archivedAt: null })).toBe(false);
  });

  it('rejects an archived resource even when it is published', () => {
    expect(isPubliclyVisible({ status: 'published', archivedAt: now })).toBe(false);
  });

  it('rejects a resource that is both hidden and archived', () => {
    expect(isPubliclyVisible({ status: 'hidden', archivedAt: now })).toBe(false);
  });
});
