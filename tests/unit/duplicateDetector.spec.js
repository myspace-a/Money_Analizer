import { describe, it, expect, afterEach } from 'vitest';
import { NodeSqliteAdapter } from '../../src/persistence/nodeSqliteAdapter.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import { TransactionRepository } from '../../src/repositories/transactionRepository.js';
import { createTransaction } from '../../src/domain/transaction.js';
import { computeFingerprint } from '../../src/import/fingerprint.js';
import { classifyCandidate } from '../../src/import/duplicateDetector.js';

describe('classifyCandidate', () => {
  let db;
  let transactionRepo;

  afterEach(() => {
    db?.close();
  });

  async function setup() {
    db = new NodeSqliteAdapter();
    await runMigrations(db);
    transactionRepo = new TransactionRepository(db);
  }

  it('classifies a transaction with no matching date/amount as new', async () => {
    await setup();
    const candidate = {
      date: '2026-03-14',
      amountMinorUnits: -3500,
      fingerprint: computeFingerprint({
        date: '2026-03-14',
        amountMinorUnits: -3500,
        transactionType: 'Pagamento Carta',
        description: 'Pagamento Carta presso FARMACIA SAN PANCRAZIO',
      }),
    };

    const result = await classifyCandidate(candidate, transactionRepo);
    expect(result.status).toBe('new');
    expect(result.matches).toEqual([]);
  });

  it('classifies an identical fingerprint as an exact duplicate', async () => {
    await setup();
    const fingerprint = computeFingerprint({
      date: '2026-03-14',
      amountMinorUnits: -3500,
      transactionType: 'Pagamento Carta',
      description: 'Pagamento Carta presso FARMACIA SAN PANCRAZIO',
    });
    const existing = createTransaction({
      date: '2026-03-14',
      amountMinorUnits: -3500,
      description: 'Pagamento Carta presso FARMACIA SAN PANCRAZIO',
      fingerprint,
    });
    await transactionRepo.insert(existing);

    const result = await classifyCandidate(
      { date: '2026-03-14', amountMinorUnits: -3500, fingerprint },
      transactionRepo
    );
    expect(result.status).toBe('exact_duplicate');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].id).toBe(existing.id);
  });

  it('classifies same date+amount but different fingerprint as a probable duplicate', async () => {
    await setup();
    const existing = createTransaction({
      date: '2026-03-14',
      amountMinorUnits: -3500,
      description: 'Pagamento Carta presso FARMACIA SAN PANCRAZIO',
      fingerprint: computeFingerprint({
        date: '2026-03-14',
        amountMinorUnits: -3500,
        transactionType: 'Pagamento Carta',
        description: 'Pagamento Carta presso FARMACIA SAN PANCRAZIO',
      }),
    });
    await transactionRepo.insert(existing);

    // Same date and amount, but a meaningfully different description — a
    // different fingerprint, but still worth flagging for user review.
    const differentFingerprint = computeFingerprint({
      date: '2026-03-14',
      amountMinorUnits: -3500,
      transactionType: 'Pagamento Carta',
      description: 'Pagamento Carta presso PANIFICIO ROSSI',
    });

    const result = await classifyCandidate(
      { date: '2026-03-14', amountMinorUnits: -3500, fingerprint: differentFingerprint },
      transactionRepo
    );
    expect(result.status).toBe('probable_duplicate');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].id).toBe(existing.id);
  });

  it('does not flag a different amount on the same date as any kind of duplicate', async () => {
    await setup();
    const existing = createTransaction({
      date: '2026-03-14',
      amountMinorUnits: -3500,
      description: 'Pagamento Carta presso FARMACIA SAN PANCRAZIO',
      fingerprint: computeFingerprint({
        date: '2026-03-14',
        amountMinorUnits: -3500,
        transactionType: 'Pagamento Carta',
        description: 'Pagamento Carta presso FARMACIA SAN PANCRAZIO',
      }),
    });
    await transactionRepo.insert(existing);

    const candidate = {
      date: '2026-03-14',
      amountMinorUnits: -1200,
      fingerprint: computeFingerprint({
        date: '2026-03-14',
        amountMinorUnits: -1200,
        transactionType: 'Pagamento Carta',
        description: 'Pagamento Carta presso PANIFICIO ROSSI',
      }),
    };

    const result = await classifyCandidate(candidate, transactionRepo);
    expect(result.status).toBe('new');
  });
});
