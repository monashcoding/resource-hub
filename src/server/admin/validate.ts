import { z } from 'zod';

/** Slugify a name for use as a category slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/** Tags are stored lowercased, trimmed, de-duplicated and never empty strings. */
export function normaliseTags(tags: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (tag) seen.add(tag);
  }
  return [...seen].sort();
}

// Links are shown to students and open in a new tab — http:// would be a
// downgrade and a mixed-content warning, so only https is accepted.
const httpsUrl = z
  .string()
  .trim()
  .url()
  .refine((u) => u.startsWith('https://'), { message: 'URL must start with https://' });

const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase words separated by hyphens')
  .max(64);

export const regionPatchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  blurb: z.string().trim().max(240).optional(),
  sortOrder: z.number().int().optional(),
  visible: z.boolean().optional(),
});

export const categoryCreateSchema = z.object({
  regionId: z.number().int().positive(),
  name: z.string().trim().min(1).max(80),
  slug: slug.optional(),
  description: z.string().trim().max(400).default(''),
  visible: z.boolean().default(true),
});

export const categoryPatchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  slug: slug.optional(),
  description: z.string().trim().max(400).optional(),
  visible: z.boolean().optional(),
});

export const resourceCreateSchema = z.object({
  categoryId: z.number().int().positive(),
  title: z.string().trim().min(1).max(160),
  url: httpsUrl,
  description: z.string().trim().max(400).default(''),
  type: z.enum(['course', 'article', 'tool', 'community', 'video', 'other']).default('other'),
  tags: z.array(z.string()).max(12).default([]),
  // The MVP admin only ever sets these two. `pending`/`rejected` exist in the
  // database for v2 submissions and are intentionally not settable here.
  status: z.enum(['published', 'hidden']).default('published'),
});

export const resourcePatchSchema = z.object({
  categoryId: z.number().int().positive().optional(),
  title: z.string().trim().min(1).max(160).optional(),
  url: httpsUrl.optional(),
  description: z.string().trim().max(400).optional(),
  type: z.enum(['course', 'article', 'tool', 'community', 'video', 'other']).optional(),
  tags: z.array(z.string()).max(12).optional(),
  status: z.enum(['published', 'hidden']).optional(),
});

/** Reorder payload: the full ordered list of ids for the parent. */
export const reorderSchema = z.object({
  ids: z.array(z.number().int().positive()).max(500),
});
