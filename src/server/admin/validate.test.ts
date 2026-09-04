import { describe, it, expect } from 'vitest';
import {
  slugify,
  normaliseTags,
  resourceCreateSchema,
  resourcePatchSchema,
  categoryCreateSchema,
  reorderSchema,
} from './validate.js';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Resume Prep')).toBe('resume-prep');
    expect(slugify('Internships & Careers')).toBe('internships-careers');
  });

  it('trims stray separators', () => {
    expect(slugify('  --Where to Find Internships!  ')).toBe('where-to-find-internships');
  });

  it('collapses a run of separators into a single hyphen', () => {
    expect(slugify('Web  Dev   101')).toBe('web-dev-101');
    expect(slugify('C++ & Data Structures')).toBe('c-data-structures');
  });

  it('keeps digits', () => {
    expect(slugify('FIT1045')).toBe('fit1045');
  });

  // Accents are decomposed by NFKD, so the base letter survives and the accent
  // mark is dropped by the a-z0-9 filter.
  it('strips accents rather than dropping the whole word', () => {
    expect(slugify('Résumé Prep')).toBe('re-sume-prep');
  });

  it('returns an empty string when there is nothing sluggable', () => {
    expect(slugify('')).toBe('');
    expect(slugify('---')).toBe('');
    expect(slugify('!!!')).toBe('');
  });

  it('never exceeds 64 characters', () => {
    expect(slugify('a'.repeat(200)).length).toBe(64);
  });
});

describe('normaliseTags', () => {
  it('lowercases, trims, de-duplicates and drops empties', () => {
    expect(normaliseTags([' Leetcode', 'leetcode', '', '  ', 'Free'])).toEqual(['free', 'leetcode']);
  });

  it('sorts alphabetically so two equivalent tag lists are stored identically', () => {
    expect(normaliseTags(['zebra', 'apple', 'Mango'])).toEqual(['apple', 'mango', 'zebra']);
  });

  it('treats tags differing only in case or spacing as one tag', () => {
    expect(normaliseTags(['Free', 'FREE', ' free '])).toEqual(['free']);
  });

  it('returns an empty array for an empty input', () => {
    expect(normaliseTags([])).toEqual([]);
    expect(normaliseTags(['', '   '])).toEqual([]);
  });

  it('does not mutate the array it was given', () => {
    const input = ['B', 'a'];
    normaliseTags(input);
    expect(input).toEqual(['B', 'a']);
  });
});

describe('resourceCreateSchema', () => {
  const base = { categoryId: 1, title: 'A guide', url: 'https://example.com/x' };

  it('accepts a valid https resource and defaults status to published', () => {
    const parsed = resourceCreateSchema.parse(base);
    expect(parsed.status).toBe('published');
    expect(parsed.type).toBe('other');
    expect(parsed.tags).toEqual([]);
    expect(parsed.description).toBe('');
  });

  // Links open in a new tab for students. http:// would be a downgrade and a
  // mixed-content warning on an https site.
  it('rejects http and non-URLs', () => {
    expect(resourceCreateSchema.safeParse({ ...base, url: 'http://example.com' }).success).toBe(false);
    expect(resourceCreateSchema.safeParse({ ...base, url: 'not a url' }).success).toBe(false);
    expect(resourceCreateSchema.safeParse({ ...base, url: 'ftp://example.com' }).success).toBe(false);
  });

  it('rejects an empty or missing title', () => {
    expect(resourceCreateSchema.safeParse({ ...base, title: '' }).success).toBe(false);
    expect(resourceCreateSchema.safeParse({ ...base, title: '   ' }).success).toBe(false);
    expect(resourceCreateSchema.safeParse({ categoryId: 1, url: base.url }).success).toBe(false);
  });

  // pending/rejected exist in the DB for v2 submissions but must not be
  // reachable from the committee admin.
  it('refuses to let the admin set pending or rejected', () => {
    expect(resourceCreateSchema.safeParse({ ...base, status: 'pending' }).success).toBe(false);
    expect(resourceCreateSchema.safeParse({ ...base, status: 'rejected' }).success).toBe(false);
    expect(resourceCreateSchema.safeParse({ ...base, status: 'hidden' }).success).toBe(true);
  });

  it('caps the number of tags', () => {
    expect(resourceCreateSchema.safeParse({ ...base, tags: Array(12).fill('x') }).success).toBe(true);
    expect(resourceCreateSchema.safeParse({ ...base, tags: Array(13).fill('x') }).success).toBe(false);
  });
});

describe('resourcePatchSchema', () => {
  it('accepts a patch with a single field', () => {
    expect(resourcePatchSchema.parse({ title: 'New title' })).toEqual({ title: 'New title' });
  });

  // A PATCH with no fields is a no-op, not an error.
  it('accepts an empty patch', () => {
    expect(resourcePatchSchema.safeParse({}).success).toBe(true);
  });

  it('applies the same https rule as create', () => {
    expect(resourcePatchSchema.safeParse({ url: 'http://example.com' }).success).toBe(false);
  });
});

describe('categoryCreateSchema', () => {
  it('defaults description to empty and visible to true', () => {
    const parsed = categoryCreateSchema.parse({ regionId: 1, name: 'Interview Prep' });
    expect(parsed.description).toBe('');
    expect(parsed.visible).toBe(true);
  });

  it('rejects a slug that is not lowercase-hyphenated', () => {
    const base = { regionId: 1, name: 'Interview Prep' };
    expect(categoryCreateSchema.safeParse({ ...base, slug: 'Interview Prep' }).success).toBe(false);
    expect(categoryCreateSchema.safeParse({ ...base, slug: 'interview_prep' }).success).toBe(false);
    expect(categoryCreateSchema.safeParse({ ...base, slug: '-interview' }).success).toBe(false);
    expect(categoryCreateSchema.safeParse({ ...base, slug: 'interview-prep' }).success).toBe(true);
  });

  it('rejects a non-positive regionId', () => {
    expect(categoryCreateSchema.safeParse({ regionId: 0, name: 'X' }).success).toBe(false);
    expect(categoryCreateSchema.safeParse({ regionId: -1, name: 'X' }).success).toBe(false);
  });
});

describe('reorderSchema', () => {
  it('accepts a list of positive integer ids', () => {
    expect(reorderSchema.parse({ ids: [3, 1, 2] })).toEqual({ ids: [3, 1, 2] });
    expect(reorderSchema.safeParse({ ids: [] }).success).toBe(true);
  });

  it('rejects ids that are not positive integers', () => {
    expect(reorderSchema.safeParse({ ids: [1, 0] }).success).toBe(false);
    expect(reorderSchema.safeParse({ ids: [1, 2.5] }).success).toBe(false);
    expect(reorderSchema.safeParse({ ids: ['1'] }).success).toBe(false);
  });
});
