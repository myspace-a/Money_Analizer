/**
 * db-worker.js — runs inside a dedicated Web Worker, never on the main
 * thread. This is required, not a style choice: OPFS's fast synchronous
 * storage API (createSyncAccessHandle) only works inside a worker. wa-sqlite's
 * AccessHandlePoolVFS depends on it, so the whole database has to live here.
 *
 * The main thread (wasmSqliteAdapter.js) talks to this worker with
 * postMessage and never touches SQLite or OPFS directly.
 *
 * wa-sqlite is loaded from a CDN (jsdelivr, serving the npm package as
 * static files), matching how Chart.js is already loaded in this project —
 * no vendoring, no bundler, consistent with ARCHITECTURE.md §2/§5's
 * no-build-step approach. A service worker (added when the PWA manifest is
 * introduced, outside this Foundation phase) will need to cache this URL for
 * full offline installs — noted as a follow-up, not solved here.
 *
 * STATUS: written but not executed — this container has no browser
 * available to load a Worker in (see Build Chat wrap-up notes). Needs a real
 * run in a browser before being trusted.
 */

import SQLiteESMFactory from 'https://cdn.jsdelivr.net/npm/wa-sqlite@1.0.0/dist/wa-sqlite.mjs';
import * as SQLite from 'https://cdn.jsdelivr.net/npm/wa-sqlite@1.0.0/src/sqlite-api.js';
import { AccessHandlePoolVFS } from 'https://cdn.jsdelivr.net/npm/wa-sqlite@1.0.0/src/examples/AccessHandlePoolVFS.js';

const DB_FILENAME = 'money-map.sqlite3';

/** @type {import('wa-sqlite').SQLiteAPI} */
let sqlite3;
/** @type {number} */
let db;

async function init() {
  const module = await SQLiteESMFactory();
  sqlite3 = SQLite.Factory(module);

  // AccessHandlePoolVFS's constructor kicks off async OPFS setup itself
  // (tracked via .isReady) rather than exposing a static factory method.
  const vfs = new AccessHandlePoolVFS('/money-map-opfs');
  await vfs.isReady;
  // makeDefault=true so open_v2 below can omit the VFS name — the class's
  // own `name` getter is fixed ('AccessHandlePool'), not something we set,
  // so relying on the default avoids a name mismatch.
  sqlite3.vfs_register(vfs, true);

  db = await sqlite3.open_v2(
    DB_FILENAME,
    SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE
  );
}

/**
 * Runs a SQL statement with bound params, collecting result rows as plain
 * objects. Handles multi-statement SQL (e.g. migration DDL) when no params
 * are given, by iterating every statement in the string.
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<any[]>}
 */
async function runQuery(sql, params) {
  const rows = [];
  for await (const stmt of sqlite3.statements(db, sql)) {
    if (params.length > 0) {
      sqlite3.bind_collection(stmt, params);
    }
    const columnNames = sqlite3.column_names(stmt);
    while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
      const row = {};
      const values = sqlite3.row(stmt);
      columnNames.forEach((name, i) => {
        row[name] = values[i];
      });
      rows.push(row);
    }
  }
  return rows;
}

/**
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<{lastInsertId?: string, rowsAffected: number}>}
 */
async function runExecute(sql, params) {
  for await (const stmt of sqlite3.statements(db, sql)) {
    if (params.length > 0) {
      sqlite3.bind_collection(stmt, params);
    }
    await sqlite3.step(stmt);
  }
  return {
    rowsAffected: sqlite3.changes(db),
  };
}

self.onmessage = async (event) => {
  const { id, type, sql, params = [] } = event.data;
  try {
    if (type === 'init') {
      await init();
      self.postMessage({ id, ok: true });
      return;
    }
    if (type === 'query') {
      const rows = await runQuery(sql, params);
      self.postMessage({ id, ok: true, result: rows });
      return;
    }
    if (type === 'execute') {
      const result = await runExecute(sql, params);
      self.postMessage({ id, ok: true, result });
      return;
    }
    if (type === 'begin') {
      await runExecute('BEGIN;', []);
      self.postMessage({ id, ok: true });
      return;
    }
    if (type === 'commit') {
      await runExecute('COMMIT;', []);
      self.postMessage({ id, ok: true });
      return;
    }
    if (type === 'rollback') {
      await runExecute('ROLLBACK;', []);
      self.postMessage({ id, ok: true });
      return;
    }
    throw new Error(`Unknown message type: ${type}`);
  } catch (err) {
    self.postMessage({ id, ok: false, error: err.message });
  }
};
