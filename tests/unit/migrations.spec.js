import { describe, it, expect, afterEach } from 'vitest';
import { NodeSqliteAdapter } from '../../src/persistence/nodeSqliteAdapter.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';

describe('migrationRunner', () => {
  let db;

  afterEach(() => {
    db?.close();
  });

  it('applies all migrations to a fresh database', async () => {
    db = new NodeSqliteAdapter();
    const result = await runMigrations(db);

    expect(result.applied).toEqual([1, 2]);
    expect(result.skipped).toEqual([]);

    const tables = await db.query(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"
    );
    const tableNames = tables.map((t) => t.name);
    expect(tableNames).toEqual(
      expect.arrayContaining([
        'categories',
        'rules',
        'transactions',
        'import_settings',
        'schema_migrations',
      ])
    );
  });

  it('is idempotent — running twice does not reapply or error', async () => {
    db = new NodeSqliteAdapter();
    await runMigrations(db);
    const second = await runMigrations(db);

    expect(second.applied).toEqual([]);
    expect(second.skipped).toEqual([1, 2]);
  });

  it('records applied migrations in schema_migrations', async () => {
    db = new NodeSqliteAdapter();
    await runMigrations(db);

    const rows = await db.query('SELECT version, description FROM schema_migrations ORDER BY version;');
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.version)).toEqual([1, 2]);
  });

  it('preserves existing data when run again (non-destructive)', async () => {
    db = new NodeSqliteAdapter();
    await runMigrations(db);

    const now = new Date().toISOString();
    await db.execute(
      'INSERT INTO categories (id, name, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
      ['cat-1', 'Groceries', 1, now, now]
    );

    await runMigrations(db);

    const rows = await db.query('SELECT * FROM categories WHERE id = ?;', ['cat-1']);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Groceries');
  });
});
