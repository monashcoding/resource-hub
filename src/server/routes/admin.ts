import { Router } from 'express';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { regions, auditLog } from '../db/schema.js';
import { requireAdmin, type MacUser } from '../auth/mac-auth.js';
import { loadTree } from '../content/tree.js';
import { recordChange } from '../admin/audit.js';
import {
  categoryCreateSchema,
  categoryPatchSchema,
  regionPatchSchema,
  reorderSchema,
  resourceCreateSchema,
  resourcePatchSchema,
} from '../admin/validate.js';
import {
  createCategory,
  deleteCategory,
  reorderCategories,
  updateCategory,
} from '../admin/categories.js';
import {
  archiveResource,
  createResource,
  reorderResources,
  restoreResource,
  updateResource,
} from '../admin/resources.js';

export const adminRouter: Router = Router();

// Everything below is committee/exec only (MAC_ADMIN_ROLES).
adminRouter.use(requireAdmin);

const actor = (req: { macUser?: MacUser }): MacUser => req.macUser!;

function parseId(raw: string | undefined): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Map a validation failure onto a 400 with the field errors the UI shows. */
function badRequest(res: import('express').Response, error: z.ZodError): void {
  res.status(400).json({ error: 'invalid', issues: error.flatten().fieldErrors });
}

// ── Tree ─────────────────────────────────────────────────────────────────────

/** Same shape as /api/content but including hidden and archived rows. */
adminRouter.get('/tree', async (_req, res) => {
  res.json(await loadTree({ includeHidden: true }));
});

// ── Regions (presentation edits only) ────────────────────────────────────────

// There is deliberately no POST or DELETE here. A region is bound to map artwork
// and a grid slot, so adding one means a seed entry in src/server/db/seed.ts plus
// a presentation entry in web/src/regions.ts — a PR, not a form. Answer the
// request explicitly rather than 404ing, so a future maintainer learns why.
const REGION_IMMUTABLE = {
  error: 'regions_are_seeded',
  message:
    'Regions cannot be created or deleted through the admin. Add an entry to ' +
    'src/server/db/seed.ts and a matching one to web/src/regions.ts (same slug), ' +
    'with artwork at web/public/regions/<slug>.svg, then redeploy.',
};

adminRouter.post('/regions', (_req, res) => {
  res.status(405).json(REGION_IMMUTABLE);
});

adminRouter.delete('/regions/:id', (_req, res) => {
  res.status(405).json(REGION_IMMUTABLE);
});

adminRouter.patch('/regions/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const parsed = regionPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    badRequest(res, parsed.error);
    return;
  }

  const [before] = await db.select().from(regions).where(eq(regions.id, id));
  if (!before) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const [after] = await db
    .update(regions)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(regions.id, id))
    .returning();

  await recordChange(actor(req), 'update', 'region', id, before, after);
  res.json({ region: after });
});

adminRouter.put('/regions/:id/category-order', async (req, res) => {
  const id = parseId(req.params.id);
  const parsed = reorderSchema.safeParse(req.body);
  if (id === null || !parsed.success) {
    res.status(400).json({ error: 'invalid' });
    return;
  }

  const result = await reorderCategories(actor(req), id, parsed.data.ids);
  if (result.kind === 'not_found') {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (result.kind === 'unknown_ids') {
    res.status(400).json({ error: 'unknown_ids', unknown: result.unknown });
    return;
  }
  res.json({ ok: true });
});

// ── Categories ───────────────────────────────────────────────────────────────

adminRouter.post('/categories', async (req, res) => {
  const parsed = categoryCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    badRequest(res, parsed.error);
    return;
  }

  const result = await createCategory(actor(req), parsed.data);
  switch (result.kind) {
    case 'ok':
      res.status(201).json({ category: result.value });
      return;
    case 'slug_taken':
      res.status(409).json({ error: 'slug_taken', slug: result.slug });
      return;
    default:
      res.status(404).json({ error: 'region_not_found' });
  }
});

adminRouter.patch('/categories/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const parsed = categoryPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    badRequest(res, parsed.error);
    return;
  }

  const result = await updateCategory(actor(req), id, parsed.data);
  switch (result.kind) {
    case 'ok':
      res.json({ category: result.value });
      return;
    case 'slug_taken':
      res.status(409).json({ error: 'slug_taken', slug: result.slug });
      return;
    default:
      res.status(404).json({ error: 'not_found' });
  }
});

adminRouter.delete('/categories/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }

  const result = await deleteCategory(actor(req), id);
  switch (result.kind) {
    case 'ok':
      res.json({ ok: true });
      return;
    case 'not_empty':
      // The UI turns this into "move its N resources first" — deliberately a
      // task rather than a dead end.
      res.status(409).json({
        error: 'not_empty',
        liveResources: result.liveResources,
        archivedResources: result.archivedResources,
      });
      return;
    default:
      res.status(404).json({ error: 'not_found' });
  }
});

adminRouter.put('/categories/:id/resource-order', async (req, res) => {
  const id = parseId(req.params.id);
  const parsed = reorderSchema.safeParse(req.body);
  if (id === null || !parsed.success) {
    res.status(400).json({ error: 'invalid' });
    return;
  }

  const result = await reorderResources(actor(req), id, parsed.data.ids);
  if (result.kind === 'category_not_found') {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (result.kind === 'unknown_ids') {
    res.status(400).json({ error: 'unknown_ids', unknown: result.unknown });
    return;
  }
  res.json({ ok: true });
});

// ── Resources ────────────────────────────────────────────────────────────────

adminRouter.post('/resources', async (req, res) => {
  const parsed = resourceCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    badRequest(res, parsed.error);
    return;
  }

  const result = await createResource(actor(req), parsed.data);
  switch (result.kind) {
    case 'ok':
      res.status(201).json({ resource: result.value });
      return;
    case 'category_not_found':
      res.status(404).json({ error: 'category_not_found' });
      return;
    default:
      res.status(500).json({ error: 'create_failed' });
  }
});

adminRouter.patch('/resources/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }
  const parsed = resourcePatchSchema.safeParse(req.body);
  if (!parsed.success) {
    badRequest(res, parsed.error);
    return;
  }

  const result = await updateResource(actor(req), id, parsed.data);
  switch (result.kind) {
    case 'ok':
      res.json({ resource: result.value });
      return;
    case 'category_not_found':
      res.status(404).json({ error: 'category_not_found' });
      return;
    default:
      res.status(404).json({ error: 'not_found' });
  }
});

/** Archive (soft delete). Nothing in this app is ever hard-deleted. */
adminRouter.delete('/resources/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }

  const result = await archiveResource(actor(req), id);
  if (result.kind !== 'ok') {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ resource: result.value });
});

adminRouter.post('/resources/:id/restore', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }

  const result = await restoreResource(actor(req), id);
  if (result.kind !== 'ok') {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json({ resource: result.value });
});

// ── Audit ────────────────────────────────────────────────────────────────────

/** Recent changes, newest first. The "who added this dead link" answer. */
adminRouter.get('/audit', async (_req, res) => {
  const rows = await db.select().from(auditLog).orderBy(desc(auditLog.at)).limit(100);
  res.json({ entries: rows });
});
