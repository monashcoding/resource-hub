# CLAUDE.md — mac-resource-hub

Read `README.md` first for what this is and how to run it. This file is the design rationale
plus the rules that are easy to get wrong.

## What this is

A map-style landing page of curated resources for Monash CS students. Clickable regions
("Starting Comp Sci", "Internships & Careers", …) zoom into their categories, each of which
lists real resources. Committee members maintain the content through `/admin`.

**It is not a link aggregator, a submission platform, or a search engine.** The value is that a
human curated it. If you find yourself building crawling, scoring, or ranking, stop.

## MVP scope — deliberately excluded

No AI vetting or scoring pipeline. No community submissions. No PR-style review flow. Resources
are added by committee members, manually. The database has the *hooks* for a future submissions
flow (below) but none of the machinery, and adding the machinery is a v2 decision, not a
"while I'm here".

## Non-negotiables

- **Don't touch mac-auth.** `src/server/auth/mac-auth.ts` is the shared MAC Suite verifier,
  copied verbatim. It proves identity; this app owns no accounts and no passwords. Data that
  needs a user is keyed by `macUserId`, never email.
- **`src/server/content/tree.ts` is the only place visibility rules live.** Public payloads show
  a resource only when `status === 'published'` **and** `archivedAt === null`, inside a visible
  category, inside a visible region. Do not add a second filter anywhere else — add it here or
  the two will drift.
- **`status` has four values on purpose.** The admin only ever sets `published`/`hidden`;
  `pending` and `rejected` exist so that when community submissions arrive, a submission is just
  a row with `status='pending'` and **no public query has to change**. Retrofitting that filter
  across a live codebase is the single most expensive mistake available in this shape. Don't
  "simplify" the enum down to two values.
- **`submittedByMacUserId` is null for committee-added rows.** v2 fills it in. Leave the column.
- **Resources live in the database, never in a seed file or a JSON blob.** Regions can be
  code-owned because they're a fixed axis; resources cannot be, or v2 submissions have nowhere
  to land.
- **Nothing is ever hard-deleted except an empty category.** Resources archive (`archivedAt`)
  and can be restored. A category with *any* resources attached — archived ones included —
  refuses to delete, because cascading through archived rows would be a hard delete by the back
  door. The API returns 409 with the counts and the UI turns that into "move them first".
- **Every admin mutation goes through `recordChange()`** (`src/server/admin/audit.ts`). It
  writes the audit row *and* busts the public cache. Bypass it and you get stale content that
  nobody can trace. If you add a mutation, call it.
- **Region slugs are permanent.** They appear in public URLs (`/r/:slug`) and they're the key
  that joins a database row to its artwork in `web/src/regions.ts`. Renaming a region is a
  `name` edit in the admin, never a slug change.
- **The seed is non-destructive.** `seed()` inserts missing slugs and never overwrites `name`,
  `blurb`, `sortOrder` or `visible`. That's what lets it run on every boot without undoing a
  committee member's rename. Don't turn it into an upsert-everything.

## Decisions that were made deliberately

- **Regions seeded, categories admin-editable.** A small non-technical committee should be able
  to reorganise categories freely, but a region without artwork or a grid slot breaks the
  landing page. So regions are a PR and categories are a form. `POST /api/admin/regions` returns
  405 with an explanation rather than 404, so the next maintainer learns why.
- **One home category per resource, plus tags — not many-to-many.** "Where does this live" stays
  answerable, and the committee never has to think about placement twice. Cross-topic pressure
  is absorbed by tags and the region search box. If real cross-listing is ever needed, a
  `resource_regions` junction is purely additive; nothing existing has to change.
- **The whole published tree ships in one cached `/api/content` response.** The dataset is a few
  hundred rows. The SPA holds all of it, so every drill-down and the search filter are local
  state — which is what keeps the zoom transition free of a loading spinner. This holds until
  the hub is thousands of resources; the route contract doesn't change when it needs paging.
- **Styled grid + View Transitions API, not an SVG map with hit-regions.** A card and its region
  header share a `view-transition-name`, so the browser tweens one into the other. Browsers
  without the API, and anyone with `prefers-reduced-motion`, get an instant navigation — a clean
  fallback, not a break. A literal LoL-style map needs bespoke artwork with per-region path data
  and is meaningfully worse on mobile and for screen readers.
- **Up/down buttons, not drag-and-drop.** No dependency, works on touch, works with a keyboard,
  and can't fire on an accidental drag. The client always sends the *full* ordered id list and
  the server renumbers 10/20/30 — no fractional indices to get wrong.
- **Sort order is renormalised server-side on every save** (`src/server/admin/reorder.ts`). Ids
  the client omitted (a sibling added by someone else mid-edit) are appended rather than
  dropped; ids that don't belong to the parent are a 400, not silently ignored.

## Things that would be easy to get wrong

- Adding a region on one side only. The slug must exist in `src/server/db/seed.ts` **and**
  `web/src/regions.ts`. The server warns at boot (`content/artwork-check.ts`) and the card falls
  back to neutral grey rather than vanishing.
- Editing the database directly and wondering why the site hasn't changed — the public tree is
  cached in memory and only busted by admin writes. Restart the container after a manual SQL
  edit.
- Importing `src/server/db/seed.ts` for `REGION_SEED` is safe: the seed only runs when that file
  is the process entry point. Don't replace that check with an `argv` substring match.
- `/admin` cannot work on `localhost` — mac-auth's session cookie is scoped to
  `.monashcoding.com`. That's not a bug to fix here.

## Likely first follow-ups

- **Dead-link checking.** The real failure mode of a resource hub. Needs no schema forethought —
  add `lastCheckedAt` / `lastHttpStatus` to `resources` and a nightly job whenever someone wants
  it. Deliberately not built.
- **Community submissions (v2).** The database is ready: write the row with `status='pending'`
  and `submittedByMacUserId` set, then add a review queue to the admin that flips it to
  `published` or `rejected`. No migration and no public query change required.

## Deployment notes

- **`.dockerignore` is load-bearing.** Without it, `COPY . .` copies the host's `node_modules`
  over the Linux ones `npm ci` just installed, and the build dies on platform-specific binaries
  (esbuild/vite). Don't delete it, and don't add `node_modules` back.
- **`VITE_AUTH_URL` is baked into the SPA bundle at build time**, unlike `AUTH_URL` which the
  server reads at runtime. Changing it requires a rebuild, not a restart.
- **The container runs as `node` (uid 1000), not root.** The app writes nothing to disk and
  listens on 3000, so it doesn't need root. If you add something that writes to the filesystem,
  give it a writable path rather than reverting to root.
- **`docker-compose.local.yml` is for local testing only.** It is not `docker-compose.override.yml`
  precisely so Docker never auto-merges it into a production `docker compose up`.
- **The migrator silences Postgres NOTICEs on purpose** (`onnotice` in `src/server/db/migrate.ts`).
  Drizzle's bookkeeping emits two error-shaped NOTICE objects on every redeploy after the first;
  log noise that looks like a failure is how real failures get ignored.
