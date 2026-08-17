import { generateId } from './ids.js';

export const MATCH_TYPES = /** @type {const} */ (['keyword', 'merchant', 'description']);
export const RULE_SOURCES = /** @type {const} */ (['user', 'default']);

/**
 * @typedef {Object} Rule
 * @property {string} id
 * @property {string} categoryId
 * @property {'keyword'|'merchant'|'description'} matchType
 * @property {string} matchValue
 * @property {number} priority - higher runs first
 * @property {boolean} enabled
 * @property {'user'|'default'} source - user rules always outrank default rules,
 *   regardless of priority value (PROJECT_SPEC.md §3.3) — priority orders
 *   within the same source.
 * @property {number} ruleVersion - lets built-in default rules evolve
 *   independently of user rules (PROJECT_SPEC.md §3.3).
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * Creates a new categorization Rule.
 * @param {{categoryId: string, matchType: string, matchValue: string, priority?: number, enabled?: boolean, source?: string, ruleVersion?: number}} input
 * @returns {Rule}
 */
export function createRule({
  categoryId,
  matchType,
  matchValue,
  priority = 0,
  enabled = true,
  source = 'user',
  ruleVersion = 1,
}) {
  if (!categoryId) {
    throw new TypeError('Rule requires a categoryId');
  }
  if (!MATCH_TYPES.includes(matchType)) {
    throw new TypeError(`Rule matchType must be one of ${MATCH_TYPES.join(', ')}`);
  }
  if (!matchValue || typeof matchValue !== 'string' || matchValue.trim().length === 0) {
    throw new TypeError('Rule requires a non-empty matchValue');
  }
  if (!RULE_SOURCES.includes(source)) {
    throw new TypeError(`Rule source must be one of ${RULE_SOURCES.join(', ')}`);
  }

  const now = new Date().toISOString();
  return {
    id: generateId(),
    categoryId,
    matchType,
    matchValue: matchValue.trim(),
    priority,
    enabled,
    source,
    ruleVersion,
    createdAt: now,
    updatedAt: now,
  };
}
