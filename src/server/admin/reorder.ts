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
 * 📖 WORKED EXAMPLE — read this one, don't write it
 * ─────────────────────────────────────────────────────────────────────────────
 * The hardest function in the set, already written, with its four steps marked
 * in the body below. Read it once now and it'll look like nonsense; read it
 * again after you've done the exercises and it won't. That's normal.
 *
 * THE FOUR STEPS
 *
 *   STEP A — reject ids that don't belong to this parent.
 *       An id the caller sent that isn't one of `current`'s rows is a bug in the
 *       caller, not something to quietly skip. Note that it collects ALL the bad
 *       ids and returns BEFORE touching anything else: half-renumbering and then
 *       failing would be worse than not trying.
 *
 *   STEP B — build the final order, ignoring repeats.
 *       Walks the requested ids in order, skipping any already collected, so
 *       [2, 2, 1, 3] becomes [2, 1, 3].
 *
 *   STEP C — append the ones the client never mentioned.
 *       This is the step that exists because of real life: two committee members
 *       have the admin page open, one adds a resource, the other saves an order
 *       that doesn't include it. Without this step that new row would silently
 *       disappear. With it, it lands at the end.
 *
 *   STEP D — hand out fresh positions, 10, 20, 30, …
 *
 * FOLLOW IT THROUGH
 *   current      = [ {id:1,sortOrder:10}, {id:2,sortOrder:20}, {id:3,sortOrder:30} ]
 *   requestedIds = [3, 1]
 *
 *   Step A: 3 and 1 are both known           → carry on
 *   Step B: ordered = [3, 1]
 *   Step C: row 2 was never mentioned        → ordered = [3, 1, 2]
 *   Step D: → [ {id:3,sortOrder:10}, {id:1,sortOrder:20}, {id:2,sortOrder:30} ]
 *
 * THE PIECES IT USES — you'll meet most of these in the exercises
 *
 *   A `Set` is a bag of values with no duplicates, and asking "is this in the
 *   bag?" is instant, which is why both steps A and B use one:
 *
 *       const known = new Set([1, 2, 3]);
 *       known.has(2);        // true
 *       known.has(9);        // false
 *       known.add(9);        // now it has 9 too
 *
 *   `.map()` makes a NEW array by transforming every element, and hands you the
 *   position as a second argument — which is how step D gets 10, 20, 30
 *   (position 0 → 10, position 1 → 20, …):
 *
 *       [ {id: 7}, {id: 8} ].map((row) => row.id);        // [7, 8]
 *       ['a', 'b'].map((letter, i) => `${i}:${letter}`);  // ['0:a', '1:b']
 *
 *   `[...array]` copies an array. `.sort()` rearranges an array IN PLACE, so
 *   step C sorts a COPY — sorting `current` itself would reorder the caller's
 *   array behind its back, and a test checks that it doesn't:
 *
 *       const copy = [...current];
 *       copy.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
 *
 *   That comparison reads as: order by sortOrder; if two are equal
 *   (`a.sortOrder - b.sortOrder` is 0, which counts as false) fall back to id —
 *   so the result never depends on luck.
 *
 *   `continue` skips to the next turn of a loop, which is how step B ignores a
 *   repeat without an extra level of indentation.
 *
 * TRY IT — comment out step C, run `npx vitest src/server/admin/reorder.test.ts`,
 * and exactly three MORE tests fail, all of them about siblings the client
 * didn't send. That's the cleanest way to see what one step was actually for.
 * (Put it back afterwards.)
 *
 */
export function renormalise(requestedIds: number[], current: Positioned[]): ReorderResult {
  // STEP A — reject ids that don't belong to this parent, before doing any work.
  const known = new Set(current.map((c) => c.id));
  const unknown = requestedIds.filter((id) => !known.has(id));
  if (unknown.length > 0) return { ok: false, reason: 'unknown_ids', unknown };

  // STEP B — walk the requested order, skipping any id already collected.
  const seen = new Set<number>();
  const ordered: number[] = [];
  for (const id of requestedIds) {
    if (seen.has(id)) continue; // tolerate a duplicated id in the payload
    seen.add(id);
    ordered.push(id);
  }

  // STEP C — append the siblings the client never mentioned, oldest position
  // first, so a row someone else added mid-edit survives instead of vanishing.
  const remainder = [...current].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  for (const row of remainder) {
    if (!seen.has(row.id)) ordered.push(row.id);
  }

  // STEP D — hand out fresh positions: 10, 20, 30, …
  return { ok: true, updates: ordered.map((id, i) => ({ id, sortOrder: (i + 1) * 10 })) };
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
