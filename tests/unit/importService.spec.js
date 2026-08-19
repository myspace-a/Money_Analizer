import { describe, it, expect, afterEach } from 'vitest';
import { NodeSqliteAdapter } from '../../src/persistence/nodeSqliteAdapter.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import { TransactionRepository } from '../../src/repositories/transactionRepository.js';
import { ING_DEFAULT_COLUMN_MAPPING } from '../../src/domain/importSettings.js';
import { prepareImport, commitImport } from '../../src/import/importService.js';

const SAMPLE_CSV = [
  'DATA CONTABILE;DATA VALUTA;USCITE;ENTRATE;CAUSALE;DESCRIZIONE OPERAZIONE',
  '01/03/2026;01/03/2026;;;;Saldo iniziale',
  '02/03/2026;02/03/2026;-12,50;;Pagamento Carta;Pagamento Carta presso BAR CENTRALE',
  '05/03/2026;05/03/2026;-45,90;;Pagamento Carta;Pagamento Carta presso SUPERMERCATO GIALLO',
  '10/03/2026;10/03/2026;;+1.500,00;Accredito Stipendio/Pensione;Accredito stipendio marzo',
  '31/03/2026;31/03/2026;;;;Saldo finale',
].join('\n');

describe('import pipeline (prepareImport + commitImport)', () => {
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

  it('parses, classifies as new, and imports on first pass', async () => {
    await setup();
    const { candidates, skipped } = await prepareImport(
      SAMPLE_CSV,
      ING_DEFAULT_COLUMN_MAPPING,
      transactionRepo
    );

    expect(skipped).toHaveLength(2); // the two Saldo rows
    expect(candidates).toHaveLength(3);
    expect(candidates.every((c) => c.classification.status === 'new')).toBe(true);

    const decisions = Object.fromEntries(candidates.map((c) => [c.rowNumber, 'import']));
    const result = await commitImport(candidates, decisions, transactionRepo);

    expect(result.importedCount).toBe(3);
    expect(result.skippedCount).toBe(0);

    const stored = await transactionRepo.findAll();
    expect(stored).toHaveLength(3);

    const barTx = stored.find((t) => t.rawDescription.includes('BAR CENTRALE'));
    expect(barTx).toBeTruthy();
    expect(barTx.amountMinorUnits).toBe(-1250);
    expect(barTx.merchant).toBe('BAR CENTRALE');
    expect(barTx.categorizationMethod).toBe('uncategorized');

    const salaryTx = stored.find((t) => t.rawDescription.includes('stipendio'));
    expect(salaryTx.amountMinorUnits).toBe(150000);
  });

  it('flags every row as an exact duplicate on re-import, and importing nothing leaves data unchanged', async () => {
    await setup();
    const first = await prepareImport(SAMPLE_CSV, ING_DEFAULT_COLUMN_MAPPING, transactionRepo);
    const firstDecisions = Object.fromEntries(
      first.candidates.map((c) => [c.rowNumber, 'import'])
    );
    await commitImport(first.candidates, firstDecisions, transactionRepo);

    const second = await prepareImport(SAMPLE_CSV, ING_DEFAULT_COLUMN_MAPPING, transactionRepo);
    expect(second.candidates).toHaveLength(3);
    expect(second.candidates.every((c) => c.classification.status === 'exact_duplicate')).toBe(
      true
    );

    // Leave all decisions at their default (skip, for duplicates) —
    // nothing should be inserted a second time.
    const result = await commitImport(second.candidates, {}, transactionRepo);
    expect(result.importedCount).toBe(0);
    expect(result.skippedCount).toBe(3);

    const stored = await transactionRepo.findAll();
    expect(stored).toHaveLength(3);
  });

  it('an explicit "keep both" decision imports a duplicate anyway, without touching the existing row', async () => {
    await setup();
    const first = await prepareImport(SAMPLE_CSV, ING_DEFAULT_COLUMN_MAPPING, transactionRepo);
    const firstDecisions = Object.fromEntries(
      first.candidates.map((c) => [c.rowNumber, 'import'])
    );
    await commitImport(first.candidates, firstDecisions, transactionRepo);

    const second = await prepareImport(SAMPLE_CSV, ING_DEFAULT_COLUMN_MAPPING, transactionRepo);
    // Force-import the first candidate despite it being an exact duplicate.
    const decisions = { [second.candidates[0].rowNumber]: 'import' };
    const result = await commitImport(second.candidates, decisions, transactionRepo);

    expect(result.importedCount).toBe(1);
    expect(result.skippedCount).toBe(2);

    const stored = await transactionRepo.findAll();
    expect(stored).toHaveLength(4); // 3 original + 1 intentionally kept-both
  });
});
