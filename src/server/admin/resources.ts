import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { categories, resources } from '../db/schema.js';
import type { MacUser } from '../auth/mac-auth.js';
import { recordChange } from './audit.js';
import { nextSortOrder, renormalise } from './reorder.js';
import { normaliseTags } from './validate.js';
import type { z } from 'zod';
import type { resourceCreateSchema, resourcePatchSchema } from './validate.js';

type ResourceRow = typeof resources.$inferSelect;

export type ResourceResult<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'not_found' }
  | { kind: 'category_not_found' }
  | { kind: 'unknown_ids'; unknown: number[] };

async function siblings(categoryId: number): Promise<ResourceRow[]> {
  return db.select().from(resources).where(eq(resources.categoryId, categoryId));
}

async function categoryExists(id: number): Promise<boolean> {
  const rows = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, id));
  return rows.length > 0;
}

export async function createResource(
  actor: MacUser,
  input: z.infer<typeof resourceCreateSchema>,
): Promise<ResourceResult<ResourceRow>> {
  if (!(await categoryExists(input.categoryId))) return { kind: 'category_not_found' };

  const [created] = await db
    .insert(resources)
    .values({
      categoryId: input.categoryId,
      title: input.title,
      url: input.url,
      description: input.description,
      type: input.type,
      tags: normaliseTags(input.tags),
      status: input.status,
      // Null marks this as committee-added. v2 community submissions set it to
      // the submitter's macUserId; nothing here changes for that.
      submittedByMacUserId: null,
      sortOrder: nextSortOrder(await siblings(input.categoryId)),
    })
    .returning();
  if (!created) return { kind: 'not_found' };

  await recordChange(actor, 'create', 'resource', created.id, null, created);
  return { kind: 'ok', value: created };
}

export async function updateResource(
  actor: MacUser,
  id: number,
  patch: z.infer<typeof resourcePatchSchema>,
): Promise<ResourceResult<ResourceRow>> {
  const [before] = await db.select().from(resources).where(eq(resources.id, id));
  if (!before) return { kind: 'not_found' };

  const moving = patch.categoryId !== undefined && patch.categoryId !== before.categoryId;
  if (moving && !(await categoryExists(patch.categoryId!))) return { kind: 'category_not_found' };

  const [after] = await db
    .update(resources)
    .set({
      ...patch,
      ...(patch.tags ? { tags: normaliseTags(patch.tags) } : {}),
      // A moved resource goes to the end of its new category rather than
      // inheriting a position that means nothing there.
      ...(moving ? { sortOrder: nextSortOrder(await siblings(patch.categoryId!)) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(resources.id, id))
    .returning();
  if (!after) return { kind: 'not_found' };

  await recordChange(actor, 'update', 'resource', id, before, after);
  return { kind: 'ok', value: after };
}

/**
 * Archive a resource (soft delete). There is no hard delete anywhere in this
 * app: a future committee member who archives the wrong row must be able to get
 * it back, and the audit log alone is not a restore path.
 */
export async function archiveResource(actor: MacUser, id: number): Promise<ResourceResult<ResourceRow>> {
  const [before] = await db.select().from(resources).where(eq(resources.id, id));
  if (!before) return { kind: 'not_found' };

  const [after] = await db
    .update(resources)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(resources.id, id))
    .returning();
  if (!after) return { kind: 'not_found' };

  await recordChange(actor, 'delete', 'resource', id, before, after);
  return { kind: 'ok', value: after };
}

/** Undo an archive, putting the resource back at the end of its category. */
export async function restoreResource(actor: MacUser, id: number): Promise<ResourceResult<ResourceRow>> {
  const [before] = await db.select().from(resources).where(eq(resources.id, id));
  if (!before) return { kind: 'not_found' };

  const [after] = await db
    .update(resources)
    .set({
      archivedAt: null,
      sortOrder: nextSortOrder(await siblings(before.categoryId)),
      updatedAt: new Date(),
    })
    .where(eq(resources.id, id))
    .returning();
  if (!after) return { kind: 'not_found' };

  await recordChange(actor, 'update', 'resource', id, before, after);
  return { kind: 'ok', value: after };
}

export async function reorderResources(
  actor: MacUser,
  categoryId: number,
  ids: number[],
): Promise<ResourceResult<null>> {
  if (!(await categoryExists(categoryId))) return { kind: 'category_not_found' };

  // Archived rows keep a sortOrder but are not part of the visible ordering, so
  // they are excluded here and simply land at the end if ever restored.
  const current = (await siblings(categoryId)).filter((r) => r.archivedAt === null);

  const result = renormalise(ids, current);
  if (!result.ok) return { kind: 'unknown_ids', unknown: result.unknown };

  await db.transaction(async (tx) => {
    for (const { id, sortOrder } of result.updates) {
      await tx.update(resources).set({ sortOrder, updatedAt: new Date() }).where(eq(resources.id, id));
    }
  });

  await recordChange(actor, 'reorder', 'category', categoryId, current.map((r) => r.id), result.updates);
  return { kind: 'ok', value: null };
}
