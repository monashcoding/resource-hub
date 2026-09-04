export interface Positioned {
  id: number;
  sortOrder: number;
}

export type ReorderResult =
  | { ok: true; updates: Positioned[] }
  | { ok: false; reason: 'unknown_ids'; unknown: number[] };

/**
 * Turn a client-supplied ordering into absolute `sortOrder` values.
 *
 * The client always PUTs the FULL ordered list of sibling ids, so there is no
 * fractional-index or gap-management cleverness to get wrong — positions are
 * simply renumbered 10, 20, 30… on every save.
 *
 * Ids that exist but were omitted from the request (e.g. a sibling another
 * committee member added while this admin page was open) are appended in their
 * current order rather than dropped. Ids that do not belong to the parent are an
 * error, not something to silently ignore.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⭐ EXERCISE 7 — the boss level. Do the other six first.
 * ─────────────────────────────────────────────────────────────────────────────
 *     npx vitest src/server/admin/reorder.test.ts
 *
 * WHAT IT HAS TO DO, in four steps. Write one step, run the tests, then write
 * the next. Do NOT try to write all four at once.
 *
 * STEP A — reject ids that don't belong here.
 *   Any id in `requestedIds` that is not the id of a row in `current` is a bug
 *   in the caller, not something to quietly skip. Collect ALL of them (the test
 *   "reports every unknown id, not just the first" checks this) and, if there is
 *   at least one, return:
 *       { ok: false, reason: 'unknown_ids', unknown: <the array you collected> }
 *
 * STEP B — build the final order, ignoring repeats.
 *   Walk `requestedIds` in order and collect the ids into a new array, skipping
 *   any id you have already collected. Input [2, 2, 1, 3] gives [2, 1, 3].
 *
 * STEP C — append the ones the client didn't mention.
 *   Any row in `current` whose id is not yet in your array goes on the end, in
 *   `sortOrder` order (ties broken by `id`, so the result never depends on luck).
 *   This is the step that stops a second committee member's new row vanishing.
 *
 * STEP D — hand out the numbers.
 *   Turn your ordered list of ids into `{ id, sortOrder }` objects numbered
 *   10, 20, 30, 40… and return { ok: true, updates: <that array> }.
 *
 * WORKED EXAMPLE
 *   current      = [ {id:1,sortOrder:10}, {id:2,sortOrder:20}, {id:3,sortOrder:30} ]
 *   requestedIds = [3, 1]
 *
 *   Step A: 3 and 1 are both known  → carry on
 *   Step B: ordered = [3, 1]
 *   Step C: row 2 was not mentioned → ordered = [3, 1, 2]
 *   Step D: → [ {id:3,sortOrder:10}, {id:1,sortOrder:20}, {id:2,sortOrder:30} ]
 *
 * THE TOOLS YOU NEED
 *
 *   A `Set` is a bag of values with no duplicates, and asking "is this in the
 *   bag?" is instant. Building one from an array is the normal way to answer
 *   "does this list contain X?" over and over:
 *
 *       const known = new Set([1, 2, 3]);
 *       known.has(2);        // true
 *       known.has(9);        // false
 *       known.add(9);        // now it has 9 too
 *
 *   `.map()` makes a NEW array by transforming every element:
 *
 *       [ {id: 7}, {id: 8} ].map((row) => row.id);   // [7, 8]
 *
 *   `.map()` also hands you the position as a second argument, which is how you
 *   get 10, 20, 30 (position 0 → 10, position 1 → 20, …):
 *
 *       ['a', 'b'].map((letter, i) => `${i}:${letter}`);   // ['0:a', '1:b']
 *
 *   `.filter()` makes a NEW array of only the elements you say `true` to:
 *
 *       [1, 2, 3].filter((n) => n > 1);              // [2, 3]
 *
 *   `[...array]` makes a copy of an array. `.sort()` rearranges an array IN
 *   PLACE, so sort a copy unless you mean to reorder the caller's array (a test
 *   checks you don't):
 *
 *       const copy = [...current];
 *       copy.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
 *
 *   That comparison function reads as: order by sortOrder; if two are equal
 *   (`a.sortOrder - b.sortOrder` is 0, which counts as false) fall back to id.
 *
 *   `continue` skips to the next turn of a loop:
 *
 *       for (const id of ids) {
 *         if (seen.has(id)) continue;   // already had this one, move on
 *         ...
 *       }
 *
 * ⚠️  GOTCHAS
 *   - Return the STEP A failure before doing any other work. Half-renumbering
 *     and then failing would be worse than not trying.
 *   - `unknown` must list every bad id, in the order they appeared.
 *   - Empty inputs must work: `renormalise([], [])` returns
 *     `{ ok: true, updates: [] }`, and `renormalise([], current)` keeps the
 *     existing order rather than wiping it.
 */
export function renormalise(requestedIds: number[], current: Positioned[]): ReorderResult {
  // TODO(exercise 7), step A: reject any requested id that is not in `current`.

  // TODO(exercise 7), step B: build the ordered list of ids, skipping repeats.

  // TODO(exercise 7), step C: append any id in `current` you have not used yet,
  // in sortOrder order.

  // TODO(exercise 7), step D: number them 10, 20, 30… and return them.
  // This placeholder keeps everything exactly where it already is.
  return { ok: true, updates: current.map((row) => ({ id: row.id, sortOrder: row.sortOrder })) };
}

/**
 * The sortOrder to give a newly created item so it lands at the end.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ⭐ EXERCISE 2 — finding the biggest number in a list
 * ─────────────────────────────────────────────────────────────────────────────
 *     npx vitest src/server/admin/reorder.test.ts
 *
 * WHAT IT HAS TO DO
 * Look at every row in `current`, find the LARGEST `sortOrder`, and return that
 * plus 10. If `current` is empty, return 10 — the first item on a page sits at
 * position 10, not 0, so there is always room to insert something before it.
 *
 * WORKED EXAMPLES
 *   [ {id:1,sortOrder:10}, {id:2,sortOrder:20} ]  → 30
 *   [ {id:1,sortOrder:90}, {id:2,sortOrder:20} ]  → 100   (biggest, not last!)
 *   [ ]                                           → 10
 *
 * THE TOOLS YOU NEED — either of these is a fine answer.
 *
 *   A plain loop. Start from a "best so far" of 0 and walk the list:
 *
 *       let biggest = 0;
 *       for (const row of current) {
 *         if (row.sortOrder > biggest) biggest = row.sortOrder;
 *       }
 *
 *   Or `Math.max`, which takes any number of ARGUMENTS (not an array) and
 *   returns the largest:
 *
 *       Math.max(3, 9, 4);              // 9
 *
 *   To use it on an array, spread the array into arguments with `...`:
 *
 *       Math.max(...[3, 9, 4]);         // 9   — same as Math.max(3, 9, 4)
 *       Math.max(0, ...[3, 9, 4]);      // 9   — with a floor of 0
 *
 * ⚠️  GOTCHA: the rows are NOT guaranteed to be sorted. The test "uses the
 *     largest sortOrder, not the last element" exists because reaching for
 *     `current[current.length - 1]` looks right and is wrong.
 *
 * ⚠️  GOTCHA: `Math.max()` with no arguments returns `-Infinity`, so an empty
 *     list would give you `-Infinity + 10`. Including a 0 — as the starting
 *     value of the loop, or as an extra argument to `Math.max` — is what makes
 *     the empty case come out as 10.
 *
 *         Math.max(...[]);        // -Infinity   ✗
 *         Math.max(0, ...[]);     // 0           ✓
 */
export function nextSortOrder(current: Positioned[]): number {
  // TODO(exercise 2): return (the largest sortOrder in `current`) + 10, or 10
  // when the list is empty. Right now every new item claims position 10, so new
  // items pile up on top of each other at the top of the list.
  return 10;
}
