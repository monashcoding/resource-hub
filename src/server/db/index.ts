import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export const connectionString =
  process.env.DATABASE_URL ??
  'postgres://mac_resource_hub:mac_resource_hub@localhost:5432/mac_resource_hub';

// Single shared connection pool for the app.
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { schema };
