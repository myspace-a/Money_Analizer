import { DatabaseSync } from 'node:sqlite';

/**
 * NodeSqliteAdapter — implements the Database port (db-port.js) on top of
 * Node's built-in node:sqlite module.
 *
 * Used ONLY by Vitest tests (ARCHITECTURE.md §4.4). Never used by the real
 * app, which uses WasmSqliteAdapter instead. This exists so repository and
 * domain logic can be tested against a real SQLite engine without needing a
 * browser — chosen over better-sqlite3 specifically because it ships built
 * into Node (nothing to compile), avoiding the native-toolchain problems
 * documented from Build Chat 01.
 *
 * node:sqlite's DatabaseSync is synchronous; this adapter wraps it to match
 * the async Database port shape that WasmSqliteAdapter also has to satisfy
 * (WASM SQLite calls are genuinely async).
 *
 * @implements {import('./db-port.js').Database}
 */
export class NodeSqliteAdapter {
  /**
   * @param {string} [location] - ':memory:' (default) or a file path
   */
  constructor(location = ':memory:') {
    this.db = new DatabaseSync(location);
    this.db.exec('PRAGMA foreign_keys = ON;');
  }

  /**
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<any[]>}
   */
  async query(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  /**
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<{lastInsertId?: string, rowsAffected: number}>}
   */
  async execute(sql, params = []) {
    if (params.length === 0) {
      // No params: supports multi-statement SQL (used for migration DDL).
      this.db.exec(sql);
      return { rowsAffected: 0 };
    }

    const stmt = this.db.prepare(sql);
    const info = stmt.run(...params);
    return {
      lastInsertId:
        info.lastInsertRowid !== undefined ? String(info.lastInsertRowid) : undefined,
      rowsAffected: info.changes ?? 0,
    };
  }

  /**
   * @param {(db: import('./db-port.js').Database) => Promise<void>} fn
   * @returns {Promise<void>}
   */
  async transaction(fn) {
    this.db.exec('BEGIN;');
    try {
      await fn(this);
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  close() {
    this.db.close();
  }
}
