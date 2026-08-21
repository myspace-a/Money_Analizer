/**
 * defaultRules.js — built-in default categorization rules and the default
 * categories they point to.
 *
 * PROJECT_SPEC.md §3.3 requires default rules to be "separate from user
 * rules and versionable" — that's already handled by the existing `rules`
 * table (`source: 'default'`, `ruleVersion`), not by anything in this file.
 * This file only defines *what* the default rules are.
 *
 * Each entry matches on ING's own transaction-type label (CAUSALE),
 * documented as a strong, bank-provided signal in ARCHITECTURE.md §6a — a
 * more reliable starting point than guessing from free-text descriptions.
 * Deliberately a small, MVP-scoped set (PROJECT_SPEC.md §2: avoid
 * speculative complexity) — a user can add their own rules for anything
 * more specific via the rules screen.
 */

/**
 * @typedef {Object} DefaultRuleSeed
 * @property {string} categoryName - default category this rule points to;
 *   created on first run if it doesn't already exist (see seedDefaults.js)
 * @property {'keyword'|'merchant'|'description'} matchType
 * @property {string} matchValue
 * @property {number} priority
 */

/** @type {DefaultRuleSeed[]} */
export const DEFAULT_RULE_SEEDS = [
  {
    categoryName: 'Salary / Pension',
    matchType: 'description',
    matchValue: 'Accredito Stipendio/Pensione',
    priority: 10,
  },
  {
    categoryName: 'Cash Withdrawal',
    matchType: 'description',
    matchValue: 'Prelievo Carta',
    priority: 10,
  },
  {
    categoryName: 'Transfer',
    matchType: 'description',
    matchValue: 'Bonifico In Uscita',
    priority: 10,
  },
  {
    categoryName: 'Bills',
    matchType: 'description',
    matchValue: 'Addebito Diretto',
    priority: 10,
  },
  {
    categoryName: 'Card Payment',
    matchType: 'description',
    matchValue: 'Pagamento Carta',
    // Lower priority than the above: "Pagamento Carta" is ING's generic
    // card-payment label and would otherwise shadow more specific rules
    // (e.g. a user rule for a particular merchant) if it ran first. User
    // rules already always outrank default rules regardless of priority
    // (RuleRepository.findAllOrderedByPriority), but keeping this lowest
    // among defaults too means a future, more specific default rule could
    // still take precedence over this catch-all.
    priority: 1,
  },
];

/**
 * Distinct category names referenced by the seed rules, in the order they
 * should be created.
 * @returns {string[]}
 */
export function defaultCategoryNames() {
  return [...new Set(DEFAULT_RULE_SEEDS.map((seed) => seed.categoryName))];
}
