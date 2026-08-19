import { generateId } from './ids.js';

/**
 * The internal transaction fields a CSV column can be mapped to. This list
 * is intentionally generic (not ING-specific) — the mapping is what
 * translates a specific bank's column names into these, per
 * ARCHITECTURE.md §6 ("the internal model stays independent of ING column
 * names").
 * @type {ReadonlyArray<string>}
 */
export const MAPPABLE_FIELDS = /** @type {const} */ ([
  'date',
  'valueDate',
  'outflow',
  'inflow',
  'transactionType',
  'description',
]);

/**
 * ING Italy's default export column layout, per ARCHITECTURE.md §6a.
 * Used to pre-fill the mapping editor so most users never have to touch it.
 * @type {Record<string, string>}
 */
export const ING_DEFAULT_COLUMN_MAPPING = {
  date: 'DATA CONTABILE',
  valueDate: 'DATA VALUTA',
  outflow: 'USCITE',
  inflow: 'ENTRATE',
  transactionType: 'CAUSALE',
  description: 'DESCRIZIONE OPERAZIONE',
};

/**
 * @typedef {Object} ImportSettings
 * @property {string} id
 * @property {string} profileName
 * @property {string} bankId
 * @property {Record<string, string>} columnMapping - internal field -> CSV column header
 * @property {boolean} isDefault
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @param {{
 *   profileName?: string,
 *   bankId?: string,
 *   columnMapping: Record<string, string>,
 *   isDefault?: boolean,
 * }} input
 * @returns {ImportSettings}
 */
export function createImportSettings({
  profileName = 'ING Italy (default)',
  bankId = 'ing-it',
  columnMapping,
  isDefault = true,
}) {
  if (!columnMapping || typeof columnMapping !== 'object') {
    throw new TypeError('ImportSettings requires a columnMapping object');
  }
  const missing = MAPPABLE_FIELDS.filter((field) => !columnMapping[field]);
  if (missing.length > 0) {
    throw new TypeError(`ImportSettings columnMapping is missing fields: ${missing.join(', ')}`);
  }

  const now = new Date().toISOString();
  return {
    id: generateId(),
    profileName,
    bankId,
    columnMapping: { ...columnMapping },
    isDefault,
    createdAt: now,
    updatedAt: now,
  };
}
