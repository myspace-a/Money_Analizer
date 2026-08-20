import { describe, it, expect } from 'vitest';
import { matchesRule, findFirstMatchingRule } from '../../src/categorization/ruleMatcher.js';

function makeRule(overrides = {}) {
  return {
    id: 'rule-1',
    categoryId: 'cat-1',
    matchType: 'merchant',
    matchValue: 'FARMACIA',
    priority: 0,
    enabled: true,
    source: 'user',
    ruleVersion: 1,
    ...overrides,
  };
}

const candidate = {
  description: 'Pagamento Carta presso FARMACIA SAN PANCRAZIO',
  rawDescription: 'Pagamento Carta presso FARMACIA SAN PANCRAZIO',
  merchant: 'FARMACIA SAN PANCRAZIO',
  transactionType: 'Pagamento Carta',
};

describe('matchesRule', () => {
  it('matches merchant rules case-insensitively as a substring', () => {
    const rule = makeRule({ matchType: 'merchant', matchValue: 'farmacia' });
    expect(matchesRule(rule, candidate)).toBe(true);
  });

  it('does not match merchant rules against unrelated text', () => {
    const rule = makeRule({ matchType: 'merchant', matchValue: 'SUPERMARKET' });
    expect(matchesRule(rule, candidate)).toBe(false);
  });

  it('matches description rules against description/rawDescription', () => {
    const rule = makeRule({ matchType: 'description', matchValue: 'Pagamento Carta' });
    expect(matchesRule(rule, candidate)).toBe(true);
  });

  it('matches description rules against transactionType (CAUSALE) — the field ' +
    'the built-in default rules actually target, per ARCHITECTURE.md §6a', () => {
    const rule = makeRule({ matchType: 'description', matchValue: 'Accredito Stipendio/Pensione' });
    const salaryCandidate = {
      description: 'Bonifico da AZIENDA SPA',
      rawDescription: 'Bonifico da AZIENDA SPA',
      merchant: null,
      transactionType: 'Accredito Stipendio/Pensione',
    };
    expect(matchesRule(rule, salaryCandidate)).toBe(true);
  });

  it('matches keyword rules against merchant, description, rawDescription, or transactionType', () => {
    expect(matchesRule(makeRule({ matchType: 'keyword', matchValue: 'FARMACIA' }), candidate)).toBe(true);
    expect(
      matchesRule(makeRule({ matchType: 'keyword', matchValue: 'Pagamento Carta' }), candidate)
    ).toBe(true);
  });

  it('never matches a disabled rule', () => {
    const rule = makeRule({ matchType: 'merchant', matchValue: 'FARMACIA', enabled: false });
    expect(matchesRule(rule, candidate)).toBe(false);
  });

  it('never matches an empty matchValue', () => {
    const rule = makeRule({ matchType: 'merchant', matchValue: '   ' });
    expect(matchesRule(rule, candidate)).toBe(false);
  });

  it('treats an unknown matchType as no match', () => {
    const rule = makeRule({ matchType: 'nonsense', matchValue: 'FARMACIA' });
    expect(matchesRule(rule, candidate)).toBe(false);
  });
});

describe('findFirstMatchingRule', () => {
  it('returns the first matching rule in the given (already priority-ordered) list', () => {
    const rules = [
      makeRule({ id: 'no-match', matchType: 'merchant', matchValue: 'SUPERMARKET' }),
      makeRule({ id: 'match-1', matchType: 'merchant', matchValue: 'FARMACIA' }),
      makeRule({ id: 'match-2', matchType: 'description', matchValue: 'Pagamento Carta' }),
    ];
    const result = findFirstMatchingRule(rules, candidate);
    expect(result.id).toBe('match-1');
  });

  it('returns null when nothing matches', () => {
    const rules = [makeRule({ matchType: 'merchant', matchValue: 'SUPERMARKET' })];
    expect(findFirstMatchingRule(rules, candidate)).toBeNull();
  });

  it('returns null for an empty rule list', () => {
    expect(findFirstMatchingRule([], candidate)).toBeNull();
  });
});
