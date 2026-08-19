/**
 * ImportSettingsRepository — depends only on the Database port (db-port.js).
 * Persists column-mapping profiles per PROJECT_SPEC.md §3.1.
 */
export class ImportSettingsRepository {
  /**
   * @param {import('../persistence/db-port.js').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {import('../domain/importSettings.js').ImportSettings} settings
   * @returns {Promise<void>}
   */
  async insert(settings) {
    await this.db.execute(
      `INSERT INTO import_settings
         (id, profile_name, bank_id, column_mapping, is_default, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        settings.id,
        settings.profileName,
        settings.bankId,
        JSON.stringify(settings.columnMapping),
        settings.isDefault ? 1 : 0,
        settings.createdAt,
        settings.updatedAt,
      ]
    );
  }

  /**
   * @param {import('../domain/importSettings.js').ImportSettings} settings
   * @returns {Promise<void>}
   */
  async update(settings) {
    await this.db.execute(
      `UPDATE import_settings SET profile_name = ?, column_mapping = ?, is_default = ?,
         updated_at = ? WHERE id = ?;`,
      [
        settings.profileName,
        JSON.stringify(settings.columnMapping),
        settings.isDefault ? 1 : 0,
        settings.updatedAt,
        settings.id,
      ]
    );
  }

  /**
   * @param {string} bankId
   * @returns {Promise<import('../domain/importSettings.js').ImportSettings|null>}
   */
  async findDefaultByBankId(bankId) {
    const rows = await this.db.query(
      'SELECT * FROM import_settings WHERE bank_id = ? AND is_default = 1 LIMIT 1;',
      [bankId]
    );
    return rows.length > 0 ? rowToImportSettings(rows[0]) : null;
  }

  /**
   * @returns {Promise<import('../domain/importSettings.js').ImportSettings[]>}
   */
  async findAll() {
    const rows = await this.db.query('SELECT * FROM import_settings ORDER BY created_at;');
    return rows.map(rowToImportSettings);
  }
}

function rowToImportSettings(row) {
  return {
    id: row.id,
    profileName: row.profile_name,
    bankId: row.bank_id,
    columnMapping: JSON.parse(row.column_mapping),
    isDefault: !!row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
