/**
 * Money is always represented as an integer number of minor units (cents).
 * No floating-point arithmetic is used for financial values anywhere in the
 * domain layer, per ARCHITECTURE.md §6 and PROJECT_SPEC.md §4.
 *
 * Parsing of locale-specific formats (e.g. ING's Italian "1.234,56") happens
 * only at the import boundary (Phase 2) and is intentionally NOT part of this
 * module — this module only deals with already-normalized integer cents.
 */

/**
 * @param {number} value
 * @returns {boolean} true if value is a safe integer (valid minor-unit amount)
 */
export function isValidMinorUnits(value) {
  return Number.isInteger(value) && Number.isSafeInteger(value);
}

/**
 * @param {number} value
 * @throws {TypeError} if value is not a valid integer minor-unit amount
 */
function assertValid(value) {
  if (!isValidMinorUnits(value)) {
    throw new TypeError(
      `Expected an integer number of minor units, got: ${JSON.stringify(value)}`
    );
  }
}

/**
 * @param {number} a - amount in minor units
 * @param {number} b - amount in minor units
 * @returns {number} sum in minor units
 */
export function add(a, b) {
  assertValid(a);
  assertValid(b);
  return a + b;
}

/**
 * @param {number} a - amount in minor units
 * @param {number} b - amount in minor units
 * @returns {number} difference in minor units
 */
export function subtract(a, b) {
  assertValid(a);
  assertValid(b);
  return a - b;
}

/**
 * Sums an array of minor-unit amounts.
 * @param {number[]} amounts
 * @returns {number}
 */
export function sum(amounts) {
  return amounts.reduce((total, amount) => add(total, amount), 0);
}

/**
 * Formats an integer minor-unit amount as a display string.
 * Defaults to Italian locale / EUR, matching the primary bank/country
 * (PROJECT_SPEC.md header). Locale/currency are parameters, not hardcoded
 * assumptions baked into callers.
 *
 * @param {number} minorUnits - amount in minor units (e.g. cents)
 * @param {object} [options]
 * @param {string} [options.locale='it-IT']
 * @param {string} [options.currency='EUR']
 * @returns {string} e.g. "-35,00 €"
 */
export function formatMinorUnits(minorUnits, { locale = 'it-IT', currency = 'EUR' } = {}) {
  assertValid(minorUnits);
  const majorUnits = minorUnits / 100;
  // useGrouping is set explicitly (not left to locale default): some CLDR
  // versions resolve it-IT's default grouping to "off" for currency values,
  // which would silently drop the thousands separator.
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    useGrouping: true,
  }).format(majorUnits);
}
