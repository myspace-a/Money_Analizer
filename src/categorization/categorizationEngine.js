/**
 * categorizationEngine.js — resolves the full categorization priority chain
 * for a single transaction candidate (PROJECT_SPEC.md §3.3):
 *
 *   1. custom user rule
 *   2. built-in default rule
 *   3. historical learning
 *   4. uncategorized
 *
 * This module only decides and explains — it never writes to the database
 * itself. The caller (importService.js during import, or a future manual
 * "recategorize" action) is responsible for actually persisting the result.
 *
 * Rule priority within steps 1–2 is already resolved by
 * RuleRepository.findAllOrderedByPriority() (user rules before default
 * rules, then by priority descending) — this module just walks that
 * already-ordered list once via ruleMatcher.findFirstMatchingRule().
 */

import { findFirstMatchingRule } from './ruleMatcher.js';
import { suggestFromHistory } from './learningEngine.js';

/**
 * @typedef {Object} CategorizationCandidate
 * @property {string|null} description
 * @property {string|null} rawDescription
 * @property {string|null} merchant
 * @property {string|null} transactionType
 */

/**
 * @typedef {Object} CategorizationResult
 * @property {string|null} categoryId
 * @property {'rule'|'default'|'learned'|'uncategorized'} categorizationMethod
 * @property {number|null} categorizationConfidence
 * @property {Object|null} categorizationEvidence
 */

/**
 * @param {CategorizationCandidate} candidate
 * @param {{
 *   ruleRepo: import('../repositories/ruleRepository.js').RuleRepository,
 *   transactionRepo: import('../repositories/transactionRepository.js').TransactionRepository,
 * }} deps
 * @returns {Promise<CategorizationResult>}
 */
export async function categorizeTransaction(candidate, { ruleRepo, transactionRepo }) {
  const orderedRules = await ruleRepo.findAllOrderedByPriority({ enabledOnly: true });
  const matchedRule = findFirstMatchingRule(orderedRules, candidate);

  if (matchedRule) {
    // A matched rule's own `source` tells us whether this was a user rule
    // (categorization method 'rule') or a built-in default rule (method
    // 'default') — both are "rule" matches, but PROJECT_SPEC.md §3.3 keeps
    // the two methods distinct so explainability can show which kind fired.
    return {
      categoryId: matchedRule.categoryId,
      categorizationMethod: matchedRule.source === 'default' ? 'default' : 'rule',
      categorizationConfidence: 1,
      categorizationEvidence: {
        type: 'rule',
        ruleId: matchedRule.id,
        ruleSource: matchedRule.source,
        matchType: matchedRule.matchType,
        matchValue: matchedRule.matchValue,
      },
    };
  }

  const learned = await suggestFromHistory(candidate, transactionRepo);
  if (learned) {
    return {
      categoryId: learned.categoryId,
      categorizationMethod: 'learned',
      categorizationConfidence: learned.confidence,
      categorizationEvidence: learned.evidence,
    };
  }

  return {
    categoryId: null,
    categorizationMethod: 'uncategorized',
    categorizationConfidence: null,
    categorizationEvidence: null,
  };
}
