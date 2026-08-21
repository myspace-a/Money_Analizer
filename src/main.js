/**
 * main.js — app entry point. Not the real UI (that's Phase 4 onward) — this
 * wires together whatever exists so far: on load, run migrations, seed
 * built-in default categories/rules (Phase 3), render a minimal one-line
 * transaction list, and mount the import screen (Phase 2) and rules screen
 * (Phase 3). Also exposes a few operations on `window.MoneyMapApp` so
 * Playwright tests can drive things a full UI doesn't exist for yet (e.g.
 * manual correction, ahead of Phase 4's transaction editor).
 *
 * STATUS: written but not executed in this container (no browser
 * available). Needs a real run before being trusted — see Build Chat
 * wrap-up notes.
 */
import { WasmSqliteAdapter } from './persistence/wasmSqliteAdapter.js';
import { runMigrations } from './persistence/migrationRunner.js';
import { CategoryRepository } from './repositories/categoryRepository.js';
import { TransactionRepository } from './repositories/transactionRepository.js';
import { ImportSettingsRepository } from './repositories/importSettingsRepository.js';
import { RuleRepository } from './repositories/ruleRepository.js';
import { createCategory } from './domain/category.js';
import { createTransaction } from './domain/transaction.js';
import { formatMinorUnits } from './domain/money.js';
import { initImportUI } from './import.js';
import { initRulesUI } from './rules.js';
import { seedDefaults } from './categorization/seedDefaults.js';
import { applyManualCategory } from './categorization/manualCorrection.js';

const statusEl = document.getElementById('status');
const listEl = document.getElementById('transaction-list');
const importSectionEl = document.getElementById('import-section');
const rulesSectionEl = document.getElementById('rules-section');

let db;
let categoryRepo;
let transactionRepo;
let importSettingsRepo;
let ruleRepo;

async function init() {
  db = new WasmSqliteAdapter();
  await db.init();
  await runMigrations(db);
  categoryRepo = new CategoryRepository(db);
  transactionRepo = new TransactionRepository(db);
  importSettingsRepo = new ImportSettingsRepository(db);
  ruleRepo = new RuleRepository(db);

  // Built-in default categories/rules (Phase 3). Idempotent — safe to call
  // on every startup, same as runMigrations() above.
  await seedDefaults(categoryRepo, ruleRepo);

  statusEl.textContent = 'Database ready.';
  await renderTransactions();

  initImportUI({
    root: importSectionEl,
    transactionRepo,
    importSettingsRepo,
    ruleRepo,
    onImportCommitted: renderTransactions,
  });

  initRulesUI({
    root: rulesSectionEl,
    ruleRepo,
    categoryRepo,
  });
}

/**
 * Inserts one sample transaction, creating a demo category the first time.
 * Exposed on window.MoneyMapApp for the Playwright test to call.
 * @returns {Promise<object>} the inserted transaction
 */
async function insertSampleTransaction() {
  let categories = await categoryRepo.findAll();
  let category = categories[0];
  if (!category) {
    category = createCategory({ name: 'Demo' });
    await categoryRepo.insert(category);
  }

  const transaction = createTransaction({
    date: '2026-03-14',
    amountMinorUnits: -1250,
    description: 'Demo transaction',
    categoryId: category.id,
    categorizationMethod: 'manual',
    fingerprint: `demo-${Date.now()}-${Math.random()}`,
  });
  await transactionRepo.insert(transaction);
  await renderTransactions();
  return transaction;
}

/**
 * Exposed on window.MoneyMapApp for the Playwright test to call after reload.
 * @returns {Promise<object[]>}
 */
async function listTransactions() {
  return transactionRepo.findAll();
}

/**
 * Minimal one-line rendering. Appends category name + categorization method
 * so Phase 3's output is actually visible without waiting for Phase 4's
 * real transaction table (search/filter/sort/details/explanation) — this is
 * not that table, just enough to see what happened during this Build Chat.
 */
async function renderTransactions() {
  const [transactions, categories] = await Promise.all([
    transactionRepo.findAll(),
    categoryRepo.findAll({ includeInactive: true }),
  ]);
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));

  listEl.innerHTML = '';
  for (const t of transactions) {
    const li = document.createElement('li');
    const categoryLabel = t.categoryId
      ? (categoryNameById.get(t.categoryId) ?? 'unknown category')
      : 'uncategorized';
    li.textContent = `${t.date} — ${t.description} — ${formatMinorUnits(t.amountMinorUnits)} — [${categoryLabel} / ${t.categorizationMethod}]`;
    li.dataset.transactionId = t.id;
    li.dataset.categorizationMethod = t.categorizationMethod;
    listEl.appendChild(li);
  }
}

/**
 * Exposed on window.MoneyMapApp for the Playwright test to drive a manual
 * correction directly — Phase 4 owns the actual transaction-editing UI, but
 * the underlying categorization behavior (PROJECT_SPEC.md §3.4) belongs to
 * this phase and needs a way to be exercised end-to-end until that UI exists.
 * @param {string} transactionId
 * @param {string} categoryId
 * @returns {Promise<object>}
 */
async function correctTransactionCategory(transactionId, categoryId) {
  const transaction = await transactionRepo.findById(transactionId);
  const updated = await applyManualCategory(transaction, categoryId, transactionRepo);
  await renderTransactions();
  return updated;
}

/**
 * Dev-only utility exposed on window.MoneyMapApp — NOT part of the app's UI
 * (PROJECT_SPEC.md §4 requires the app itself to never silently delete
 * financial data; this is a deliberate, explicit console action for local
 * testing, not a feature the app exposes to a user).
 *
 * Closes the WasmSqliteAdapter (terminates the worker, which releases the
 * OPFS SyncAccessHandle lock db-worker.js holds on money-map.sqlite3 while
 * the app is running — that lock is exactly what caused the earlier
 * "DOMException: No modification allowed" when trying to delete the file
 * out from under a running page), deletes every file in the app's own OPFS
 * directory (`money-map-opfs` — never touches other origins/paths, e.g.
 * sibling GitHub Pages projects sharing this origin), then reloads.
 *
 * Usage from the browser console:
 *   window.MoneyMapApp.resetDatabase({ confirm: true })
 * The `confirm: true` is required on purpose, so this can't be triggered
 * by an accidental or pasted call with no arguments.
 *
 * @param {{ confirm: boolean }} options
 * @returns {Promise<void>}
 */
async function resetDatabase({ confirm } = {}) {
  if (confirm !== true) {
    throw new Error(
      'resetDatabase requires explicit confirmation: window.MoneyMapApp.resetDatabase({ confirm: true })'
    );
  }

  console.warn('Resetting Money Map local database — this deletes all local transactions, categories, and rules.');

  db.close();

  const root = await navigator.storage.getDirectory();
  const opfsDir = await root.getDirectoryHandle('money-map-opfs');
  for await (const name of opfsDir.keys()) {
    await opfsDir.removeEntry(name);
  }

  console.warn('Database files removed. Reloading…');
  location.reload();
}

window.MoneyMapApp = {
  insertSampleTransaction,
  listTransactions,
  correctTransactionCategory,
  resetDatabase,
};

init().catch((err) => {
  statusEl.textContent = `Failed to initialize database: ${err.message}`;
  console.error(err);
});
