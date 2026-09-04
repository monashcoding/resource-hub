#!/bin/sh
set -e

# Apply pending Drizzle migrations before the server accepts traffic. The DB is
# guaranteed up by compose's depends_on: service_healthy, so this is a plain run
# rather than a retry loop.
echo "[entrypoint] applying migrations…"
node dist/server/db/migrate.js

# Insert any regions missing from the database. Idempotent and non-destructive:
# it never overwrites a name, blurb, order or visibility a committee member has
# edited, so it is safe to run on every boot.
echo "[entrypoint] seeding regions…"
node dist/server/db/seed.js

echo "[entrypoint] starting server…"
exec node dist/server/index.js
