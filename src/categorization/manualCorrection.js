/**
 * manualCorrection.js — applies a user's manual category choice to a
 * transaction (PROJECT_SPEC.md §3.4: "Manual corrections must remain
 * possible and may provide future learning data").
 *
 * This is the one function Phase 4's transaction-editing UI (not built in
 * this Build Chat — see CHAT_BUILD_TEMPLATE.md scope) will call when a user
 * picks a category for a transaction. It's included here because it belongs
 * to the categorization domain, not the transaction-table UI: setting
 * `categorizationMethod` to 'manual' and full confidence is a categorization
 * decision, and it's what future learning (learningEngine.js) reads back
 * from (`findManualByNormalizedMerchant`).
 *
 * A manual correction always wins outright — there's no "confidence" for a
 * human decision, and it's never treated as a suggestion.
 */

/**
 * @param {import('../domain/transaction.js').Transaction} transaction
 * @param {string} categoryId
 * @param {import('../repositories/transactionRepository.js').TransactionRepository} transactionRepo
 * @returns {Promise<import('../domain/transaction.js').Transaction>} the updated transaction
 */
export async function applyManualCategory(transaction, categoryId, transactionRepo) {
  if (!categoryId || typeof categoryId !== 'string') {
    throw new TypeError('applyManualCategory requires a categoryId');
  }

  const updated = {
    ...transaction,
    categoryId,
    categorizationMethod: 'manual',
    categorizationConfidence: 1,
    categorizationEvidence: { type: 'manual' },
    updatedAt: new Date().toISOString(),
  };

  await transactionRepo.update(updated);
  return updated;
}
