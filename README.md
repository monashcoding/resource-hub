> ### 📚 You're on the teaching branch
>
> This branch is the MAC Resource Hub with five functions removed for someone to
> write, plus two left finished as worked examples. If that's you, **open
> [`EXERCISES.md`](EXERCISES.md) and start there** — this README is the
> project's real documentation and you don't need most of it yet.
>
> The finished code is on `main`.

# MAC Resource Hub

A map-style directory of curated resources for Monash CS students, run by the Monash
Association of Coding. Visitors browse without signing in; committee members add and edit
resources through a built-in admin page.

**Live:** `https://resources.monashcoding.com` · **Auth:** [mac-auth](https://auth.monashcoding.com)

---

## How it's shaped

Three levels, and one axis across them:

```
region  →  category  →  resource        (+ free-form tags on each resource)
"Internships & Careers"
      └─ "Interview prep"
              └─ "Pramp — peer mock interviews"  #free #interview
```

- **Regions are seeded in code.** A region is bound to map artwork and a slot in the grid, so
  adding one is a small pull request, not a form. Committee members *can* rename, reorder and
  hide regions from the admin.
- **Categories are fully editable** by committee members.
- **Resources have exactly one home category** plus tags. A resource is never listed in two
  places; use tags if something spans topics.

---

## Running it

### Production (Dokploy)

Step-by-step runbook: [`docs/deploy-dokploy.md`](docs/deploy-dokploy.md).

The whole deployment is one compose stack: an app container serving the SPA + API, and
Postgres. On boot the container applies migrations and inserts any missing regions, so a clean
VM comes up as a working site with no manual steps.

**First deployment**

1. In Dokploy, create a **Compose** application pointing at this repo, `docker-compose.yml`.
2. Under **Environment**, set at minimum:
   ```
   POSTGRES_PASSWORD=<generate one: openssl rand -base64 24>
   APP_DOMAIN=resources.monashcoding.com
   ```
   `.env.example` lists every variable with its default and what it does.
3. Point the DNS record for `APP_DOMAIN` at the VM. The subdomain **must** be under
   `monashcoding.com` — mac-auth's session cookie is scoped to `.monashcoding.com`, so sign-in
   silently fails on any other domain.
4. Deploy. Traefik picks up the router from the labels in `docker-compose.yml` and issues the
   certificate via the `letsencrypt` resolver.

Check `docker compose logs app`. A healthy first boot looks exactly like this:

```
[entrypoint] applying migrations…
[migrate] migrations applied
[entrypoint] seeding regions…
[seed] created region "starting-comp-sci"
... (one line per region)
[entrypoint] starting server…
mac-resource-hub listening on :3000
```

**Redeploys** are safe to run any time. Migrations are idempotent, and the seed only inserts
regions that are missing — it never overwrites a name, blurb, order or visibility that a
committee member has edited. A redeploy's log is just:

```
[entrypoint] applying migrations…
[migrate] migrations applied
[entrypoint] seeding regions…
[seed] done
[entrypoint] starting server…
```

**Environment variables**

| Variable | Default | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | `mac_resource_hub` | **Set a real one.** Postgres is only on the internal network, but don't ship the default. |
| `APP_DOMAIN` | `resources.monashcoding.com` | Traefik host rule. Must be a `*.monashcoding.com` subdomain. |
| `AUTH_URL` | `https://auth.monashcoding.com` | Used by the server to verify tokens. |
| `VITE_AUTH_URL` | `https://auth.monashcoding.com` | Baked into the SPA at **build** time — changing it needs a rebuild, not a restart. |
| `MAC_ADMIN_ROLES` | `exec,committee` | Who can reach `/admin`. |
| `JWT_AUDIENCE` | `mac-suite` | Do not change. |

**Data and backups.** Everything lives in the `db-data` volume. It survives redeploys and
`docker compose down`; it is destroyed by `docker compose down -v`. Point Dokploy's volume
backup at it — the resource list is hand-curated and there is no other copy.

**Health.** `GET /api/health` returns `{"ok":true}`. The compose healthcheck polls it, so a
container that fails to start is visible in Dokploy rather than silently serving 502s.

### Testing the container locally

Docker builds and runs the same image Dokploy will:

```bash
docker network create dokploy-network        # once — Dokploy creates this on the VM
POSTGRES_PASSWORD=local docker compose -f docker-compose.yml -f docker-compose.local.yml up --build
```

Then open <http://localhost:3000>. `docker-compose.local.yml` only publishes a host port; it is
never auto-loaded, so it cannot affect production. `/admin` will show the sign-in screen and go
no further — see the note below about localhost.

### Local development

```bash
npm install
createdb mac_resource_hub                      # or point DATABASE_URL at any Postgres
npm run db:migrate && npm run db:seed
npm run dev          # API on :3000
npm run dev:web      # SPA on :5173, proxying /api to :3000
```

Public browsing works offline. **The `/admin` page will not work on `localhost`** — mac-auth
only trusts `https://*.monashcoding.com` origins, so its session cookie is never sent to
`localhost:5173`. To work on the admin UI, either deploy to a subdomain or ask whoever runs
mac-auth to add your dev origin to its `TRUSTED_ORIGINS`.

```bash
npm test          # unit tests (pure — no database needed)
npm run test:watch # re-runs the moment you save a file
npm run lint      # ESLint over server + SPA
npm run lint:fix  # ...and fix what it can automatically
npm run typecheck # server + SPA
npm run check     # lint + typecheck + tests, i.e. everything
npm run build     # compile server (tsc) + bundle SPA (vite)
```

The test suite is deliberately all **pure unit tests** — no database, no HTTP
server, no browser — so `npm test` works on a fresh clone with nothing running.
What it pins down is the logic that would be expensive to get wrong:

| File | What it guards |
|---|---|
| `src/server/content/tree.test.ts` | The visibility rule. Nothing hidden, pending, rejected or archived can reach a visitor. |
| `src/server/admin/reorder.test.ts` | Ordering maths — renumbering, and not dropping a sibling another committee member added mid-edit. |
| `src/server/admin/validate.test.ts` | Input normalisation and the schemas, including that the admin cannot set `pending`/`rejected`. |
| `web/src/search.test.ts` | The region search box's filtering. |
| `web/src/regions.test.ts` | Every region has a colour and a grid slot, no two share a slot, unknown slugs fall back. |

Linting is ESLint 9 flat config (`eslint.config.js`), type-aware, with a small
rule set: unused locals and imports, floating promises, and the React hook rules.
Unused *parameters* are not flagged — a signature is often fixed by the caller.
There is no Prettier: formatting is not enforced, so nobody is blocked by a comma.

---

## Adding a region (the one thing that needs a developer)

Regions are the fixed axis of the map, so each one needs a name, a colour, a grid slot and a
picture. Three files, same `slug` in all of them:

1. `src/server/db/seed.ts` — add an entry to `REGION_SEED` (slug, name, blurb, sortOrder, and
   its starter categories).
2. `web/src/regions.ts` — add a matching entry to `REGION_PRESENTATION` (accent colours and the
   `grid-area` slot). Check the new slot doesn't overlap an existing one.
3. `web/public/regions/<slug>.svg` — the artwork.

Redeploy. The seed inserts the new region and leaves every existing one untouched.

If the slugs don't match, the server logs a warning at boot and the region renders as a plain
grey card — it degrades, it doesn't crash.

**Never change an existing region's slug.** It's in public URLs (`/r/:slug`) and it's how a row
finds its artwork.

---

## For committee members

Go to `/admin` and sign in with your Monash account. If you're on the committee roster you'll
see every region as a tab.

- **Add a resource:** pick a region, find the category, "+ Add resource". Links must start with
  `https://`.
- **Reorder:** the ↑ / ↓ buttons. Order is what students see.
- **Hide vs Archive:** *Hide* keeps a resource in the admin but removes it from the public site
  (good for something temporarily out of date). *Archive* is the delete button — but it's
  reversible, and archived items stay listed under "N archived" with a Restore button.
- **Deleting a category** only works once it holds no resources at all, archived ones included.
  Move them to another category first (edit a resource to change its category). This is
  deliberate: it's the one action that could lose a lot of work.

Every change records who made it. An exec can see the last 100 changes at `GET /api/admin/audit`.

You cannot add or delete regions — that needs a developer (see above). You can rename, reorder
and hide them.

---

## Layout

```
src/server/
  index.ts                 Express app; serves the API and the built SPA
  auth/mac-auth.ts         mac-auth JWT verification (copied from the MAC Suite; don't edit)
  db/schema.ts             Drizzle schema — the data model
  db/seed.ts               REGION_SEED; idempotent, never overwrites committee edits
  content/tree.ts          Builds the nested tree; the ONLY place visibility rules live
  content/cache.ts         In-memory cached public tree + ETag
  admin/                   Category/resource operations, reorder maths, audit logging
  routes/                  content.ts (public) and admin.ts (committee only)
web/src/
  regions.ts               Region artwork/colour/grid map — must mirror seed.ts slugs
  pages/                   MapPage, RegionPage, AdminPage
  transition.ts            The map's zoom effect (View Transitions API + fallback)
```

See `CLAUDE.md` for the design decisions and the things that are easy to get wrong.
