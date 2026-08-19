/**
 * import.js — Phase 2 UI feature module (ARCHITECTURE.md §5: one module per
 * screen/feature area, calling into the service layer). Owns the import
 * screen: pick a CSV file, review/edit the column mapping, preview and
 * classify rows, review duplicates, and confirm which rows actually get
 * inserted.
 *
 * Deliberately minimal per PROJECT_SPEC.md §2 (MVP, avoid speculative UX):
 * plain form controls, no drag-and-drop, no rich diff view for duplicates —
 * just enough to see what will happen and decide row by row.
 */

import { prepareImport, commitImport } from './import/importService.js';
import {
  ING_DEFAULT_COLUMN_MAPPING,
  MAPPABLE_FIELDS,
  createImportSettings,
} from './domain/importSettings.js';

const STATUS_LABELS = {
  new: 'New',
  exact_duplicate: 'Exact duplicate',
  probable_duplicate: 'Possible duplicate',
};

/**
 * @param {{
 *   root: HTMLElement,
 *   transactionRepo: import('./repositories/transactionRepository.js').TransactionRepository,
 *   importSettingsRepo: import('./repositories/importSettingsRepository.js').ImportSettingsRepository,
 *   onImportCommitted?: () => void,
 * }} options
 */
export function initImportUI({ root, transactionRepo, importSettingsRepo, onImportCommitted }) {
  const fileInput = root.querySelector('#import-file-input');
  const previewBtn = root.querySelector('#import-preview-btn');
  const confirmBtn = root.querySelector('#import-confirm-btn');
  const mappingForm = root.querySelector('#import-mapping-form');
  const reviewList = root.querySelector('#import-review-list');
  const summaryEl = root.querySelector('#import-summary');
  const errorEl = root.querySelector('#import-error');

  /** @type {Array} */
  let currentCandidates = [];
  /** @type {Array} */
  let currentSkipped = [];

  renderMappingForm(mappingForm, ING_DEFAULT_COLUMN_MAPPING);
  loadPersistedMapping(importSettingsRepo, mappingForm).catch((err) => {
    console.error('Failed to load persisted import mapping', err);
  });

  previewBtn.addEventListener('click', async () => {
    errorEl.textContent = '';
    const file = fileInput.files?.[0];
    if (!file) {
      errorEl.textContent = 'Choose a CSV file first.';
      return;
    }

    const columnMapping = readMappingForm(mappingForm);
    await persistMapping(importSettingsRepo, columnMapping);

    try {
      const text = await file.text();
      const { candidates, skipped } = await prepareImport(text, columnMapping, transactionRepo);
      currentCandidates = candidates;
      currentSkipped = skipped;
      renderReview(reviewList, candidates, skipped);
      confirmBtn.disabled = candidates.length === 0;
      summaryEl.textContent = '';
    } catch (err) {
      errorEl.textContent = `Could not read this file: ${err.message}`;
      currentCandidates = [];
      currentSkipped = [];
      reviewList.innerHTML = '';
      confirmBtn.disabled = true;
    }
  });

  confirmBtn.addEventListener('click', async () => {
    const decisions = readDecisions(reviewList, currentCandidates);
    const result = await commitImport(currentCandidates, decisions, transactionRepo);
    summaryEl.textContent = `Imported ${result.importedCount} transaction(s); skipped ${result.skippedCount}.`;
    confirmBtn.disabled = true;
    reviewList.innerHTML = '';
    currentCandidates = [];
    onImportCommitted?.();
  });
}

function renderMappingForm(mappingForm, mapping) {
  mappingForm.innerHTML = '';
  for (const field of MAPPABLE_FIELDS) {
    const label = document.createElement('label');
    label.textContent = field;
    const input = document.createElement('input');
    input.type = 'text';
    input.dataset.field = field;
    input.value = mapping[field] ?? '';
    label.appendChild(input);
    mappingForm.appendChild(label);
  }
}

function readMappingForm(mappingForm) {
  const mapping = {};
  for (const input of mappingForm.querySelectorAll('input[data-field]')) {
    mapping[input.dataset.field] = input.value.trim();
  }
  return mapping;
}

async function loadPersistedMapping(importSettingsRepo, mappingForm) {
  const existing = await importSettingsRepo.findDefaultByBankId('ing-it');
  if (existing) {
    renderMappingForm(mappingForm, existing.columnMapping);
  }
}

async function persistMapping(importSettingsRepo, columnMapping) {
  const existing = await importSettingsRepo.findDefaultByBankId('ing-it');
  if (existing) {
    existing.columnMapping = columnMapping;
    existing.updatedAt = new Date().toISOString();
    await importSettingsRepo.update(existing);
  } else {
    const settings = createImportSettings({ columnMapping });
    await importSettingsRepo.insert(settings);
  }
}

function renderReview(reviewList, candidates, skipped) {
  reviewList.innerHTML = '';

  if (skipped.length > 0) {
    const skippedNote = document.createElement('p');
    skippedNote.dataset.testid = 'import-skipped-note';
    skippedNote.textContent = `${skipped.length} row(s) excluded during parsing (balance markers or invalid rows).`;
    reviewList.appendChild(skippedNote);
  }

  for (const candidate of candidates) {
    const row = document.createElement('div');
    row.className = 'import-review-row';
    row.dataset.rowNumber = String(candidate.rowNumber);
    row.dataset.status = candidate.classification.status;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.rowNumber = String(candidate.rowNumber);
    checkbox.checked = candidate.classification.status === 'new';

    const label = document.createElement('span');
    label.textContent = `${candidate.parsedRow.date} — ${formatAmount(candidate.parsedRow.amountMinorUnits)} — ${candidate.parsedRow.rawDescription} [${STATUS_LABELS[candidate.classification.status]}]`;

    row.appendChild(checkbox);
    row.appendChild(label);
    reviewList.appendChild(row);
  }
}

function readDecisions(reviewList, candidates) {
  const decisions = {};
  for (const candidate of candidates) {
    const checkbox = reviewList.querySelector(
      `input[data-row-number="${candidate.rowNumber}"]`
    );
    decisions[candidate.rowNumber] = checkbox?.checked ? 'import' : 'skip';
  }
  return decisions;
}

function formatAmount(minorUnits) {
  return (minorUnits / 100).toFixed(2);
}
