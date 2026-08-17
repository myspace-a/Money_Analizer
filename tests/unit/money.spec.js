import { describe, it, expect } from 'vitest';
import { add, subtract, sum, formatMinorUnits, isValidMinorUnits } from '../../src/domain/money.js';

describe('money', () => {
  describe('isValidMinorUnits', () => {
    it('accepts integers', () => {
      expect(isValidMinorUnits(0)).toBe(true);
      expect(isValidMinorUnits(-3500)).toBe(true);
      expect(isValidMinorUnits(531683)).toBe(true);
    });

    it('rejects non-integers and non-numbers', () => {
      expect(isValidMinorUnits(35.5)).toBe(false);
      expect(isValidMinorUnits('35')).toBe(false);
      expect(isValidMinorUnits(NaN)).toBe(false);
      expect(isValidMinorUnits(undefined)).toBe(false);
    });
  });

  describe('add / subtract', () => {
    it('adds integer minor units exactly (no float drift)', () => {
      // The classic float trap: 0.1 + 0.2 !== 0.3 in floating point.
      // In minor units this must be exact.
      expect(add(10, 20)).toBe(30);
      expect(add(-3500, 531683)).toBe(528183);
    });

    it('subtracts integer minor units exactly', () => {
      expect(subtract(531683, 3500)).toBe(528183);
    });

    it('throws on non-integer input', () => {
      expect(() => add(10.5, 20)).toThrow(TypeError);
      expect(() => subtract(10, '20')).toThrow(TypeError);
    });
  });

  describe('sum', () => {
    it('sums an array of minor-unit amounts', () => {
      expect(sum([-3500, 531683, -100])).toBe(528083);
      expect(sum([])).toBe(0);
    });
  });

  describe('formatMinorUnits', () => {
    it('formats a negative amount as Italian-locale EUR', () => {
      // -35,00 € (non-breaking space before €, exact spacing varies by ICU
      // data, so check the numerically meaningful parts instead of the
      // whole string byte-for-byte).
      const formatted = formatMinorUnits(-3500);
      expect(formatted).toContain('35,00');
      expect(formatted).toContain('€');
      expect(formatted.startsWith('-')).toBe(true);
    });

    it('formats a large positive amount with thousands separator', () => {
      const formatted = formatMinorUnits(531683);
      expect(formatted).toContain('5.316,83');
    });

    it('throws on invalid input', () => {
      expect(() => formatMinorUnits(35.5)).toThrow(TypeError);
    });
  });
});
