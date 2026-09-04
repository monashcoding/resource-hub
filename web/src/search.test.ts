import { describe, it, expect } from 'vitest';
import { filterCategory } from './search.js';
import type { TreeCategory, TreeResource } from './types.js';

function resource(over: Partial<TreeResource> & { id: number }): TreeResource {
  return {
    title: `Resource ${over.id}`,
    url: 'https://example.com',
    description: '',
    type: 'other',
    tags: [],
    sortOrder: 0,
    ...over,
  };
}

function category(resources: TreeResource[]): TreeCategory {
  return { id: 1, slug: 'interview-prep', name: 'Interview Prep', description: '', sortOrder: 10, resources };
}

const items = [
  resource({ id: 1, title: 'LeetCode', description: 'Practice problems', tags: ['free', 'interview'] }),
  resource({ id: 2, title: 'Pramp', description: 'Peer mock interviews', tags: ['free'] }),
  resource({ id: 3, title: 'Cracking the Coding Interview', description: 'The classic book', tags: ['book'] }),
];

describe('filterCategory', () => {
  it('returns the category untouched when the query is empty', () => {
    const cat = category(items);
    expect(filterCategory('', cat)).toBe(cat);
  });

  it('matches on title, ignoring case', () => {
    const out = filterCategory('leetcode', category(items));
    expect(out.resources.map((r) => r.id)).toEqual([1]);
  });

  it('matches on description', () => {
    const out = filterCategory('mock', category(items));
    expect(out.resources.map((r) => r.id)).toEqual([2]);
  });

  it('matches on tags', () => {
    const out = filterCategory('free', category(items));
    expect(out.resources.map((r) => r.id)).toEqual([1, 2]);
  });

  it('matches on a partial word, not just whole words', () => {
    const out = filterCategory('interv', category(items));
    expect(out.resources.map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('returns an empty resource list when nothing matches', () => {
    expect(filterCategory('rust', category(items)).resources).toEqual([]);
  });

  // The filter must not mutate what it was given — the SPA holds one copy of the
  // tree for the whole session, so a mutating filter would permanently delete
  // resources from memory as soon as somebody typed in the search box.
  it('does not mutate the category it was given', () => {
    const cat = category(items);
    filterCategory('leetcode', cat);
    expect(cat.resources).toHaveLength(3);
  });
});
