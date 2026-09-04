import { describe, it, expect } from 'vitest';
import { slugify, normaliseTags, resourceCreateSchema } from './validate.js';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Resume Prep')).toBe('resume-prep');
    expect(slugify('Internships & Careers')).toBe('internships-careers');
  });

  it('trims stray separators', () => {
    expect(slugify('  --Where to Find Internships!  ')).toBe('where-to-find-internships');
  });
});

describe('normaliseTags', () => {
  it('lowercases, trims, de-duplicates and drops empties', () => {
    expect(normaliseTags([' Leetcode', 'leetcode', '', '  ', 'Free'])).toEqual(['free', 'leetcode']);
  });
});

describe('resourceCreateSchema', () => {
  const base = { categoryId: 1, title: 'A guide', url: 'https://example.com/x' };

  it('accepts a valid https resource and defaults status to published', () => {
    const parsed = resourceCreateSchema.parse(base);
    expect(parsed.status).toBe('published');
    expect(parsed.type).toBe('other');
  });

  it('rejects http and non-URLs', () => {
    expect(resourceCreateSchema.safeParse({ ...base, url: 'http://example.com' }).success).toBe(false);
    expect(resourceCreateSchema.safeParse({ ...base, url: 'not a url' }).success).toBe(false);
  });

  // pending/rejected exist in the DB for v2 submissions but must not be
  // reachable from the committee admin.
  it('refuses to let the admin set pending or rejected', () => {
    expect(resourceCreateSchema.safeParse({ ...base, status: 'pending' }).success).toBe(false);
    expect(resourceCreateSchema.safeParse({ ...base, status: 'rejected' }).success).toBe(false);
  });
});
