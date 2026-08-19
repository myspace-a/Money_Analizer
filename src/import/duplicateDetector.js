/**
 * duplicateDetector.js — classifies an incoming, normalized transaction
 * candidate against what's already stored, per PROJECT_SPEC.md §3.2.
 *
 * Three outcomes:
 *  - 'new'                — no matching fingerprint or date+amount found.
 *  - 'exact_duplicate'    — an existing transaction has the identical
 *                            fingerprint (same date, amount, type, and
 *                            normalized description).
 *  - 'probable_duplicate' — an existing transaction shares the same date
 *                            and signed amount but the fingerprint differs
 *                            (e.g. minor description wording differences).
 *                            This is a candidate for user review, never an
 *                            automatic decision.
 *
 * This module never deletes or silently discards anything — it only
 * classifies. The importService (which calls this) is what turns a
 * classification plus a user decision into an actual insert.
 */

/** @typedef {'new'|'exact_duplicate'|'probable_duplicate'} DuplicateStatus */

/**
 * @typedef {Object} DuplicateClassification
 * @property {DuplicateStatus} status
 * @property {import('../domain/transaction.js').Transaction[]} matches - existing
 *   transactions that matched (empty for 'new')
 */

/**
 * @param {{date: string, amountMinorUnits: number, fingerprint: string}} candidate
 * @param {import('../repositories/transactionRepository.js').TransactionRepository} transactionRepo
 * @returns {Promise<DuplicateClassification>}
 */
export async function classifyCandidate(candidate, transactionRepo) {
  const exactMatches = await transactionRepo.findByFingerprint(candidate.fingerprint);
  if (exactMatches.length > 0) {
    return { status: 'exact_duplicate', matches: exactMatches };
  }

  const sameDateAndAmount = await transactionRepo.findByDateAndAmount(
    candidate.date,
    candidate.amountMinorUnits
  );
  if (sameDateAndAmount.length > 0) {
    return { status: 'probable_duplicate', matches: sameDateAndAmount };
  }

  return { status: 'new', matches: [] };
}
