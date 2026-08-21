import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { NodeSqliteAdapter } from '../../src/persistence/nodeSqliteAdapter.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import { CategoryRepository } from '../../src/repositories/categoryRepository.js';
import { RuleRepository } from '../../src/repositories/ruleRepository.js';
import { TransactionRepository } from '../../src/repositories/transactionRepository.js';
import { createCategory } from '../../src/domain/category.js';
import { createRule } from '../../src/domain/rule.js';
import { createTransaction } from '../../src/domain/transaction.js';
import { categorizeTransaction } from '../../src/categorization/categorizationEngine.js';

describe('categorizeTransaction — priority resolution (PROJECT_SPEC.md §3.3)', () => {
  let db;
  let categoryRepo;
  let ruleRepo;
  let transactionRepo;
  let groceries;
  let cashCategory;

  beforeEach(async () => {
    db = new NodeSqliteAdapter();
    await runMigrations(db);
    categoryRepo = new CategoryRepository(db);
    ruleRepo = new RuleRepository(db);
    transactionRepo = new TransactionRepository(db);

    groceries = createCategory({ name: 'Groceries' });
    await categoryRepo.insert(groceries);
    cashCategory = createCategory({ name: 'Cash Withdrawal' });
    await categoryRepo.insert(cashCategory);
  });

  afterEach(() => {
    db?.close();
  });

  it('falls through to uncategorized when nothing matches and no history exists', async () => {
    const result = await categorizeTransaction(
      { description: 'Something unrecognized', rawDescription: 'Something unrecognized', merchant: null, transactionType: null },
      { ruleRepo, transactionRepo }
    );
    expect(result.categoryId).toBeNull();
    expect(result.categorizationMethod).toBe('uncategorized');
    expect(result.categorizationConfidence).toBeNull();
  });

  it('applies a default rule when no user rule matches', async () => {
    const defaultRule = createRule({
      categoryId: cashCategory.id,
      matchType: 'description',
      matchValue: 'Prelievo Carta',
      priority: 10,
      source: 'default',
    });
    await ruleRepo.insert(defaultRule);

    const result = await categorizeTransaction(
      { description: 'ATM withdrawal', rawDescription: 'ATM withdrawal', merchant: null, transactionType: 'Prelievo Carta' },
      { ruleRepo, transactionRepo }
    );

    expect(result.categoryId).toBe(cashCategory.id);
    expect(result.categorizationMethod).toBe('default');
    expect(result.categorizationEvidence.type).toBe('rule');
    expect(result.categorizationEvidence.ruleSource).toBe('default');
  });

  it('a user rule always outranks a default rule, regardless of priority value', async () => {
    const defaultRule = createRule({
      categoryId: cashCategory.id,
      matchType: 'merchant',
      matchValue: 'FARMACIA',
      priority: 100, // deliberately high, to prove source still wins over priority number
      source: 'default',
    });
    await ruleRepo.insert(defaultRule);

    const userRule = createRule({
      categoryId: groceries.id,
      matchType: 'merchant',
      matchValue: 'FARMACIA',
      priority: 0,
      source: 'user',
    });
    await ruleRepo.insert(userRule);

    const result = await categorizeTransaction(
      { description: 'Pagamento Carta presso FARMACIA', rawDescription: 'Pagamento Carta presso FARMACIA', merchant: 'FARMACIA SAN PANCRAZIO', transactionType: 'Pagamento Carta' },
      { ruleRepo, transactionRepo }
    );

    expect(result.categoryId).toBe(groceries.id);
    expect(result.categorizationMethod).toBe('rule');
  });

  it('falls through to historical learning when no rule matches', async () => {
    // Seed a manually-categorized transaction at a given merchant.
    const priorTx = createTransaction({
      date: '2026-01-10',
      amountMinorUnits: -1500,
      description: 'Pagamento Carta presso BAR CENTRALE',
      rawDescription: 'Pagamento Carta presso BAR CENTRALE',
      merchant: 'BAR CENTRALE',
      transactionType: 'Pagamento Carta',
      categoryId: groceries.id,
      categorizationMethod: 'manual',
      fingerprint: 'fp-1',
    });
    await transactionRepo.insert(priorTx);

    const result = await categorizeTransaction(
      { description: 'Pagamento Carta presso BAR CENTRALE', rawDescription: 'Pagamento Carta presso BAR CENTRALE', merchant: 'BAR CENTRALE', transactionType: 'Pagamento Carta' },
      { ruleRepo, transactionRepo }
    );

    expect(result.categoryId).toBe(groceries.id);
    expect(result.categorizationMethod).toBe('learned');
    expect(result.categorizationConfidence).toBe(1);
    expect(result.categorizationEvidence.type).toBe('learned');
  });

  it('a matching rule outranks historical learning', async () => {
    const priorTx = createTransaction({
      date: '2026-01-10',
      amountMinorUnits: -1500,
      description: 'Pagamento Carta presso BAR CENTRALE',
      rawDescription: 'Pagamento Carta presso BAR CENTRALE',
      merchant: 'BAR CENTRALE',
      transactionType: 'Pagamento Carta',
      categoryId: groceries.id,
      categorizationMethod: 'manual',
      fingerprint: 'fp-1',
    });
    await transactionRepo.insert(priorTx);

    const userRule = createRule({
      categoryId: cashCategory.id,
      matchType: 'merchant',
      matchValue: 'BAR CENTRALE',
      source: 'user',
    });
    await ruleRepo.insert(userRule);

    const result = await categorizeTransaction(
      { description: 'Pagamento Carta presso BAR CENTRALE', rawDescription: 'Pagamento Carta presso BAR CENTRALE', merchant: 'BAR CENTRALE', transactionType: 'Pagamento Carta' },
      { ruleRepo, transactionRepo }
    );

    expect(result.categoryId).toBe(cashCategory.id);
    expect(result.categorizationMethod).toBe('rule');
  });

  it('a disabled rule is skipped, falling through to the next tier', async () => {
    const disabledUserRule = createRule({
      categoryId: groceries.id,
      matchType: 'merchant',
      matchValue: 'BAR CENTRALE',
      source: 'user',
      enabled: false,
    });
    await ruleRepo.insert(disabledUserRule);

    const result = await categorizeTransaction(
      { description: 'Pagamento Carta presso BAR CENTRALE', rawDescription: 'Pagamento Carta presso BAR CENTRALE', merchant: 'BAR CENTRALE', transactionType: 'Pagamento Carta' },
      { ruleRepo, transactionRepo }
    );

    expect(result.categorizationMethod).toBe('uncategorized');
  });
});
