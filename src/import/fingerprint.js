/**
 * fingerprint.js — derives the duplicate-detection fingerprint from
 * normalized transaction data (PROJECT_SPEC.md §3.2, ARCHITECTURE.md §6a).
 *
 * ING provides no transaction ID, so there is no natural key to rely on
 * instead — the fingerprint is built from (date, signed amount,
 * transactionType, description), normalized to be resilient to
 * insignificant text differences (case, extra whitespace) that shouldn't
 * turn the same real-world payment into a "new" transaction on re-import.
 *
 * This is a Tier 2 (Vitest) concern per ARCHITECTURE.md §7.2 — it's a pure
 * function with no I/O, exactly the kind of logic a fast unit test is the
 * better tool for.
 */

/**
 * Collapses whitespace and case so that trivial formatting differences
 * (double spaces, trailing whitespace, case) don't change the fingerprint
 * for what is otherwise the same transaction text.
 * @param {string} value
 * @returns {string}
 */
function normalizeText(value) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {{
 *   date: string,
 *   amountMinorUnits: number,
 *   transactionType?: string|null,
 *   description: string,
 * }} input
 * @returns {string} a stable fingerprint string
 */
export function computeFingerprint({ date, amountMinorUnits, transactionType, description }) {
  if (!date) throw new TypeError('computeFingerprint requires a date');
  if (typeof amountMinorUnits !== 'number' || !Number.isInteger(amountMinorUnits)) {
    throw new TypeError('computeFingerprint requires an integer amountMinorUnits');
  }

  const parts = [
    date,
    String(amountMinorUnits),
    normalizeText(transactionType),
    normalizeText(description),
  ];

  return parts.join('|');
}
