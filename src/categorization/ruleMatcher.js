/**
 * ruleMatcher.js — decides whether a single Rule matches a single
 * transaction candidate. Pure function, no I/O, no repository access — this
 * is what makes rule matching testable in isolation (ARCHITECTURE.md §7.2:
 * "categorization rule logic" is one of the four narrow Vitest areas).
 *
 * PROJECT_SPEC.md §3.3 requires rules to "support at least keyword/merchant
 * or description matching." Matching is case-insensitive substring matching
 * against the relevant transaction field — simple and predictable, so a
 * user can reason about why a rule did or didn't match (explainability,
 * §3.5), rather than a fuzzier scoring scheme.
 *
 * 'description' matching also checks `transactionType` (ING's CAUSALE
 * label, per ARCHITECTURE.md §6a) alongside `description`/`rawDescription`.
 * CAUSALE is a short, bank-provided text label, not meaningfully different
 * from a description substring for matching purposes — and the built-in
 * default rules (defaultRules.js) specifically target CAUSALE values (e.g.
 * "Accredito Stipendio/Pensione"), which live only in `transactionType`,
 * not in the free-text description. Without this, those default rules would
 * never match anything.
 */

/**
 * @typedef {Object} RuleMatchCandidate
 * @property {string|null} description
 * @property {string|null} rawDescription
 * @property {string|null} merchant
 * @property {string|null} transactionType
 */

/**
 * @param {import('../domain/rule.js').Rule} rule
 * @param {RuleMatchCandidate} transaction
 * @returns {boolean}
 */
export function matchesRule(rule, transaction) {
  if (!rule.enabled) return false;

  const needle = rule.matchValue.trim().toLowerCase();
  if (!needle) return false;

  switch (rule.matchType) {
    case 'merchant':
      return containsNeedle(transaction.merchant, needle);
    case 'description':
      return (
        containsNeedle(transaction.description, needle) ||
        containsNeedle(transaction.rawDescription, needle) ||
        containsNeedle(transaction.transactionType, needle)
      );
    case 'keyword':
      // A keyword can appear anywhere: description, raw description,
      // merchant, or the bank-provided transaction-type label — broader net
      // than 'description', matching the intent of a free-text keyword rule
      // (PROJECT_SPEC.md §3.3).
      return (
        containsNeedle(transaction.description, needle) ||
        containsNeedle(transaction.rawDescription, needle) ||
        containsNeedle(transaction.merchant, needle) ||
        containsNeedle(transaction.transactionType, needle)
      );
    default:
      return false;
  }
}

/**
 * Given rules already ordered by priority (user before default, then by
 * priority descending — RuleRepository.findAllOrderedByPriority), returns
 * the first one that matches, or null.
 *
 * @param {import('../domain/rule.js').Rule[]} orderedRules
 * @param {RuleMatchCandidate} transaction
 * @returns {import('../domain/rule.js').Rule|null}
 */
export function findFirstMatchingRule(orderedRules, transaction) {
  for (const rule of orderedRules) {
    if (matchesRule(rule, transaction)) {
      return rule;
    }
  }
  return null;
}

function containsNeedle(fieldValue, needle) {
  if (!fieldValue || typeof fieldValue !== 'string') return false;
  return fieldValue.toLowerCase().includes(needle);
}
