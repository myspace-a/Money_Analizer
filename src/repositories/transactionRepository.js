/**
 * TransactionRepository — depends only on the Database port (db-port.js).
 */
export class TransactionRepository {
  /**
   * @param {import('../persistence/db-port.js').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {import('../domain/transaction.js').Transaction} transaction
   * @returns {Promise<void>}
   */
  async insert(transaction) {
    await this.db.execute(
      `INSERT INTO transactions
         (id, date, value_date, amount_minor_units, currency, description, raw_description,
          merchant, transaction_type, category_id, categorization_method,
          categorization_confidence, fingerprint, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        transaction.id,
        transaction.date,
        transaction.valueDate,
        transaction.amountMinorUnits,
        transaction.currency,
        transaction.description,
        transaction.rawDescription,
        transaction.merchant,
        transaction.transactionType,
        transaction.categoryId,
        transaction.categorizationMethod,
        transaction.categorizationConfidence,
        transaction.fingerprint,
        transaction.createdAt,
        transaction.updatedAt,
      ]
    );
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../domain/transaction.js').Transaction|null>}
   */
  async findById(id) {
    const rows = await this.db.query('SELECT * FROM transactions WHERE id = ?;', [id]);
    return rows.length > 0 ? rowToTransaction(rows[0]) : null;
  }

  /**
   * @param {string} fingerprint
   * @returns {Promise<import('../domain/transaction.js').Transaction[]>}
   */
  async findByFingerprint(fingerprint) {
    const rows = await this.db.query('SELECT * FROM transactions WHERE fingerprint = ?;', [
      fingerprint,
    ]);
    return rows.map(rowToTransaction);
  }

  /**
   * @returns {Promise<import('../domain/transaction.js').Transaction[]>}
   */
  async findAll() {
    const rows = await this.db.query('SELECT * FROM transactions ORDER BY date DESC, created_at DESC;');
    return rows.map(rowToTransaction);
  }

  /**
   * @param {import('../domain/transaction.js').Transaction} transaction
   * @returns {Promise<void>}
   */
  async update(transaction) {
    await this.db.execute(
      `UPDATE transactions SET category_id = ?, categorization_method = ?,
         categorization_confidence = ?, updated_at = ? WHERE id = ?;`,
      [
        transaction.categoryId,
        transaction.categorizationMethod,
        transaction.categorizationConfidence,
        transaction.updatedAt,
        transaction.id,
      ]
    );
  }
}

function rowToTransaction(row) {
  return {
    id: row.id,
    date: row.date,
    valueDate: row.value_date,
    amountMinorUnits: row.amount_minor_units,
    currency: row.currency,
    description: row.description,
    rawDescription: row.raw_description,
    merchant: row.merchant,
    transactionType: row.transaction_type,
    categoryId: row.category_id,
    categorizationMethod: row.categorization_method,
    categorizationConfidence: row.categorization_confidence,
    fingerprint: row.fingerprint,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
