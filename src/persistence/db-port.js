/**
 * The Database port. Repository code (src/repositories/*.js) depends only on
 * this shape — never on wa-sqlite or node:sqlite directly. This is what
 * keeps repository/domain code runnable under both NodeSqliteAdapter (tests)
 * and WasmSqliteAdapter (the real app), per ARCHITECTURE.md §3–§4.
 *
 * This file has no runtime code — it exists purely to document the shape
 * both adapters must implement, since plain JS has no compiler to enforce it.
 *
 * @typedef {Object} Database
 * @property {(sql: string, params?: any[]) => Promise<any[]>} query
 *   Runs a SELECT and returns all resulting rows as plain objects.
 * @property {(sql: string, params?: any[]) => Promise<{lastInsertId?: string, rowsAffected: number}>} execute
 *   Runs an INSERT/UPDATE/DELETE (or DDL) statement.
 * @property {(fn: (db: Database) => Promise<void>) => Promise<void>} transaction
 *   Runs fn inside a single SQLite transaction; rolls back on any thrown error.
 */

export {};
