import { migrations } from './migrations/index.js';

/**
 * Ensures the schema_migrations tracking table exists. This table is
 * infrastructure for the runner itself, not a numbered migration — every
 * numbered migration assumes it already exists.
 * @param {import('./db-port.js').Database} db
 */
async function ensureMigrationsTable(db) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

/**
 * @param {import('./db-port.js').Database} db
 * @returns {Promise<Set<number>>} versions already applied
 */
async function getAppliedVersions(db) {
  const rows = await db.query('SELECT version FROM schema_migrations ORDER BY version;');
  return new Set(rows.map((row) => row.version));
}

/**
 * Applies all pending migrations, in order, to the given database. Safe to
 * call every time the app starts — already-applied migrations are skipped.
 * Each migration runs inside its own transaction: either it fully applies
 * and is recorded, or it fails and nothing from it is committed.
 *
 * @param {import('./db-port.js').Database} db
 * @returns {Promise<{applied: number[], skipped: number[]}>}
 */
export async function runMigrations(db) {
  await ensureMigrationsTable(db);
  const applied = await getAppliedVersions(db);

  const result = { applied: [], skipped: [] };

  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      result.skipped.push(migration.version);
      continue;
    }

    await db.transaction(async (tx) => {
      await tx.execute(migration.sql);
      await tx.execute(
        'INSERT INTO schema_migrations (version, description, applied_at) VALUES (?, ?, ?);',
        [migration.version, migration.description, new Date().toISOString()]
      );
    });

    result.applied.push(migration.version);
  }

  return result;
}
