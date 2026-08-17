/**
 * Stable ID generation for domain entities.
 * ARCHITECTURE.md §6: transactions and categories use stable internal UUIDs;
 * display names are never identifiers.
 *
 * Uses the platform's built-in crypto.randomUUID() — available in Node 22+
 * and in all target browsers — so no extra dependency is needed.
 */

/**
 * @returns {string} a new random UUID (v4)
 */
export function generateId() {
  return crypto.randomUUID();
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param {string} value
 * @returns {boolean} true if value looks like a valid UUID
 */
export function isValidId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
