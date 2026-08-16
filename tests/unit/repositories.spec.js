import { describe, it, expect, afterEach } from 'vitest';
import { NodeSqliteAdapter } from '../../src/persistence/nodeSqliteAdapter.js';
import { runRepositorySmokeTest, checkSmokeTestResult } from '../shared/repositorySmokeTest.js';

describe('repositories (NodeSqliteAdapter)', () => {
  let db;

  afterEach(() => {
    db?.close();
  });

  it('insert/find round-trips correctly for category, rule, and transaction', async () => {
    db = new NodeSqliteAdapter();
    const result = await runRepositorySmokeTest(db);
    const check = checkSmokeTestResult(result);

    expect(check.errors).toEqual([]);
    expect(check.ok).toBe(true);
  });

  it('a failed transaction() call rolls back and leaves no partial data', async () => {
    db = new NodeSqliteAdapter();
    const { runMigrations } = await import('../../src/persistence/migrationRunner.js');
    await runMigrations(db);

    await expect(
      db.transaction(async (tx) => {
        await tx.execute(
          'INSERT INTO categories (id, name, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
          ['cat-rollback', 'ShouldNotPersist', 1, new Date().toISOString(), new Date().toISOString()]
        );
        throw new Error('simulated failure mid-transaction');
      })
    ).rejects.toThrow('simulated failure mid-transaction');

    const rows = await db.query('SELECT * FROM categories WHERE id = ?;', ['cat-rollback']);
    expect(rows).toHaveLength(0);
  });
});
