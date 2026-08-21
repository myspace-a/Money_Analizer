/**
 * Migration 0003 — Categorization evidence.
 *
 * Adds a single nullable column, `categorization_evidence`, to `transactions`.
 *
 * Why this is needed: migration 0001 already gave every transaction a
 * `categorization_method` and a `categorization_confidence`, but
 * PROJECT_SPEC.md §3.5 requires exposing *why* a transaction was
 * categorized — "method and relevant rule/evidence and confidence where
 * applicable." Method + confidence alone can't say "matched rule X" or
 * "learned from 4 prior transactions at this merchant." This column closes
 * that gap.
 *
 * Stored as a JSON string (TEXT) rather than a normalized table, matching
 * the precedent set in migration 0002 (`import_settings.column_mapping`):
 * the shape of "evidence" differs by categorization method (a rule id here,
 * a sample count there) and there's no requirement yet to query into
 * individual evidence fields — just to display them (PROJECT_SPEC.md §2,
 * avoid speculative complexity). The categorization engine (Phase 3) is
 * responsible for what goes in this JSON; this migration only adds storage
 * for it.
 *
 * Additive only, per ARCHITECTURE.md §6 — does not alter migrations 0001 or
 * 0002, and is nullable so existing rows (e.g. transactions imported before
 * this migration ran) remain valid with no evidence recorded.
 */
export default {
  version: 3,
  description: 'Transactions: add categorization_evidence column for explainability',
  sql: `
    ALTER TABLE transactions ADD COLUMN categorization_evidence TEXT;
  `,
};
