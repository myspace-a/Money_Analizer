/**
 * main.js — Phase 1 entry point. Proves persistence works: on load, run
 * migrations, insert one sample transaction if the database is empty,
 * render whatever is stored, and expose the same operations on
 * `window.MoneyMapApp` so the Playwright acceptance test can drive them
 * directly (open page, insert, reload page, confirm data survived).
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
import { createCategory } from './domain/category.js';
import { createTransaction } from './domain/transaction.js';
import { formatMinorUnits } from './domain/money.js';
import { initImportUI } from './import.js';

const statusEl = document.getElementById('status');
const listEl = document.getElementById('transaction-list');
const importSectionEl = document.getElementById('import-section');

let db;
let categoryRepo;
let transactionRepo;
let importSettingsRepo;

async function init() {
  db = new WasmSqliteAdapter();
  await db.init();
  await runMigrations(db);
  categoryRepo = new CategoryRepository(db);
  transactionRepo = new TransactionRepository(db);
  importSettingsRepo = new ImportSettingsRepository(db);
  statusEl.textContent = 'Database ready.';
  await renderTransactions();

  initImportUI({
    root: importSectionEl,
    transactionRepo,
    importSettingsRepo,
    onImportCommitted: renderTransactions,
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

async function renderTransactions() {
  const transactions = await transactionRepo.findAll();
  listEl.innerHTML = '';
  for (const t of transactions) {
    const li = document.createElement('li');
    li.textContent = `${t.date} — ${t.description} — ${formatMinorUnits(t.amountMinorUnits)}`;
    li.dataset.transactionId = t.id;
    listEl.appendChild(li);
  }
}

window.MoneyMapApp = { insertSampleTransaction, listTransactions };

init().catch((err) => {
  statusEl.textContent = `Failed to initialize database: ${err.message}`;
  console.error(err);
});
