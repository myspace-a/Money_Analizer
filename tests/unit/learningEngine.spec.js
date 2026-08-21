import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { NodeSqliteAdapter } from '../../src/persistence/nodeSqliteAdapter.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import { CategoryRepository } from '../../src/repositories/categoryRepository.js';
import { TransactionRepository } from '../../src/repositories/transactionRepository.js';
import { createCategory } from '../../src/domain/category.js';
import { createTransaction } from '../../src/domain/transaction.js';
import { suggestFromHistory } from '../../src/categorization/learningEngine.js';

describe('suggestFromHistory (PROJECT_SPEC.md §3.4)', () => {
  let db;
  let categoryRepo;
  let transactionRepo;
  let groceries;
  let transport;

  beforeEach(async () => {
    db = new NodeSqliteAdapter();
    await runMigrations(db);
    categoryRepo = new CategoryRepository(db);
    transactionRepo = new TransactionRepository(db);

    groceries = createCategory({ name: 'Groceries' });
    await categoryRepo.insert(groceries);
    transport = createCategory({ name: 'Transport' });
    await categoryRepo.insert(transport);
  });

  afterEach(() => {
    db?.close();
  });

  it('returns null when there is no merchant on the candidate', async () => {
    const result = await suggestFromHistory({ merchant: null }, transactionRepo);
    expect(result).toBeNull();
  });

  it('returns null when there is no manually-categorized history for that merchant', async () => {
    const result = await suggestFromHistory({ merchant: 'UNKNOWN SHOP' }, transactionRepo);
    expect(result).toBeNull();
  });

  it('suggests the unanimous category from prior manual corrections, with full confidence', async () => {
    for (let i = 0; i < 3; i++) {
      const tx = createTransaction({
        date: '2026-01-1' + i,
        amountMinorUnits: -1000,
        description: 'Pagamento Carta presso BAR CENTRALE',
        rawDescription: 'Pagamento Carta presso BAR CENTRALE',
        merchant: 'BAR CENTRALE',
        categoryId: groceries.id,
        categorizationMethod: 'manual',
        fingerprint: `fp-${i}`,
      });
      await transactionRepo.insert(tx);
    }

    const result = await suggestFromHistory({ merchant: 'bar centrale' }, transactionRepo);
    expect(result.categoryId).toBe(groceries.id);
    expect(result.confidence).toBe(1);
    expect(result.evidence.sampleCount).toBe(3);
    expect(result.evidence.agreeingCount).toBe(3);
  });

  it('computes a partial confidence when prior corrections disagree, and picks the majority', async () => {
    const majority = [groceries.id, groceries.id, transport.id];
    for (let i = 0; i < majority.length; i++) {
      const tx = createTransaction({
        date: '2026-01-1' + i,
        amountMinorUnits: -1000,
        description: 'Pagamento Carta presso STAZIONE BAR',
        rawDescription: 'Pagamento Carta presso STAZIONE BAR',
        merchant: 'STAZIONE BAR',
        categoryId: majority[i],
        categorizationMethod: 'manual',
        fingerprint: `fp-mix-${i}`,
      });
      await transactionRepo.insert(tx);
    }

    const result = await suggestFromHistory({ merchant: 'STAZIONE BAR' }, transactionRepo);
    expect(result.categoryId).toBe(groceries.id);
    expect(result.confidence).toBeCloseTo(2 / 3);
  });

  it('ignores non-manual categorizations — only manual corrections count as learning signal', async () => {
    const ruleTx = createTransaction({
      date: '2026-01-10',
      amountMinorUnits: -1000,
      description: 'Pagamento Carta presso RULE SHOP',
      rawDescription: 'Pagamento Carta presso RULE SHOP',
      merchant: 'RULE SHOP',
      categoryId: transport.id,
      categorizationMethod: 'rule',
      fingerprint: 'fp-rule',
    });
    await transactionRepo.insert(ruleTx);

    const result = await suggestFromHistory({ merchant: 'RULE SHOP' }, transactionRepo);
    expect(result).toBeNull();
  });
});
