import { and, eq, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { categories, regions, resources } from '../db/schema.js';
import type { MacUser } from '../auth/mac-auth.js';
import { recordChange } from './audit.js';
import { nextSortOrder, renormalise } from './reorder.js';
import { slugify } from './validate.js';
import type { z } from 'zod';
import type { categoryCreateSchema, categoryPatchSchema } from './validate.js';

type CategoryRow = typeof categories.$inferSelect;

export type CategoryResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'not_found' }
  | { kind: 'slug_taken'; slug: string }
  | { kind: 'not_empty'; liveResources: number; archivedResources: number }
  | { kind: 'unknown_ids'; unknown: number[] };

async function siblings(regionId: number): Promise<CategoryRow[]> {
  return db.select().from(categories).where(eq(categories.regionId, regionId));
}

/** How many resources still point at this category, live and archived. */
async function resourceCounts(categoryId: number): Promise<{ live: number; archived: number }> {
  const rows = await db
    .select({ archivedAt: resources.archivedAt })
    .from(resources)
    .where(eq(resources.categoryId, categoryId));
  return {
    live: rows.filter((r) => r.archivedAt === null).length,
    archived: rows.filter((r) => r.archivedAt !== null).length,
  };
}

export async function createCategory(
  actor: MacUser,
  input: z.infer<typeof categoryCreateSchema>,
): Promise<CategoryResult<CategoryRow>> {
  const region = await db.select().from(regions).where(eq(regions.id, input.regionId));
  if (region.length === 0) return { kind: 'not_found' };

  const slug = input.slug ?? slugify(input.name);
  const existing = await siblings(input.regionId);
  if (existing.some((c) => c.slug === slug)) return { kind: 'slug_taken', slug };

  const [created] = await db
    .insert(categories)
    .values({
      regionId: input.regionId,
      slug,
      name: input.name,
      description: input.description,
      visible: input.visible,
      sortOrder: nextSortOrder(existing),
    })
    .returning();
  if (!created) return { kind: 'not_found' };

  await recordChange(actor, 'create', 'category', created.id, null, created);
  return { kind: 'ok', value: created };
}

export async function updateCategory(
  actor: MacUser,
  id: number,
  patch: z.infer<typeof categoryPatchSchema>,
): Promise<CategoryResult<CategoryRow>> {
  const [before] = await db.select().from(categories).where(eq(categories.id, id));
  if (!before) return { kind: 'not_found' };

  if (patch.slug && patch.slug !== before.slug) {
    const clash = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.regionId, before.regionId), eq(categories.slug, patch.slug), ne(categories.id, id)));
    if (clash.length > 0) return { kind: 'slug_taken', slug: patch.slug };
  }

  const [after] = await db
    .update(categories)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(categories.id, id))
    .returning();
  if (!after) return { kind: 'not_found' };

  await recordChange(actor, 'update', 'category', id, before, after);
  return { kind: 'ok', value: after };
}

/**
 * Delete a category — only when nothing points at it any more.
 *
 * This is the guardrail that stops a committee member losing a category's worth
 * of curation with one click. Archived resources block deletion too: they are
 * soft-deleted, not gone, and cascading through them here would be a hard delete
 * by the back door. The admin UI turns `not_empty` into "move its N resources to
 * another category first", which is a task rather than a dead end (resources can
 * be re-parented via PATCH .categoryId).
 */
export async function deleteCategory(actor: MacUser, id: number): Promise<CategoryResult<null>> {
  const [before] = await db.select().from(categories).where(eq(categories.id, id));
  if (!before) return { kind: 'not_found' };

  const counts = await resourceCounts(id);
  if (counts.live + counts.archived > 0) {
    return { kind: 'not_empty', liveResources: counts.live, archivedResources: counts.archived };
  }

  await db.delete(categories).where(eq(categories.id, id));

  await recordChange(actor, 'delete', 'category', id, before, null);
  return { kind: 'ok', value: null };
}

export async function reorderCategories(
  actor: MacUser,
  regionId: number,
  ids: number[],
): Promise<CategoryResult<null>> {
  const current = await siblings(regionId);
  if (current.length === 0) {
    const region = await db.select().from(regions).where(eq(regions.id, regionId));
    if (region.length === 0) return { kind: 'not_found' };
  }

  const result = renormalise(ids, current);
  if (!result.ok) return { kind: 'unknown_ids', unknown: result.unknown };

  await db.transaction(async (tx) => {
    for (const { id, sortOrder } of result.updates) {
      await tx.update(categories).set({ sortOrder, updatedAt: new Date() }).where(eq(categories.id, id));
    }
  });

  await recordChange(actor, 'reorder', 'region', regionId, current.map((c) => c.id), result.updates);
  return { kind: 'ok', value: null };
}
