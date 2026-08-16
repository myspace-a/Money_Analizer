import migration0001 from './0001_initial_schema.js';

/**
 * Ordered list of all migrations, applied in array order by migrationRunner.js.
 * A future phase adds a new file here (e.g. 0002_....js) and appends it —
 * existing entries are never edited or reordered (ARCHITECTURE.md §6).
 * @type {Array<{version: number, description: string, sql: string}>}
 */
export const migrations = [migration0001];
