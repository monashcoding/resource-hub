import type { InferSelectModel } from 'drizzle-orm';
import { db } from '../db/index.js';
import { regions, categories, resources } from '../db/schema.js';

export type RegionRow = InferSelectModel<typeof regions>;
export type CategoryRow = InferSelectModel<typeof categories>;
export type ResourceRow = InferSelectModel<typeof resources>;

// ── Public shapes (what the SPA consumes) ────────────────────────────────────

export interface TreeResource {
  id: number;
  title: string;
  url: string;
  description: string;
  type: ResourceRow['type'];
  tags: string[];
  sortOrder: number;
  /** Admin-tree only. Omitted from the public payload. */
  status?: ResourceRow['status'];
  archived?: boolean;
}

export interface TreeCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  visible?: boolean;
  resources: TreeResource[];
}

export interface TreeRegion {
  id: number;
  slug: string;
  name: string;
  blurb: string;
  sortOrder: number;
  visible?: boolean;
  /** Live resource count across the region — shown on the map card. */
  resourceCount: number;
  categories: TreeCategory[];
}

export interface ContentTree {
  regions: TreeRegion[];
  generatedAt: string;
}

export interface BuildOptions {
  /**
   * Public tree (false): only visible regions/categories and resources that are
   * `published` and not archived. Admin tree (true): everything, annotated.
   */
  includeHidden: boolean;
}

const byOrder = <T extends { sortOrder: number; id: number }>(a: T, b: T): number =>
  a.sortOrder - b.sortOrder || a.id - b.id;

/**
 * THE public visibility rule for a single resource row.
 *
 * A visitor may see a resource only when it has been published by a committee
 * member AND has not been archived. `pending` (a future community submission)
 * and `rejected` fail the first half; a soft-deleted row fails the second.
 *
 * Exported so it can be unit-tested directly, but it stays in this file on
 * purpose: `tree.ts` is the single place visibility rules live. Do not copy this
 * condition anywhere else — call this instead, or the two will drift.
 */
export function isPubliclyVisible(row: Pick<ResourceRow, 'status' | 'archivedAt'>): boolean {
  return row.status === 'published' && row.archivedAt === null;
}

/**
 * Assemble the nested tree from flat rows. Pure — no DB access — so the
 * visibility rules that decide what the public can see are unit-testable in
 * isolation. This is the single place those rules live; nothing else filters.
 */
export function buildTree(
  regionRows: RegionRow[],
  categoryRows: CategoryRow[],
  resourceRows: ResourceRow[],
  { includeHidden }: BuildOptions,
): ContentTree {
  const resourcesByCategory = new Map<number, TreeResource[]>();
  for (const r of resourceRows) {
    if (!includeHidden && !isPubliclyVisible(r)) continue;
    const list = resourcesByCategory.get(r.categoryId) ?? [];
    list.push({
      id: r.id,
      title: r.title,
      url: r.url,
      description: r.description,
      type: r.type,
      tags: r.tags,
      sortOrder: r.sortOrder,
      ...(includeHidden ? { status: r.status, archived: r.archivedAt !== null } : {}),
    });
    resourcesByCategory.set(r.categoryId, list);
  }

  const categoriesByRegion = new Map<number, TreeCategory[]>();
  for (const c of categoryRows) {
    if (!includeHidden && !c.visible) continue;
    const list = categoriesByRegion.get(c.regionId) ?? [];
    list.push({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      sortOrder: c.sortOrder,
      ...(includeHidden ? { visible: c.visible } : {}),
      resources: (resourcesByCategory.get(c.id) ?? []).sort(byOrder),
    });
    categoriesByRegion.set(c.regionId, list);
  }

  const out: TreeRegion[] = [];
  for (const region of regionRows) {
    if (!includeHidden && !region.visible) continue;
    const cats = (categoriesByRegion.get(region.id) ?? []).sort(byOrder);
    out.push({
      id: region.id,
      slug: region.slug,
      name: region.name,
      blurb: region.blurb,
      sortOrder: region.sortOrder,
      ...(includeHidden ? { visible: region.visible } : {}),
      // Counts only what a visitor would actually see, so the card never
      // promises "12 resources" and then shows 3.
      resourceCount: cats.reduce(
        (n, c) => n + c.resources.filter((r) => !r.archived && (r.status ?? 'published') === 'published').length,
        0,
      ),
      categories: cats,
    });
  }

  return { regions: out.sort(byOrder), generatedAt: new Date().toISOString() };
}

/** Read every row. The whole dataset is small (hundreds of rows) by design. */
export async function loadTree(options: BuildOptions): Promise<ContentTree> {
  const [regionRows, categoryRows, resourceRows] = await Promise.all([
    db.select().from(regions),
    db.select().from(categories),
    db.select().from(resources),
  ]);
  return buildTree(regionRows, categoryRows, resourceRows, options);
}
