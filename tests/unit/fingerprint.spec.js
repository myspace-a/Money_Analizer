import { describe, it, expect } from 'vitest';
import { computeFingerprint } from '../../src/import/fingerprint.js';

describe('computeFingerprint', () => {
  const base = {
    date: '2026-03-14',
    amountMinorUnits: -3500,
    transactionType: 'Pagamento Carta',
    description: 'Pagamento Carta presso FARMACIA SAN PANCRAZIO',
  };

  it('produces the same fingerprint for identical input', () => {
    expect(computeFingerprint(base)).toBe(computeFingerprint({ ...base }));
  });

  it('is insensitive to case differences in text fields', () => {
    const upper = {
      ...base,
      transactionType: base.transactionType.toUpperCase(),
      description: base.description.toUpperCase(),
    };
    expect(computeFingerprint(base)).toBe(computeFingerprint(upper));
  });

  it('is insensitive to extra/irregular whitespace', () => {
    const spaced = {
      ...base,
      description: '  Pagamento   Carta  presso   FARMACIA SAN   PANCRAZIO  ',
    };
    expect(computeFingerprint(base)).toBe(computeFingerprint(spaced));
  });

  it('changes when the amount differs', () => {
    expect(computeFingerprint(base)).not.toBe(
      computeFingerprint({ ...base, amountMinorUnits: -3501 })
    );
  });

  it('changes when the sign of the amount differs', () => {
    expect(computeFingerprint(base)).not.toBe(
      computeFingerprint({ ...base, amountMinorUnits: 3500 })
    );
  });

  it('changes when the date differs', () => {
    expect(computeFingerprint(base)).not.toBe(computeFingerprint({ ...base, date: '2026-03-15' }));
  });

  it('changes when the description differs meaningfully', () => {
    expect(computeFingerprint(base)).not.toBe(
      computeFingerprint({ ...base, description: 'Pagamento Carta presso PANIFICIO ROSSI' })
    );
  });

  it('treats a null/missing transactionType consistently', () => {
    const noType = { ...base, transactionType: null };
    expect(computeFingerprint(noType)).toBe(computeFingerprint({ ...base, transactionType: '' }));
  });

  it('throws without a date', () => {
    expect(() => computeFingerprint({ ...base, date: undefined })).toThrow();
  });

  it('throws with a non-integer amount', () => {
    expect(() => computeFingerprint({ ...base, amountMinorUnits: 35.5 })).toThrow();
  });
});
