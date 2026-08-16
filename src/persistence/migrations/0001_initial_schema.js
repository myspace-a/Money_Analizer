/**
 * Migration 0001 — Initial schema.
 *
 * Creates the core tables for Phase 1 (Foundation): transactions, categories,
 * rules, and the schema_migrations tracking table itself.
 *
 * Deliberately excluded from this migration (per PROJECT_SPEC.md §2, "avoid
 * speculative complexity"): anything ING-import-specific. The importer
 * (Phase 2) normalizes ING's columns into this generic model at the import
 * boundary (ARCHITECTURE.md §6, §6a) — this schema does not know ING column
 * names.
 *
 * Migrations must be additive/non-destructive (ARCHITECTURE.md §6): later
 * phases add columns/tables via new numbered migrations, never by editing
 * this file.
 */
export default {
  version: 1,
  description: 'Initial schema: transactions, categories, rules',
  sql: `
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE rules (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES categories(id),
      match_type TEXT NOT NULL CHECK (match_type IN ('keyword', 'merchant', 'description')),
      match_value TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 0,
      enabled INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL CHECK (source IN ('user', 'default')) DEFAULT 'user',
      rule_version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX idx_rules_category_id ON rules(category_id);

    CREATE TABLE transactions (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      value_date TEXT,
      amount_minor_units INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'EUR',
      description TEXT NOT NULL,
      raw_description TEXT,
      merchant TEXT,
      transaction_type TEXT,
      category_id TEXT REFERENCES categories(id),
      categorization_method TEXT NOT NULL
        CHECK (categorization_method IN ('default', 'rule', 'learned', 'manual', 'uncategorized'))
        DEFAULT 'uncategorized',
      categorization_confidence REAL,
      fingerprint TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX idx_transactions_date ON transactions(date);
    CREATE INDEX idx_transactions_category_id ON transactions(category_id);
    CREATE INDEX idx_transactions_fingerprint ON transactions(fingerprint);
  `,
};
