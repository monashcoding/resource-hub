import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { connectionString } from './index.js';

// Silence Postgres NOTICEs. Drizzle's migrator issues CREATE SCHEMA/TABLE
// IF NOT EXISTS for its own bookkeeping, so every redeploy after the first
// prints two error-shaped NOTICE objects. They are harmless, but a committee
// member reading the Dokploy logs cannot tell that — and log noise that looks
// like a failure is how real failures get ignored.
const client = postgres(connectionString, { max: 1, onnotice: () => {} });
const db = drizzle(client);

await migrate(db, { migrationsFolder: './drizzle' });
await client.end();
console.log('[migrate] migrations applied');
