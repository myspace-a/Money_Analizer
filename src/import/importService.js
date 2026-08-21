/**
 * importService.js — the incremental-import entry point (PROJECT_SPEC.md
 * §3.1). Orchestrates the pieces built for Phase 2: parses a raw ING CSV,
 * normalizes rows into transaction candidates, computes a fingerprint for
 * each, classifies each against existing data, and — only once a human has
 * reviewed and confirmed — inserts the ones that should be kept.
 *
 * Two-step flow, matching PROJECT_SPEC.md §3.2 ("allow user review of
 * duplicate candidates" / "never silently delete a transaction because it
 * appears similar"):
 *   1. prepareImport()  — parse + classify, no writes yet.
 *   2. commitImport()   — given the caller's per-row decisions, insert only
 *                          the rows decided to be imported.
 *
 * Existing transactions are never modified or deleted by this module —
 * "skip" simply means "don't insert this candidate."
 */

import { parseIngCsv } from './ingCsvParser.js';
import { extractMerchant } from './merchantExtractor.js';
import { computeFingerprint } from './fingerprint.js';
import { classifyCandidate } from './duplicateDetector.js';
import { createTransaction } from '../domain/transaction.js';
import { categorizeTransaction } from '../categorization/categorizationEngine.js';

/**
 * @typedef {Object} ImportCandidate
 * @property {number} rowNumber
 * @property {ReturnType<typeof import('./ingCsvParser.js').parseIngCsv>['rows'][number]} parsedRow
 * @property {string} fingerprint
 * @property {string|null} merchant
 * @property {import('./duplicateDetector.js').DuplicateClassification} classification
 */

/**
 * @typedef {Object} PrepareImportResult
 * @property {ImportCandidate[]} candidates
 * @property {Array<{rowNumber: number, reason: string, raw: Record<string,string>}>} skipped -
 *   rows the parser itself excluded (balance markers, malformed rows)
 */

/**
 * Parses and classifies a CSV file's rows. Makes no database writes.
 *
 * @param {string} csvText
 * @param {Record<string, string>} columnMapping
 * @param {import('../repositories/transactionRepository.js').TransactionRepository} transactionRepo
 * @returns {Promise<PrepareImportResult>}
 */
export async function prepareImport(csvText, columnMapping, transactionRepo) {
  const { rows, skipped } = parseIngCsv(csvText, columnMapping);

  const candidates = [];
  for (let i = 0; i < rows.length; i++) {
    const parsedRow = rows[i];
    const fingerprint = computeFingerprint({
      date: parsedRow.date,
      amountMinorUnits: parsedRow.amountMinorUnits,
      transactionType: parsedRow.transactionType,
      description: parsedRow.rawDescription,
    });
    const merchant = extractMerchant(parsedRow.rawDescription);
    const classification = await classifyCandidate(
      { date: parsedRow.date, amountMinorUnits: parsedRow.amountMinorUnits, fingerprint },
      transactionRepo
    );

    candidates.push({
      rowNumber: i,
      parsedRow,
      fingerprint,
      merchant,
      classification,
    });
  }

  return { candidates, skipped };
}

/**
 * Inserts the candidates the caller decided to import. Candidates not
 * present in `decisions` (or explicitly marked 'skip') are not inserted.
 *
 * Each inserted transaction is run through the categorization engine
 * (Phase 3, PROJECT_SPEC.md §3.3) before being saved, so imported
 * transactions land already categorized (by a user rule, a default rule, or
 * historical learning) instead of always starting as 'uncategorized'.
 *
 * @param {ImportCandidate[]} candidates
 * @param {Record<number, 'import'|'skip'>} decisions - keyed by candidate.rowNumber
 * @param {import('../repositories/transactionRepository.js').TransactionRepository} transactionRepo
 * @param {import('../repositories/ruleRepository.js').RuleRepository} ruleRepo
 * @returns {Promise<{ importedCount: number, skippedCount: number, imported: import('../domain/transaction.js').Transaction[] }>}
 */
export async function commitImport(candidates, decisions, transactionRepo, ruleRepo) {
  const imported = [];
  let skippedCount = 0;

  for (const candidate of candidates) {
    const decision = decisions[candidate.rowNumber] ?? defaultDecisionFor(candidate);
    if (decision !== 'import') {
      skippedCount++;
      continue;
    }

    const description = normalizeDisplayDescription(candidate.parsedRow.rawDescription);
    const rawDescription = candidate.parsedRow.rawDescription;
    const transactionType = candidate.parsedRow.transactionType || null;

    const categorization = await categorizeTransaction(
      { description, rawDescription, merchant: candidate.merchant, transactionType },
      { ruleRepo, transactionRepo }
    );

    const transaction = createTransaction({
      date: candidate.parsedRow.date,
      valueDate: candidate.parsedRow.valueDate,
      amountMinorUnits: candidate.parsedRow.amountMinorUnits,
      description,
      rawDescription,
      merchant: candidate.merchant,
      transactionType,
      fingerprint: candidate.fingerprint,
      categoryId: categorization.categoryId,
      categorizationMethod: categorization.categorizationMethod,
      categorizationConfidence: categorization.categorizationConfidence,
      categorizationEvidence: categorization.categorizationEvidence,
    });
    await transactionRepo.insert(transaction);
    imported.push(transaction);
  }

  return { importedCount: imported.length, skippedCount, imported };
}

/**
 * Default decision when the caller doesn't supply one explicitly: new rows
 * import automatically; anything flagged as a possible duplicate defaults
 * to skip, so a duplicate is only ever imported by an explicit choice
 * (PROJECT_SPEC.md §3.2 — never silently duplicate data either).
 * @param {ImportCandidate} candidate
 * @returns {'import'|'skip'}
 */
function defaultDecisionFor(candidate) {
  return candidate.classification.status === 'new' ? 'import' : 'skip';
}

/**
 * @param {string} rawDescription
 * @returns {string}
 */
function normalizeDisplayDescription(rawDescription) {
  return (rawDescription ?? '').replace(/\s+/g, ' ').trim();
}
