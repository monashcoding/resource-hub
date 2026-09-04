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
 * 📖 WORKED EXAMPLE — read this one, don't write it
 * ─────────────────────────────────────────────────────────────────────────────
 * This one is already finished. It's here as a worked example: a real function
 * doing a real job, small enough to follow line by line. Read it before you
 * start exercise 1, and come back to it when you want a model for how a chain
 * of small steps beats one clever step.
 *
 * WHAT IT DOES, one line at a time. Each method RETURNS A NEW STRING and leaves
 * the previous one alone, which is why they chain — the output of each line
 * feeds the next.
 *
 *   .toLowerCase()                  'Résumé Prep'  →  'résumé prep'
 *
 *       Do this FIRST. If you left it until after the next-but-one step, every
 *       capital would count as "not a lowercase letter" and get eaten:
 *       'Resume Prep' would come out as 'esume-rep'.
 *
 *   .normalize('NFKD')              'résumé prep'  →  'résumé prep'
 *
 *       Looks identical, and isn't. It splits an accented letter like `é` into
 *       TWO characters: a plain `e`, then a separate accent mark. That way the
 *       `e` survives the next step. Without it, `é` is a single character that
 *       isn't a-z, so the next step eats the whole letter and 'Café' would
 *       slugify to 'caf'.
 *
 *   .replace(/[^a-z0-9]+/g, '-')    'résumé prep'  →  're-sume-prep'
 *
 *       The interesting one. That pattern between the slashes is a REGULAR
 *       EXPRESSION — a small language for "text shaped like this":
 *
 *           [a-z0-9]     any ONE lowercase letter or digit
 *           [^a-z0-9]    any ONE character that is NOT one of those (^ = "not")
 *           +            one or more of the thing before it
 *           g            (after the closing slash) replace EVERY match
 *
 *       So: "every run of characters that isn't a letter or digit becomes a
 *       single hyphen". A run of three spaces collapses to ONE hyphen, which is
 *       why 'Web  Dev   101' gives 'web-dev-101'. Without the `g` flag only the
 *       first match would be replaced, and 'a b c' would give 'a-b c'.
 *
 *   .replace(/^-+|-+$/g, '')        're-sume-prep'  →  're-sume-prep'  (no change here)
 *
 *           ^   the very start of the string
 *           $   the very end
 *           |   or
 *
 *       So: "hyphens stuck to either end, remove them". This example has none
 *       left to remove, so nothing happens. Where it earns its keep is input
 *       with junk on the outside — the previous step leaves a hyphen on each
 *       end, and this one takes them off:
 *
 *           '  --Where to Find Internships!  '
 *               → '-where-to-find-internships-'   (after the previous step)
 *               → 'where-to-find-internships'     (after this one)
 *
 *   .slice(0, 64)                   cut it off at 64 characters
 *
 *       from index 0, up to but NOT including index 64.
 *
 * MORE EXAMPLES
 *   'Resume Prep'                      → 'resume-prep'
 *   'Internships & Careers'            → 'internships-careers'
 *   'C++ & Data Structures'            → 'c-data-structures'
 *   'FIT1045'                          → 'fit1045'
 *   '---'                              → ''            (nothing sluggable)
 *   'Résumé Prep'                      → 're-sume-prep'  ← surprising; see below
 *
 * ⚠️  Why 'Résumé Prep' becomes 're-sume-prep' and not 'resume-prep': after the
 *     normalize step the accent is its own character, sitting between the `e`
 *     and the `s`, and the next step turns ANY non-a-z0-9 character into a
 *     hyphen — including that one. (The second accent, at the end of 'résumé',
 *     sits right next to the space, so the two of them together count as one
 *     run and collapse into the single hyphen before 'prep'.) It's a rough edge
 *     of a deliberately simple rule, not a bug to fix: what matters is that a
 *     slug is stable, unique and URL-safe, and 're-sume-prep' is all three.
 *
 * TRY IT — change a line, run `npx vitest src/server/admin/validate.test.ts`,
 * and watch which tests complain. Breaking working code on purpose and reading
 * the failure is one of the fastest ways to understand what a line was for.
 * (Put it back afterwards.) Or play with the pieces on their own:
 *
 *     node -e "console.log('C++ & Data Structures'.toLowerCase().replace(/[^a-z0-9]+/g, '-'))"
 *
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/**
 * Tags are stored lowercased, trimmed, de-duplicated and never empty strings.
 *
 * Normalising on the way IN means everything downstream — searching, filtering,
 * counting — can just compare strings, with no "is `Free` the same tag as
 * `free`?" question anywhere else in the codebase.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⭐ EXERCISE 3 — cleaning up a list, and removing duplicates
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
 *   comparison function, as the `renormalise` worked example does.)
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
  // TODO(exercise 3): return the cleaned, de-duplicated, sorted list.
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
