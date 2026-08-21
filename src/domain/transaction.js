import { generateId } from './ids.js';
import { isValidMinorUnits } from './money.js';

export const CATEGORIZATION_METHODS = /** @type {const} */ ([
  'default',
  'rule',
  'learned',
  'manual',
  'uncategorized',
]);

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * @typedef {Object} Transaction
 * @property {string} id
 * @property {string} date - ISO 8601 date (YYYY-MM-DD), accounting date
 * @property {string|null} valueDate - ISO 8601 date, if known
 * @property {number} amountMinorUnits - signed integer; negative = expense, positive = income
 * @property {string} currency - ISO 4217 code, e.g. 'EUR'
 * @property {string} description - normalized description
 * @property {string|null} rawDescription - original bank text, preserved for
 *   explainability (PROJECT_SPEC.md §3.5), since extraction (e.g. merchant
 *   parsing) is inherently imperfect
 * @property {string|null} merchant - best-effort extracted merchant/counterparty
 * @property {string|null} transactionType - bank-provided transaction-type
 *   label (e.g. ING's CAUSALE). Deliberately generic, not "causale" — the
 *   internal model stays independent of any one bank's column names
 *   (PROJECT_SPEC.md §3.1, ARCHITECTURE.md §6a).
 * @property {string|null} categoryId
 * @property {'default'|'rule'|'learned'|'manual'|'uncategorized'} categorizationMethod
 * @property {number|null} categorizationConfidence - 0..1, when applicable
 * @property {Object|null} categorizationEvidence - why this method/category was
 *   chosen (PROJECT_SPEC.md §3.5) — e.g. which rule matched, or which prior
 *   transactions a learned suggestion was based on. Shape varies by method;
 *   populated by the categorization engine (Phase 3), not by this module.
 * @property {string} fingerprint - dedup fingerprint, derived from normalized
 *   (date, signed amount, transactionType, description) per ARCHITECTURE.md
 *   §6a; computed at the import boundary (Phase 2), not by this module
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * Creates a new Transaction. This is a low-level domain constructor — it
 * validates shape and invariants, but does not know about ING CSV columns,
 * fingerprint computation, or categorization rule matching. Those live in
 * their own modules (import boundary / Phase 2, categorization / Phase 3).
 *
 * @param {{
 *   date: string,
 *   valueDate?: string|null,
 *   amountMinorUnits: number,
 *   currency?: string,
 *   description: string,
 *   rawDescription?: string|null,
 *   merchant?: string|null,
 *   transactionType?: string|null,
 *   categoryId?: string|null,
 *   categorizationMethod?: string,
 *   categorizationConfidence?: number|null,
 *   categorizationEvidence?: Object|null,
 *   fingerprint: string,
 * }} input
 * @returns {Transaction}
 */
export function createTransaction({
  date,
  valueDate = null,
  amountMinorUnits,
  currency = 'EUR',
  description,
  rawDescription = null,
  merchant = null,
  transactionType = null,
  categoryId = null,
  categorizationMethod = 'uncategorized',
  categorizationConfidence = null,
  categorizationEvidence = null,
  fingerprint,
}) {
  if (!ISO_DATE_PATTERN.test(date)) {
    throw new TypeError(`Transaction date must be in YYYY-MM-DD format, got: ${date}`);
  }
  if (valueDate !== null && !ISO_DATE_PATTERN.test(valueDate)) {
    throw new TypeError(`Transaction valueDate must be in YYYY-MM-DD format, got: ${valueDate}`);
  }
  if (!isValidMinorUnits(amountMinorUnits)) {
    throw new TypeError('Transaction amountMinorUnits must be an integer number of minor units');
  }
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    throw new TypeError('Transaction requires a non-empty description');
  }
  if (!CATEGORIZATION_METHODS.includes(categorizationMethod)) {
    throw new TypeError(
      `Transaction categorizationMethod must be one of ${CATEGORIZATION_METHODS.join(', ')}`
    );
  }
  if (!fingerprint || typeof fingerprint !== 'string' || fingerprint.trim().length === 0) {
    throw new TypeError('Transaction requires a non-empty fingerprint');
  }

  const now = new Date().toISOString();
  return {
    id: generateId(),
    date,
    valueDate,
    amountMinorUnits,
    currency,
    description: description.trim(),
    rawDescription,
    merchant,
    transactionType,
    categoryId,
    categorizationMethod,
    categorizationConfidence,
    categorizationEvidence,
    fingerprint,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * @param {Transaction} transaction
 * @returns {boolean} true if the transaction is an expense (negative amount)
 */
export function isExpense(transaction) {
  return transaction.amountMinorUnits < 0;
}

/**
 * @param {Transaction} transaction
 * @returns {boolean} true if the transaction is income (positive amount)
 */
export function isIncome(transaction) {
  return transaction.amountMinorUnits > 0;
}
