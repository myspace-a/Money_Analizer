import migration0001 from './0001_initial_schema.js';
import migration0002 from './0002_import_settings.js';
import migration0003 from './0003_categorization_evidence.js';

/**
 * Ordered list of all migrations, applied in array order by migrationRunner.js.
 * A future phase adds a new file here (e.g. 0004_....js) and appends it —
 * existing entries are never edited or reordered (ARCHITECTURE.md §6).
 * @type {Array<{version: number, description: string, sql: string}>}
 */
export const migrations = [migration0001, migration0002, migration0003];
