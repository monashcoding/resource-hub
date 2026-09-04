import { ensureToken, fetchToken } from './auth.js';
import type { AuditEntry, ContentTree, ResourceStatus, ResourceType, TreeCategory, TreeResource } from './types.js';

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

/**
 * Authenticated fetch: attaches the Bearer token and refreshes it once on 401
 * (mac-auth tokens last 15 minutes; the session cookie lasts much longer).
 */
async function authedFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = await ensureToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  if (res.status === 401) {
    if (retry && (await fetchToken())) return authedFetch(path, init, false);
    throw new UnauthorizedError('not authenticated');
  }
  return res;
}

function jsonFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  return authedFetch(path, { ...init, headers });
}

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ── Public ───────────────────────────────────────────────────────────────────

/** The whole published tree. No auth — a visitor never touches mac-auth. */
export async function fetchContent(): Promise<ContentTree> {
  const res = await fetch('/api/content');
  if (!res.ok) throw new Error(`content ${res.status}`);
  return res.json();
}

// ── Admin ────────────────────────────────────────────────────────────────────

/** Same tree including hidden and archived rows. 403 for non-committee. */
export async function fetchAdminTree(): Promise<ContentTree> {
  const res = await authedFetch('/api/admin/tree');
  if (res.status === 403) throw new ForbiddenError();
  if (!res.ok) throw new Error(`admin tree ${res.status}`);
  return res.json();
}

export type Outcome<T> =
  | { kind: 'ok'; value: T }
  // A category slug already used in the same region.
  | { kind: 'slug_taken'; slug: string }
  // Deleting a category that still holds resources — the UI turns this into a
  // "move its N resources first" instruction rather than a dead end.
  | { kind: 'not_empty'; liveResources: number; archivedResources: number }
  | { kind: 'invalid'; issues: Record<string, string[] | undefined> }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string };

async function outcome<T>(res: Response, pick: (body: Record<string, unknown>) => T): Promise<Outcome<T>> {
  if (res.status === 403) return { kind: 'forbidden' };
  const body = await safeJson(res);
  if (res.status === 409 && body.error === 'slug_taken') {
    return { kind: 'slug_taken', slug: String(body.slug ?? '') };
  }
  if (res.status === 409 && body.error === 'not_empty') {
    return {
      kind: 'not_empty',
      liveResources: Number(body.liveResources ?? 0),
      archivedResources: Number(body.archivedResources ?? 0),
    };
  }
  if (res.status === 400) {
    return { kind: 'invalid', issues: (body.issues as Record<string, string[]>) ?? {} };
  }
  if (!res.ok) return { kind: 'error', message: `Failed (${res.status})` };
  return { kind: 'ok', value: pick(body) };
}

// Regions — presentation edits only. There is no create/delete: a region is
// bound to artwork and a grid slot, so adding one is a PR (see web/src/regions.ts).
export interface RegionPatch {
  name?: string;
  blurb?: string;
  visible?: boolean;
}

export async function patchRegion(id: number, patch: RegionPatch): Promise<Outcome<unknown>> {
  const res = await jsonFetch(`/api/admin/regions/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  return outcome(res, (b) => b.region);
}

export async function reorderCategories(regionId: number, ids: number[]): Promise<Outcome<null>> {
  const res = await jsonFetch(`/api/admin/regions/${regionId}/category-order`, {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });
  return outcome(res, () => null);
}

// Categories
export interface CategoryInput {
  name: string;
  description: string;
  visible?: boolean;
}

export async function createCategory(regionId: number, input: CategoryInput): Promise<Outcome<TreeCategory>> {
  const res = await jsonFetch('/api/admin/categories', {
    method: 'POST',
    body: JSON.stringify({ regionId, ...input }),
  });
  return outcome(res, (b) => b.category as TreeCategory);
}

export async function patchCategory(id: number, patch: Partial<CategoryInput>): Promise<Outcome<TreeCategory>> {
  const res = await jsonFetch(`/api/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  return outcome(res, (b) => b.category as TreeCategory);
}

export async function deleteCategory(id: number): Promise<Outcome<null>> {
  const res = await authedFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
  return outcome(res, () => null);
}

export async function reorderResources(categoryId: number, ids: number[]): Promise<Outcome<null>> {
  const res = await jsonFetch(`/api/admin/categories/${categoryId}/resource-order`, {
    method: 'PUT',
    body: JSON.stringify({ ids }),
  });
  return outcome(res, () => null);
}

// Resources
export interface ResourceInput {
  title: string;
  url: string;
  description: string;
  type: ResourceType;
  tags: string[];
  status: Extract<ResourceStatus, 'published' | 'hidden'>;
}

export async function createResource(categoryId: number, input: ResourceInput): Promise<Outcome<TreeResource>> {
  const res = await jsonFetch('/api/admin/resources', {
    method: 'POST',
    body: JSON.stringify({ categoryId, ...input }),
  });
  return outcome(res, (b) => b.resource as TreeResource);
}

export async function patchResource(
  id: number,
  patch: Partial<ResourceInput> & { categoryId?: number },
): Promise<Outcome<TreeResource>> {
  const res = await jsonFetch(`/api/admin/resources/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
  return outcome(res, (b) => b.resource as TreeResource);
}

/** Archive (soft delete). Recoverable via restoreResource. */
export async function archiveResource(id: number): Promise<Outcome<TreeResource>> {
  const res = await authedFetch(`/api/admin/resources/${id}`, { method: 'DELETE' });
  return outcome(res, (b) => b.resource as TreeResource);
}

export async function restoreResource(id: number): Promise<Outcome<TreeResource>> {
  const res = await jsonFetch(`/api/admin/resources/${id}/restore`, { method: 'POST' });
  return outcome(res, (b) => b.resource as TreeResource);
}

export async function fetchAudit(): Promise<AuditEntry[]> {
  const res = await authedFetch('/api/admin/audit');
  if (res.status === 403) throw new ForbiddenError();
  if (!res.ok) throw new Error(`audit ${res.status}`);
  return (await res.json()).entries;
}
