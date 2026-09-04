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
 */
export function renormalise(requestedIds: number[], current: Positioned[]): ReorderResult {
  const known = new Set(current.map((c) => c.id));
  const unknown = requestedIds.filter((id) => !known.has(id));
  if (unknown.length > 0) return { ok: false, reason: 'unknown_ids', unknown };

  const seen = new Set<number>();
  const ordered: number[] = [];
  for (const id of requestedIds) {
    if (seen.has(id)) continue; // tolerate a duplicated id in the payload
    seen.add(id);
    ordered.push(id);
  }

  const remainder = [...current].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  for (const row of remainder) {
    if (!seen.has(row.id)) ordered.push(row.id);
  }

  return { ok: true, updates: ordered.map((id, i) => ({ id, sortOrder: (i + 1) * 10 })) };
}

/** The sortOrder to give a newly created item so it lands at the end. */
export function nextSortOrder(current: Positioned[]): number {
  return current.reduce((max, c) => Math.max(max, c.sortOrder), 0) + 10;
}
