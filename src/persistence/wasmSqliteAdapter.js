/**
 * WasmSqliteAdapter — implements the Database port (db-port.js) for the real
 * app (Android and Linux, both via browser/PWA), per ARCHITECTURE.md §4.3.
 *
 * All actual SQLite/OPFS work happens in db-worker.js, a dedicated Web
 * Worker — this class just sends messages and resolves/rejects a Promise per
 * request, correlated by an incrementing id.
 *
 * STATUS: written but not executed — this container has no browser to run a
 * Worker in (see Build Chat wrap-up notes). Needs a real run in a browser
 * (via the Playwright test, or by opening index.html directly) before being
 * trusted. Verify in particular: the worker actually starts, wa-sqlite loads
 * from the CDN, OPFS access is granted, and data survives a page reload.
 *
 * @implements {import('./db-port.js').Database}
 */
export class WasmSqliteAdapter {
  constructor() {
    this.worker = new Worker(new URL('./worker/db-worker.js', import.meta.url), {
      type: 'module',
    });
    this.nextId = 1;
    this.pending = new Map();

    this.worker.onmessage = (event) => {
      const { id, ok, result, error } = event.data;
      const pending = this.pending.get(id);
      if (!pending) return;
      this.pending.delete(id);
      if (ok) {
        pending.resolve(result);
      } else {
        pending.reject(new Error(error));
      }
    };

    this.worker.onerror = (event) => {
      // A worker-level error (e.g. failed to load) rejects every still-pending call.
      for (const [id, pending] of this.pending) {
        pending.reject(new Error(`Worker error: ${event.message}`));
        this.pending.delete(id);
      }
    };
  }

  /**
   * @param {string} type
   * @param {object} [payload]
   * @returns {Promise<any>}
   */
  _send(type, payload = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, type, ...payload });
    });
  }

  /**
   * Must be called once before any query/execute — spins up wa-sqlite and
   * opens the OPFS-backed database file inside the worker.
   * @returns {Promise<void>}
   */
  async init() {
    await this._send('init');
  }

  /**
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<any[]>}
   */
  async query(sql, params = []) {
    return this._send('query', { sql, params });
  }

  /**
   * @param {string} sql
   * @param {any[]} [params]
   * @returns {Promise<{lastInsertId?: string, rowsAffected: number}>}
   */
  async execute(sql, params = []) {
    return this._send('execute', { sql, params });
  }

  /**
   * @param {(db: import('./db-port.js').Database) => Promise<void>} fn
   * @returns {Promise<void>}
   */
  async transaction(fn) {
    await this._send('begin');
    try {
      await fn(this);
      await this._send('commit');
    } catch (err) {
      await this._send('rollback');
      throw err;
    }
  }

  close() {
    this.worker.terminate();
  }
}
