import { z } from 'zod';

/**
 * Slugify a name for use as a category slug.
 *
 * A slug is the machine-readable version of a name: `"Interview Prep"` becomes
 * `"interview-prep"` — lowercase letters, digits and single hyphens, nothing
 * else. A category's slug is its stable key inside its region (two categories in
 * the same region can't share one). Region slugs, made the same way, go straight
 * into public URLs: `/r/starting-comp-sci`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⭐ EXERCISE 3 — turning a human name into a URL-safe slug
 * ─────────────────────────────────────────────────────────────────────────────
 *     npx vitest src/server/admin/validate.test.ts
 *
 * WHAT IT HAS TO DO, as a chain of small transformations. Do them in this order:
 *   1. lowercase everything
 *   2. `.normalize('NFKD')` — splits an accented letter like `é` into two
 *      characters: a plain `e`, then a separate accent mark. That way step 3
 *      keeps the `e`. Without it, `é` is a single character that isn't a-z, so
 *      step 3 eats the whole letter: 'Café' would slugify to 'caf'.
 *   3. replace every run of characters that is NOT a lowercase letter or digit
 *      with a single hyphen
 *   4. remove hyphens stuck to the very start or the very end
 *   5. cut it off at 64 characters
 *
 * WORKED EXAMPLES
 *   'Resume Prep'                     → 'resume-prep'
 *   'Internships & Careers'           → 'internships-careers'
 *   '  --Where to Find Internships!  '→ 'where-to-find-internships'
 *   'Web  Dev   101'                  → 'web-dev-101'    (a run collapses to ONE -)
 *   'C++ & Data Structures'           → 'c-data-structures'
 *   'Résumé Prep'                     → 're-sume-prep'  ← surprising; see below
 *   '---'                             → ''               (nothing sluggable)
 *   'a' repeated 200 times            → 64 characters
 *
 * THE TOOLS YOU NEED
 *
 *   Strings in JavaScript are immutable: every method RETURNS a new string and
 *   leaves the original alone. That is why you chain them:
 *
 *       'Hello World'.toLowerCase();            // 'hello world'
 *       'hi'.slice(0, 1);                       // 'h'   (from 0, up to but not including 1)
 *
 *   `.replace(pattern, 'with')` swaps matching text. The pattern here is a
 *   REGULAR EXPRESSION — a small language for "text shaped like this", written
 *   between slashes. You only need these pieces:
 *
 *       /abc/           the literal text abc
 *       [a-z0-9]        any ONE lowercase letter or digit
 *       [^a-z0-9]       any ONE character that is NOT one of those (^ = "not")
 *       +               one or more of the thing before it
 *       g               (after the closing slash) replace EVERY match, not just the first
 *       ^  $            the very start / the very end of the string
 *       |               or
 *
 *   Put together:
 *
 *       'a  b!!c'.replace(/[^a-z0-9]+/g, '-');  // 'a-b-c'
 *       '--hi--'.replace(/^-+|-+$/g, '');       // 'hi'
 *
 *   Try these yourself before writing the function. Paste them into your
 *   browser's dev console, or run one from a terminal:
 *
 *       node -e "console.log('C++ & Data Structures'.toLowerCase().replace(/[^a-z0-9]+/g, '-'))"
 *
 * ⚠️  GOTCHA: without the `g` flag only the FIRST match is replaced, so
 *     'a b c' would come out as 'a-b c'.
 *
 * ⚠️  GOTCHA: order matters. Lowercase BEFORE the `[^a-z0-9]` step, or every
 *     capital letter counts as "not a lowercase letter" and gets eaten
 *     ('Resume Prep' would come out as 'esume-rep').
 *
 * ⚠️  Why 'Résumé Prep' becomes 're-sume-prep' and not 'resume-prep': after step
 *     2 the accent is its own character sitting between the `e` and the `s`, and
 *     step 3 turns any non-a-z0-9 character into a hyphen — including that one.
 *     The trailing accent in 'Résumé' is at the end of the word, so it becomes a
 *     hyphen that step 4 then trims off. This is a rough edge of a deliberately
 *     simple rule, not something you need to fix: what matters is that the slug
 *     is stable, unique and URL-safe, and 're-sume-prep' is all three.
 */
export function slugify(input: string): string {
  // TODO(exercise 3): build the chain described above.
  // Right now the name is returned untouched, so 'Interview Prep' would go
  // straight into a URL, spaces, capitals and all.
  return input;
}

/**
 * Tags are stored lowercased, trimmed, de-duplicated and never empty strings.
 *
 * Normalising on the way IN means everything downstream — searching, filtering,
 * counting — can just compare strings, with no "is `Free` the same tag as
 * `free`?" question anywhere else in the codebase.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⭐ EXERCISE 4 — cleaning up a list, and removing duplicates
 * ─────────────────────────────────────────────────────────────────────────────
 *     npx vitest src/server/admin/validate.test.ts
 *
 * WHAT IT HAS TO DO
 * Take a list of tags a committee member typed and return a tidy version:
 *   - each tag trimmed of surrounding spaces and lowercased
 *   - tags that are empty after trimming thrown away entirely
 *   - duplicates removed (after lowercasing — 'Free' and 'free' are one tag)
 *   - the result sorted alphabetically
 *   - the array you were GIVEN left untouched
 *
 * WORKED EXAMPLES
 *   [' Leetcode', 'leetcode', '', '  ', 'Free']  → ['free', 'leetcode']
 *   ['zebra', 'apple', 'Mango']                  → ['apple', 'mango', 'zebra']
 *   ['Free', 'FREE', ' free ']                   → ['free']
 *   []                                           → []
 *
 * THE TOOLS YOU NEED
 *
 *   `.trim()` removes whitespace (spaces, tabs, newlines) from both ends of a
 *   string: `'  hi  '.trim()` is `'hi'`.
 *
 *   An empty string `''` is "falsy", so this reads as "if there is anything
 *   left after trimming":
 *
 *       if (tag) { ... }
 *
 *   A `Set` cannot hold the same value twice, which makes it the tidiest way to
 *   drop duplicates. Spread it back into an array with `[...set]`:
 *
 *       const seen = new Set<string>();
 *       seen.add('a');
 *       seen.add('a');       // no effect, it is already there
 *       [...seen];           // ['a']
 *
 *   `.sort()` with no arguments sorts strings alphabetically, which is what you
 *   want here because every tag is lowercase by the time you sort:
 *
 *       ['b', 'a'].sort();       // ['a', 'b']
 *
 *   (Worth knowing for later: bare `.sort()` compares things as TEXT, so
 *   `[10, 9].sort()` gives `[10, 9]` — '1' sorts before '9'. Numbers need a
 *   comparison function, as exercise 7 does.)
 *
 * ⚠️  GOTCHA: `.sort()` rearranges an array IN PLACE and returns that same
 *     array. Sorting `tags` directly would reorder the caller's array — one of
 *     the tests checks you don't. Sorting the fresh array you built from your
 *     Set is fine, because you own that one.
 *
 * ⚠️  GOTCHA: lowercase BEFORE putting it in the Set. A Set treats 'Free' and
 *     'free' as two different values, so de-duplicating first would not work.
 */
export function normaliseTags(tags: string[]): string[] {
  // TODO(exercise 4): return the cleaned, de-duplicated, sorted list.
  // Right now the tags are stored exactly as typed, so ' Leetcode' and
  // 'leetcode' end up as two separate tags nobody can search consistently.
  return tags;
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
