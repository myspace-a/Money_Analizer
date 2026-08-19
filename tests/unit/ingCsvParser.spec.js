import { describe, it, expect } from 'vitest';
import {
  parseItalianAmountToMinorUnits,
  parseItalianDateToIso,
  parseIngCsv,
} from '../../src/import/ingCsvParser.js';
import { ING_DEFAULT_COLUMN_MAPPING } from '../../src/domain/importSettings.js';

describe('parseItalianAmountToMinorUnits', () => {
  it('parses a simple negative amount', () => {
    expect(parseItalianAmountToMinorUnits('-35,00')).toBe(-3500);
  });

  it('parses a simple positive amount without a sign', () => {
    expect(parseItalianAmountToMinorUnits('5,00')).toBe(500);
  });

  it('parses a positive amount with an explicit + sign', () => {
    expect(parseItalianAmountToMinorUnits('+5.316,83')).toBe(531683);
  });

  it('parses an amount with thousands separators', () => {
    expect(parseItalianAmountToMinorUnits('-1.234,56')).toBe(-123456);
  });

  it('parses an amount with a single decimal digit', () => {
    expect(parseItalianAmountToMinorUnits('-3,5')).toBe(-350);
  });

  it('parses a whole-number amount with no decimal part', () => {
    expect(parseItalianAmountToMinorUnits('-100')).toBe(-10000);
  });

  it('returns null for an empty string', () => {
    expect(parseItalianAmountToMinorUnits('')).toBeNull();
    expect(parseItalianAmountToMinorUnits('   ')).toBeNull();
  });

  it('throws on an unrecognized format', () => {
    expect(() => parseItalianAmountToMinorUnits('not-a-number')).toThrow();
  });

  it('never routes through parseFloat-style rounding for large values', () => {
    // 1.234.567,89 would lose precision if naively run through parseFloat
    // after stripping periods in the wrong order; confirm exact integer math.
    expect(parseItalianAmountToMinorUnits('1.234.567,89')).toBe(123456789);
  });
});

describe('parseItalianDateToIso', () => {
  it('converts DD/MM/YYYY to ISO 8601', () => {
    expect(parseItalianDateToIso('14/03/2026')).toBe('2026-03-14');
  });

  it('pads single-digit day/month', () => {
    expect(parseItalianDateToIso('5/3/2026')).toBe('2026-03-05');
  });

  it('throws on an unrecognized format', () => {
    expect(() => parseItalianDateToIso('2026-03-14')).toThrow();
  });
});

describe('parseIngCsv', () => {
  // Real ING exports are semicolon-delimited, precisely because the comma
  // is already used as the decimal separator inside amount fields — using
  // that here (rather than comma-joined rows) is what a real file looks
  // like, not just a test convenience.
  const header =
    'DATA CONTABILE;DATA VALUTA;USCITE;ENTRATE;CAUSALE;DESCRIZIONE OPERAZIONE';

  function csv(rows) {
    return [header, ...rows].join('\n');
  }

  it('parses a normal outflow row', () => {
    const text = csv([
      '14/03/2026;14/03/2026;-35,00;;Pagamento Carta;Pagamento Carta presso FARMACIA SAN PANCRAZIO',
    ]);
    const { rows, skipped } = parseIngCsv(text, ING_DEFAULT_COLUMN_MAPPING);
    expect(skipped).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: '2026-03-14',
      valueDate: '2026-03-14',
      amountMinorUnits: -3500,
      transactionType: 'Pagamento Carta',
    });
  });

  it('parses a normal inflow row', () => {
    const text = csv([
      '01/03/2026;01/03/2026;;+1.500,00;Accredito Stipendio/Pensione;Accredito stipendio marzo',
    ]);
    const { rows } = parseIngCsv(text, ING_DEFAULT_COLUMN_MAPPING);
    expect(rows).toHaveLength(1);
    expect(rows[0].amountMinorUnits).toBe(150000);
  });

  it('excludes balance-marker rows', () => {
    const text = csv([
      '01/01/2026;01/01/2026;;;;Saldo iniziale',
      '14/03/2026;14/03/2026;-35,00;;Pagamento Carta;Pagamento Carta presso FARMACIA',
      '31/12/2026;31/12/2026;;;;Saldo finale',
    ]);
    const { rows, skipped } = parseIngCsv(text, ING_DEFAULT_COLUMN_MAPPING);
    expect(rows).toHaveLength(1);
    expect(skipped).toHaveLength(2);
    expect(skipped.every((s) => s.reason === 'balance-marker')).toBe(true);
  });

  it('skips (and reports) a row with both outflow and inflow filled', () => {
    const text = csv(['14/03/2026;14/03/2026;-35,00;+10,00;Pagamento Carta;Weird row']);
    const { rows, skipped } = parseIngCsv(text, ING_DEFAULT_COLUMN_MAPPING);
    expect(rows).toHaveLength(0);
    expect(skipped).toHaveLength(1);
  });

  it('skips (and reports) a row with neither outflow nor inflow filled', () => {
    const text = csv(['14/03/2026;14/03/2026;;;Pagamento Carta;Weird row']);
    const { rows, skipped } = parseIngCsv(text, ING_DEFAULT_COLUMN_MAPPING);
    expect(rows).toHaveLength(0);
    expect(skipped).toHaveLength(1);
  });

  it('throws a clear error when the column mapping does not match the header', () => {
    const badMapping = { ...ING_DEFAULT_COLUMN_MAPPING, date: 'NOT A REAL COLUMN' };
    expect(() => parseIngCsv(csv([]), badMapping)).toThrow(/NOT A REAL COLUMN/);
  });
});
