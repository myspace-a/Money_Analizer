import { createCategory } from '../../src/domain/category.js';
import { createRule } from '../../src/domain/rule.js';
import { createTransaction } from '../../src/domain/transaction.js';
import { CategoryRepository } from '../../src/repositories/categoryRepository.js';
import { RuleRepository } from '../../src/repositories/ruleRepository.js';
import { TransactionRepository } from '../../src/repositories/transactionRepository.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';

/**
 * Runs a fixed sequence of repository operations against whatever Database
 * implementation is passed in, and returns a plain, JSON-serializable result
 * object describing what happened.
 *
 * This function contains NO test-framework-specific code (no `expect`, no
 * `describe`) so the exact same logic can run two ways:
 *  - directly, in Node, against NodeSqliteAdapter (tests/unit/repositories.spec.js)
 *  - inside a real browser page, against WasmSqliteAdapter (tests/e2e/persistence.spec.js)
 * The two results can then be compared for equality — that comparison IS the
 * adapter-parity check described in ARCHITECTURE.md §4.3.
 *
 * @param {import('../../src/persistence/db-port.js').Database} db
 * @returns {Promise<object>} a plain object summarizing the outcome
 */
export async function runRepositorySmokeTest(db) {
  await runMigrations(db);

  const categoryRepo = new CategoryRepository(db);
  const ruleRepo = new RuleRepository(db);
  const transactionRepo = new TransactionRepository(db);

  const groceries = createCategory({ name: 'Groceries' });
  await categoryRepo.insert(groceries);

  const rule = createRule({
    categoryId: groceries.id,
    matchType: 'merchant',
    matchValue: 'FARMACIA',
    priority: 5,
    source: 'default',
  });
  await ruleRepo.insert(rule);

  const transaction = createTransaction({
    date: '2026-03-14',
    valueDate: '2026-03-14',
    amountMinorUnits: -3500,
    description: 'Pagamento Carta presso FARMACIA SAN PANCRAZIO',
    rawDescription: 'Pagamento Carta presso FARMACIA SAN PANCRAZIO',
    merchant: 'FARMACIA SAN PANCRAZIO',
    transactionType: 'Pagamento Carta',
    categoryId: groceries.id,
    categorizationMethod: 'rule',
    fingerprint: 'fp-2026-03-14--3500-pagamento-carta',
  });
  await transactionRepo.insert(transaction);

  const foundCategory = await categoryRepo.findById(groceries.id);
  const foundTransaction = await transactionRepo.findById(transaction.id);
  const foundByFingerprint = await transactionRepo.findByFingerprint(transaction.fingerprint);
  const allCategories = await categoryRepo.findAll();
  const allRules = await ruleRepo.findAllOrderedByPriority();
  const allTransactions = await transactionRepo.findAll();

  return {
    categoryId: groceries.id,
    foundCategoryName: foundCategory?.name ?? null,
    foundTransactionAmount: foundTransaction?.amountMinorUnits ?? null,
    foundTransactionCategoryId: foundTransaction?.categoryId ?? null,
    duplicateLookupCount: foundByFingerprint.length,
    categoryCount: allCategories.length,
    ruleCount: allRules.length,
    firstRuleSource: allRules[0]?.source ?? null,
    transactionCount: allTransactions.length,
  };
}

/**
 * Framework-agnostic check of a runRepositorySmokeTest() result. Returns
 * {ok, errors} rather than throwing/using `expect`, so the same check can be
 * called from Vitest (Node) or from inside a Playwright browser page.
 *
 * categoryId is randomly generated per run (ids.js), so it's compared
 * relationally (the transaction's categoryId must equal the category's own
 * id) rather than against a hardcoded value.
 *
 * @param {object} result - output of runRepositorySmokeTest
 * @returns {{ok: boolean, errors: string[]}}
 */
export function checkSmokeTestResult(result) {
  const errors = [];
  const expectEqual = (label, actual, expected) => {
    if (actual !== expected) {
      errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  };

  expectEqual('foundCategoryName', result.foundCategoryName, 'Groceries');
  expectEqual('foundTransactionAmount', result.foundTransactionAmount, -3500);
  expectEqual('foundTransactionCategoryId', result.foundTransactionCategoryId, result.categoryId);
  expectEqual('duplicateLookupCount', result.duplicateLookupCount, 1);
  expectEqual('categoryCount', result.categoryCount, 1);
  expectEqual('ruleCount', result.ruleCount, 1);
  expectEqual('firstRuleSource', result.firstRuleSource, 'default');
  expectEqual('transactionCount', result.transactionCount, 1);

  return { ok: errors.length === 0, errors };
}
