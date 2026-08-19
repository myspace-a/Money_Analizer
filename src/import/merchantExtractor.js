/**
 * merchantExtractor.js — best-effort merchant/counterparty extraction from
 * ING's free-text DESCRIZIONE OPERAZIONE field, per ARCHITECTURE.md §6a.
 *
 * For card payments, ING typically embeds the merchant name after the word
 * "presso" (Italian for "at"), e.g.:
 *   "Pagamento Carta presso FARMACIA SAN PANCRAZIO IT"
 *
 * This extraction is inherently imperfect (free text varies), so the
 * original rawDescription is always preserved alongside whatever this
 * extracts, per the explainability requirement (PROJECT_SPEC.md §3.5) —
 * a wrong/missing extraction never loses information, it's just a null
 * merchant with the full original text still visible and correctable.
 */

const PRESSO_PATTERN = /\bpresso\s+(.+)$/i;

// ING often appends a trailing country code / card-network boilerplate
// after the merchant name (e.g. "FARMACIA SAN PANCRAZIO IT" or
// "...CARTA N. 1234"). Trimmed defensively so the extracted merchant is
// closer to just the business name, without over-engineering a full parser.
const TRAILING_NOISE_PATTERN = /\s+(?:IT|CARTA\s+N\.?\s*\d+.*)$/i;

/**
 * @param {string} rawDescription
 * @returns {string|null} best-effort merchant name, or null if no pattern matched
 */
export function extractMerchant(rawDescription) {
  if (!rawDescription || typeof rawDescription !== 'string') return null;

  const match = PRESSO_PATTERN.exec(rawDescription.trim());
  if (!match) return null;

  let merchant = match[1].trim();
  merchant = merchant.replace(TRAILING_NOISE_PATTERN, '').trim();

  return merchant.length > 0 ? merchant : null;
}
