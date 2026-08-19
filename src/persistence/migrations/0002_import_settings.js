/**
 * Migration 0002 — Import settings.
 *
 * Adds a table to persist import profiles (PROJECT_SPEC.md §3.1: "support a
 * configurable ING import profile" / "persist import settings"). A profile
 * stores which CSV column maps to which internal field, so the mapping only
 * has to be set up once and survives between sessions.
 *
 * Kept intentionally simple for the MVP (PROJECT_SPEC.md §2): one row per
 * named profile, column mapping stored as a JSON blob (TEXT) rather than a
 * normalized table, since there's no requirement yet to query into
 * individual mapping fields. `bank_id` exists so a second bank's profile
 * could be added later without a schema change — not because ING import
 * boundary independence (ARCHITECTURE.md §6) requires it now.
 *
 * Additive only, per ARCHITECTURE.md §6 — does not alter migration 0001.
 */
export default {
  version: 2,
  description: 'Import settings: persisted, configurable column mapping profiles',
  sql: `
    CREATE TABLE import_settings (
      id TEXT PRIMARY KEY,
      profile_name TEXT NOT NULL,
      bank_id TEXT NOT NULL DEFAULT 'ing-it',
      column_mapping TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX idx_import_settings_bank_id ON import_settings(bank_id);
  `,
};
