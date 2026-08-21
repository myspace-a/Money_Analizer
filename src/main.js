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

window.MoneyMapApp = {
  insertSampleTransaction,
  listTransactions,
  correctTransactionCategory,
};

init().catch((err) => {
  statusEl.textContent = `Failed to initialize database: ${err.message}`;
  console.error(err);
});
