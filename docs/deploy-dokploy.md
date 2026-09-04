# Deploying to Dokploy

`mac-resource-hub` ships as a single app container (SPA + API) plus Postgres, defined in
[`docker-compose.yml`](../docker-compose.yml). This mirrors the rest of the MAC Suite: a Dokploy
compose stack on the Oracle VM, behind Traefik.

## Prerequisites

- A DNS record for **`resources.monashcoding.com`** pointing at the Oracle VM.
  - The app **must** be served under `*.monashcoding.com`. mac-auth sets its session cookie on
    `.monashcoding.com` and trusts that origin automatically. On any other host, `/admin`
    sign-in silently fails — the cookie is never sent. (An off-domain host would have to be
    added to mac-auth's `TRUSTED_ORIGINS`; avoid this.)
- Dokploy running on the VM, with access to `monashcoding/resource-hub`.

## 1. Create the Compose service

In Dokploy:

1. **Create → Compose**, provider **GitHub**, repo `monashcoding/resource-hub`, branch `main`,
   compose path `docker-compose.yml`.
2. Save. Don't deploy yet — set the environment first.

## 2. Environment variables (Dokploy → Environment)

Only one is genuinely required. See [`.env.example`](../.env.example) for the same list.

| Variable | Required | Notes |
|----------|----------|-------|
| `POSTGRES_PASSWORD` | **recommended** | Postgres password (also used in `DATABASE_URL`). Defaults to the project name if unset — set a real one: `openssl rand -base64 24`. |
| `APP_DOMAIN` | optional | Defaults to `resources.monashcoding.com`. Must be a `*.monashcoding.com` host. |
| `AUTH_URL` | optional | Defaults to `https://auth.monashcoding.com`. |
| `VITE_AUTH_URL` | optional | **Build-time** — baked into the SPA bundle. Changing it needs a rebuild, not a restart. Defaults to the prod auth URL. |
| `JWT_AUDIENCE` | optional | Defaults to `mac-suite`. Don't change. |
| `MAC_ADMIN_ROLES` | optional | Defaults to `exec,committee` — who can reach `/admin`. |

## 3. Domain

Add a domain in Dokploy: host `resources.monashcoding.com`, **container port `3000`**, HTTPS on
(Let's Encrypt). Dokploy's Traefik routes the domain to the app container.

`docker-compose.yml` also carries Traefik labels for the same host, so the routing works whether
Dokploy manages the domain or Traefik reads the labels directly.

## 4. Deploy

Hit **Deploy**. On container start the entrypoint runs, in order:

1. `dist/server/db/migrate.js` — applies Drizzle migrations.
2. `dist/server/db/seed.js` — inserts any regions missing from the database.
3. the server.

So there is no manual migration or seeding step. A healthy **first** deploy logs:

```
[entrypoint] applying migrations…
[migrate] migrations applied
[entrypoint] seeding regions…
[seed] created region "starting-comp-sci"
[seed] created region "internships-careers"
[seed] created region "postgrad-grad-jobs"
[seed] created region "competitive-programming"
[seed] done
[entrypoint] starting server…
mac-resource-hub listening on :3000
```

Every **later** deploy logs the same thing minus the "created region" lines — the seed is
idempotent and never overwrites a name, blurb, order or visibility that a committee member has
edited:

```
[entrypoint] applying migrations…
[migrate] migrations applied
[entrypoint] seeding regions…
[seed] done
[entrypoint] starting server…
mac-resource-hub listening on :3000
```

## 5. Auto-deploy on push

Dokploy → the service → **Deployments / Git → enable "Auto Deploy."** Dokploy registers a
webhook on the GitHub repo so every push to `main` rebuilds and redeploys.

To wire it by hand instead: copy the service's **Webhook URL** from Dokploy and add it under
GitHub repo **Settings → Webhooks** (content type `application/json`, event: push).

## 6. Verify the deployment

```bash
# Health (no auth):
curl -s https://resources.monashcoding.com/api/health
# → {"ok":true,"service":"mac-resource-hub"}

# The public content tree — four regions on a fresh deploy:
curl -s https://resources.monashcoding.com/api/content | head -c 300

# Admin must be gated:
curl -s -o /dev/null -w '%{http_code}\n' https://resources.monashcoding.com/api/admin/tree
# → 401
```

Then manually: open `https://resources.monashcoding.com/`, click a region (the card should zoom
into the region page), and go to `/admin` and sign in. A committee/exec account should see the
region tabs; anyone else gets "Committee access required".

## 7. Backups

All content lives in the `db-data` volume. It survives redeploys and `docker compose down`; it
is destroyed by `docker compose down -v`. **Point Dokploy's volume backup at it** — the resource
list is hand-curated by committee members and there is no other copy of it.

## Troubleshooting

| Symptom | Cause |
|---------|-------|
| Site loads but `/admin` sign-in does nothing | Not served from a `*.monashcoding.com` host, so mac-auth's cookie is never sent. Check the domain. |
| Signed in but "Committee access required" | The account isn't on the MAC committee roster (curated in Notion, synced into mac-auth hourly). Not fixable in this app. |
| A region shows as a plain grey card | Its slug exists in the database but not in `web/src/regions.ts`. The server logs a `[artwork]` warning at boot naming the slug. |
| Edited the database directly, site unchanged | The public tree is cached in memory and only busted by admin writes. Restart the app container. |
| Build fails on esbuild/vite binaries | `.dockerignore` was removed, so the host's `node_modules` got copied over the Linux ones. Restore it. |
