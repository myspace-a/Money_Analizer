/**
 * learningEngine.js — the "historical learning" tier of categorization
 * priority (PROJECT_SPEC.md §3.4), used only when no user or default rule
 * matched a transaction.
 *
 * MVP scope: learns from **normalized merchant match against manually
 * categorized transactions only**. PROJECT_SPEC.md §3.4 lists several
 * possible signals ("exact/normalized merchant, similar descriptions,
 * transaction characteristics, repeated categorization") but MVP scope
 * (PROJECT_SPEC.md §2) means starting with the strongest, simplest one:
 * merchant match is exact-ish and easy to explain, and restricting the
 * source data to manual corrections means we're learning from what the
 * user actually decided, not from the app's own earlier guesses compounding
 * on themselves. Description-similarity matching is a reasonable future
 * enhancement, not built here — see wrap-up notes.
 *
 * Explainable and non-destructive by construction (§3.4, §3.5): this
 * module never writes anything, it only proposes a category + confidence +
 * evidence for the categorization engine to use.
 */

/**
 * @typedef {Object} LearningSuggestion
 * @property {string} categoryId
 * @property {number} confidence - agreement ratio among matching prior transactions, 0..1
 * @property {Object} evidence
 */

/**
 * @param {{merchant: string|null}} transaction
 * @param {import('../repositories/transactionRepository.js').TransactionRepository} transactionRepo
 * @returns {Promise<LearningSuggestion|null>} null if there's no merchant to
 *   learn from, or no manually-categorized history for it
 */
export async function suggestFromHistory(transaction, transactionRepo) {
  if (!transaction.merchant || typeof transaction.merchant !== 'string') {
    return null;
  }
  const normalizedMerchant = transaction.merchant.trim().toLowerCase();
  if (!normalizedMerchant) return null;

  const priorMatches = await transactionRepo.findManualByNormalizedMerchant(normalizedMerchant);
  if (priorMatches.length === 0) return null;

  const counts = new Map();
  for (const t of priorMatches) {
    if (!t.categoryId) continue;
    counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  let topCategoryId = null;
  let topCount = 0;
  for (const [categoryId, count] of counts) {
    if (count > topCount) {
      topCategoryId = categoryId;
      topCount = count;
    }
  }

  const confidence = topCount / priorMatches.length;

  return {
    categoryId: topCategoryId,
    confidence,
    evidence: {
      type: 'learned',
      merchant: transaction.merchant,
      sampleCount: priorMatches.length,
      agreeingCount: topCount,
    },
  };
}
