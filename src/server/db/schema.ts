import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core';

// ── Enums ────────────────────────────────────────────────────────────────────

export const resourceType = pgEnum('resource_type', [
  'course',
  'article',
  'tool',
  'community',
  'video',
  'other',
]);

// `pending` and `rejected` are unused by the MVP admin, which only ever sets
// `published`/`hidden`. They exist from day one so every public query is ALREADY
// written to exclude unvetted rows — when community submissions land in v2 a
// submission is just a row with status='pending' and no public query changes.
export const resourceStatus = pgEnum('resource_status', [
  'published',
  'hidden',
  'pending',
  'rejected',
]);

export const auditAction = pgEnum('audit_action', ['create', 'update', 'delete', 'reorder']);

// ── regions ──────────────────────────────────────────────────────────────────
// Seeded from src/server/db/seed.ts, never created or deleted through the API.
// A region is an axis of the site bound to map artwork and a grid slot, so
// adding one is a PR (seed entry + presentation entry in web/src/regions.ts),
// not a form. Committee can still rename/reorder/hide one.
export const regions = pgTable('regions', {
  id: serial('id').primaryKey(),
  // Stable key. Public URL is /r/:slug, and it joins this row to its artwork in
  // web/src/regions.ts. Never change a slug — it breaks deep links and art.
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  blurb: text('blurb').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  visible: boolean('visible').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ── categories ───────────────────────────────────────────────────────────────
// Full admin CRUD. Delete is refused while the category still holds live
// resources (see src/server/admin/categories.ts) — the guardrail that stops a
// non-technical committee losing a category's worth of work in one click.
export const categories = pgTable(
  'categories',
  {
    id: serial('id').primaryKey(),
    regionId: integer('region_id')
      .notNull()
      .references(() => regions.id),
    // Unique per region, not globally: two regions may both want "interviews".
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    sortOrder: integer('sort_order').notNull().default(0),
    visible: boolean('visible').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    regionSlug: unique('categories_region_slug_unique').on(t.regionId, t.slug),
    byRegion: index('categories_region_idx').on(t.regionId),
  }),
);

// ── resources ────────────────────────────────────────────────────────────────
// Exactly one home category (placement axis) plus free tags (orthogonal axis).
// Deliberately NOT many-to-many: "where does this live" stays answerable, and a
// resource_regions junction is purely additive if real cross-listing is ever
// needed.
export const resources = pgTable(
  'resources',
  {
    id: serial('id').primaryKey(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id),
    title: text('title').notNull(),
    url: text('url').notNull(),
    description: text('description').notNull().default(''),
    type: resourceType('type').notNull().default('other'),
    // Lowercased on write. Powers client-side filtering and absorbs the "this
    // belongs in two places" pressure without duplicate placement rows.
    tags: text('tags').array().notNull().default([]),
    sortOrder: integer('sort_order').notNull().default(0),
    status: resourceStatus('status').notNull().default('published'),
    // null = added by a committee member through the admin. v2 (community
    // submissions) fills this in; nothing here has to change for that.
    submittedByMacUserId: text('submitted_by_mac_user_id'),
    // Soft delete. Nothing in this app is ever hard-deleted — an accidental
    // archive by a future committee member must be recoverable from the DB.
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byCategory: index('resources_category_idx').on(t.categoryId),
  }),
);

// ── audit_log ────────────────────────────────────────────────────────────────
// Written on every admin mutation. The most handover-valuable table here: two
// years from now someone needs to know who added a dead link, and when. An AI
// vetting pipeline in v2 is just another actor writing rows to it.
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  actorMacUserId: text('actor_mac_user_id').notNull(),
  actorName: text('actor_name').notNull().default(''),
  action: auditAction('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
});
