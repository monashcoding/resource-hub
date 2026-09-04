import type { TreeCategory } from './types.js';

/**
 * Filter a category's resources down to the ones matching a search query.
 *
 * Case-insensitive match across title, description and tags. An empty query
 * matches everything (the category is returned untouched).
 *
 * Pure and DOM-free so the region search box's behaviour is unit-testable
 * without rendering a page — see `web/src/search.test.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⭐ EXERCISE 6 — filtering a list, without wrecking the original
 * ─────────────────────────────────────────────────────────────────────────────
 *     npx vitest web/src/search.test.ts
 *
 * WHAT IT HAS TO DO
 * Return a category that is the same in every way except that its `resources`
 * only contains the ones matching `query`. A resource matches when the query
 * appears ANYWHERE in its title, ANYWHERE in its description, or anywhere in any
 * one of its tags — all ignoring capitals.
 *
 * If `query` is empty, return the category exactly as it came in.
 *
 * WORKED EXAMPLES — given three resources:
 *   1. 'LeetCode'                      'Practice problems'   tags: free, interview
 *   2. 'Pramp'                         'Peer mock interviews' tags: free
 *   3. 'Cracking the Coding Interview' 'The classic book'     tags: book
 *
 *   ''          → all three, and the SAME object that was passed in
 *   'leetcode'  → [1]          (matches a title, ignoring capitals)
 *   'mock'      → [2]          (matches a description)
 *   'free'      → [1, 2]       (matches a tag)
 *   'interv'    → [1, 2, 3]    (part of a word counts: tag, description, title)
 *   'rust'      → []           (an empty list, NOT null)
 *
 * THE TOOLS YOU NEED
 *
 *   `.includes()` asks whether one string appears inside another:
 *
 *       'peer mock interviews'.includes('mock');   // true
 *       'LeetCode'.includes('leetcode');           // false! capitals differ
 *
 *   ...which is why you lowercase BOTH sides before comparing. Lowercase the
 *   query once, at the top, rather than inside the loop.
 *
 *   `.filter()` builds a NEW array of the elements you say `true` to:
 *
 *       [1, 2, 3].filter((n) => n > 1);            // [2, 3]
 *
 *   `.some()` asks "is this true of AT LEAST ONE element?" — exactly the
 *   question you need for tags, since a resource has a whole list of them:
 *
 *       ['free', 'book'].some((t) => t.includes('oo'));   // true
 *
 *   `||` means "or": true when at least one side is true. You need three
 *   conditions or-ed together (title, description, tags).
 *
 *   `{ ...category, resources: <new list> }` makes a COPY of the category with
 *   `resources` swapped out and everything else (id, slug, name…) carried over.
 *   The `...` is the "spread" operator:
 *
 *       const user = { name: 'Sam', age: 19 };
 *       const older = { ...user, age: 20 };   // { name: 'Sam', age: 20 }
 *       user.age;                             // still 19 — untouched
 *
 * ⚠️  GOTCHA — this is the one that matters. Do NOT do this:
 *
 *       category.resources = category.resources.filter(...);   // ✗ WRONG
 *
 *     That REPLACES the list inside the one and only copy of the tree the app
 *     holds in memory. The non-matching resources would be gone for the rest of
 *     the session, and typing one more letter would filter the already-filtered
 *     list. Build a new object instead — the test "does not mutate the category
 *     it was given" is there to catch exactly this.
 *
 * ⚠️  GOTCHA: `if (!query)` reads as "if the query is empty". An empty string is
 *     falsy in JavaScript, so this catches `''` without comparing to anything.
 */
export function filterCategory(query: string, category: TreeCategory): TreeCategory {
  // TODO(exercise 6): return a copy of `category` whose resources match `query`.
  // Right now the search box does nothing at all — every resource always shows.
  return category;
}
