import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

function createDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

// Lazy singleton — only creates connection when first accessed
let _db: ReturnType<typeof createDb> | null = null;
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    if (!_db) _db = createDb();
    return Reflect.get(_db, prop);
  },
});
