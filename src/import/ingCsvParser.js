/**
 * ingCsvParser.js — turns raw ING Italy CSV text into normalized row
 * objects, using a column mapping (import/importSettings.js) rather than
 * hardcoded ING column names, so the internal model stays independent of
 * any one bank's export format (ARCHITECTURE.md §6, §6a).
 *
 * This module does the messy, bank-specific work described in
 * ARCHITECTURE.md §6a:
 *  - Italian number format (comma decimal separator, period thousands
 *    separator) parsed explicitly — never via parseFloat — straight to
 *    integer minor units (cents), never through a floating-point
 *    intermediate (PROJECT_SPEC.md §4).
 *  - DD/MM/YYYY dates converted to ISO 8601 (YYYY-MM-DD).
 *  - USCITE (outflow) / ENTRATE (inflow) columns merged into one signed
 *    integer amount.
 *  - Running-balance marker rows ("Saldo iniziale" / "Saldo finale") are
 *    recognized and excluded — they are not transactions.
 *
 * Nothing downstream of this module (fingerprinting, duplicate detection,
 * repositories) knows about ING column names — everything past this file
 * only deals with the normalized shape returned here.
 */

const BALANCE_MARKER_PATTERN = /saldo\s+(iniziale|finale)/i;

/**
 * @typedef {Object} ParsedRow
 * @property {string} date - ISO 8601 (YYYY-MM-DD)
 * @property {string|null} valueDate - ISO 8601, if present
 * @property {number} amountMinorUnits - signed integer; negative = outflow
 * @property {string} transactionType - raw bank-provided label (e.g. CAUSALE)
 * @property {string} rawDescription - original free-text description, untouched
 */

/**
 * @typedef {Object} ParsedCsvResult
 * @property {ParsedRow[]} rows - valid, normalized transaction rows
 * @property {Array<{rowNumber: number, reason: string, raw: Record<string,string>}>} skipped -
 *   rows excluded from `rows` (balance markers or rows that failed validation),
 *   with a reason, so the import UI can show what was skipped and why —
 *   nothing is silently dropped without a trace (PROJECT_SPEC.md §4).
 */

/**
 * Splits raw CSV text into an array of records (header row consumed
 * separately). Handles a quoted field containing a comma or embedded
 * newline; ING exports are typically semicolon- or comma-delimited, so the
 * delimiter is detected from the header line rather than assumed.
 *
 * @param {string} csvText
 * @returns {{ delimiter: string, header: string[], dataLines: string[][] }}
 */
function tokenizeCsv(csvText) {
  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  const headerLine = lines[0];
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const delimiter = semicolonCount >= commaCount ? ';' : ',';

  const header = splitCsvLine(headerLine, delimiter).map((h) => h.trim());
  const dataLines = lines.slice(1).map((line) => splitCsvLine(line, delimiter));

  return { delimiter, header, dataLines };
}

/**
 * Splits a single CSV line respecting double-quoted fields.
 * @param {string} line
 * @param {string} delimiter
 * @returns {string[]}
 */
function splitCsvLine(line, delimiter) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/**
 * Parses an Italian-formatted decimal amount string (e.g. "-35,00" or
 * "5.316,83") straight into an integer number of minor units (cents).
 * Returns null for an empty string (ING leaves the non-applicable one of
 * USCITE/ENTRATE blank on every row).
 *
 * Deliberately does not use parseFloat, per ARCHITECTURE.md §6a: the comma
 * is the decimal separator and the period is a thousands separator in this
 * locale, which parseFloat would misread.
 *
 * @param {string} raw
 * @returns {number|null}
 */
export function parseItalianAmountToMinorUnits(raw) {
  const trimmed = (raw ?? '').trim();
  if (trimmed === '') return null;

  const cleaned = trimmed.replace(/^\+/, '');
  const negative = cleaned.startsWith('-');
  const unsigned = negative ? cleaned.slice(1) : cleaned;

  const match = /^([\d.]*)(?:,(\d{1,2}))?$/.exec(unsigned);
  if (!match) {
    throw new Error(`Unrecognized amount format: "${raw}"`);
  }

  const integerPart = match[1].replace(/\./g, '');
  const fractionalPart = (match[2] ?? '0').padEnd(2, '0');

  if (integerPart === '' && fractionalPart === '00') {
    throw new Error(`Unrecognized amount format: "${raw}"`);
  }

  const integerValue = integerPart === '' ? 0 : parseInt(integerPart, 10);
  const fractionalValue = parseInt(fractionalPart, 10);
  const minorUnits = integerValue * 100 + fractionalValue;

  return negative ? -minorUnits : minorUnits;
}

/**
 * Parses a DD/MM/YYYY date string into ISO 8601 (YYYY-MM-DD).
 * @param {string} raw
 * @returns {string}
 */
export function parseItalianDateToIso(raw) {
  const trimmed = (raw ?? '').trim();
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (!match) {
    throw new Error(`Unrecognized date format: "${raw}"`);
  }
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * @param {string} description
 * @returns {boolean} true if this row is a running-balance marker, not a
 *   real transaction (ARCHITECTURE.md §6a).
 */
function isBalanceMarkerRow(description) {
  return BALANCE_MARKER_PATTERN.test(description ?? '');
}

/**
 * Parses raw ING CSV text into normalized rows.
 *
 * @param {string} csvText
 * @param {Record<string, string>} columnMapping - internal field name ->
 *   CSV column header (see domain/importSettings.js MAPPABLE_FIELDS)
 * @returns {ParsedCsvResult}
 */
export function parseIngCsv(csvText, columnMapping) {
  const { header, dataLines } = tokenizeCsv(csvText);

  const columnIndex = {};
  for (const [field, columnName] of Object.entries(columnMapping)) {
    const idx = header.indexOf(columnName);
    if (idx === -1) {
      throw new Error(
        `Column mapping expects a "${columnName}" column (for "${field}") but it was not found in the CSV header: ${header.join(', ')}`
      );
    }
    columnIndex[field] = idx;
  }

  /** @type {ParsedRow[]} */
  const rows = [];
  /** @type {ParsedCsvResult['skipped']} */
  const skipped = [];

  dataLines.forEach((fields, i) => {
    const rowNumber = i + 2; // +1 for header, +1 for 1-indexing
    const raw = {};
    for (const field of Object.keys(columnMapping)) {
      raw[field] = fields[columnIndex[field]] ?? '';
    }

    if (isBalanceMarkerRow(raw.description)) {
      skipped.push({ rowNumber, reason: 'balance-marker', raw });
      return;
    }

    try {
      const date = parseItalianDateToIso(raw.date);
      const valueDate = raw.valueDate ? parseItalianDateToIso(raw.valueDate) : null;
      const outflow = parseItalianAmountToMinorUnits(raw.outflow);
      const inflow = parseItalianAmountToMinorUnits(raw.inflow);

      if (outflow !== null && inflow !== null) {
        throw new Error('Both outflow and inflow are filled on the same row');
      }
      if (outflow === null && inflow === null) {
        throw new Error('Neither outflow nor inflow is filled on this row');
      }
      const amountMinorUnits = outflow !== null ? -Math.abs(outflow) : Math.abs(inflow);

      rows.push({
        date,
        valueDate,
        amountMinorUnits,
        transactionType: raw.transactionType || '',
        rawDescription: raw.description || '',
      });
    } catch (err) {
      skipped.push({ rowNumber, reason: err.message, raw });
    }
  });

  return { rows, skipped };
}
