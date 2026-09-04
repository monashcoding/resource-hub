import { db } from '../db/index.js';
import { auditLog } from '../db/schema.js';
import { invalidatePublicTree } from '../content/cache.js';
import type { MacUser } from '../auth/mac-auth.js';

type Action = 'create' | 'update' | 'delete' | 'reorder';

/**
 * Record an admin mutation and drop the public cache.
 *
 * Every write path goes through here, so the two things that must always happen
 * together — the audit row and the cache bust — cannot drift apart. If you add a
 * new mutation and forget this call, stale content is served AND nobody can tell
 * who changed what.
 */
export async function recordChange(
  actor: MacUser,
  action: Action,
  entityType: 'region' | 'category' | 'resource',
  entityId: number,
  before: unknown,
  after: unknown,
): Promise<void> {
  await db.insert(auditLog).values({
    actorMacUserId: actor.macUserId,
    actorName: actor.name,
    action,
    entityType,
    entityId,
    before: before === undefined ? null : (before as object),
    after: after === undefined ? null : (after as object),
  });
  invalidatePublicTree();
}
