import { generateId } from './ids.js';

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name
 * @property {boolean} active
 * @property {string} createdAt - ISO 8601 datetime
 * @property {string} updatedAt - ISO 8601 datetime
 */

/**
 * Creates a new Category with a generated id and sensible defaults.
 * Categories use stable internal ids; name is never treated as an
 * identifier (ARCHITECTURE.md §6, PROJECT_SPEC.md §3.6).
 *
 * @param {{name: string}} input
 * @returns {Category}
 */
export function createCategory({ name }) {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new TypeError('Category requires a non-empty name');
  }
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: name.trim(),
    active: true,
    createdAt: now,
    updatedAt: now,
  };
}
