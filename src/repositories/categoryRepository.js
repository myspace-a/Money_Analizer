/**
 * CategoryRepository — depends only on the Database port (db-port.js),
 * never on a specific SQLite implementation (ARCHITECTURE.md §3).
 */
export class CategoryRepository {
  /**
   * @param {import('../persistence/db-port.js').Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {import('../domain/category.js').Category} category
   * @returns {Promise<void>}
   */
  async insert(category) {
    await this.db.execute(
      `INSERT INTO categories (id, name, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?);`,
      [category.id, category.name, category.active ? 1 : 0, category.createdAt, category.updatedAt]
    );
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../domain/category.js').Category|null>}
   */
  async findById(id) {
    const rows = await this.db.query('SELECT * FROM categories WHERE id = ?;', [id]);
    return rows.length > 0 ? rowToCategory(rows[0]) : null;
  }

  /**
   * @param {{includeInactive?: boolean}} [options]
   * @returns {Promise<import('../domain/category.js').Category[]>}
   */
  async findAll({ includeInactive = false } = {}) {
    const sql = includeInactive
      ? 'SELECT * FROM categories ORDER BY name;'
      : 'SELECT * FROM categories WHERE active = 1 ORDER BY name;';
    const rows = await this.db.query(sql);
    return rows.map(rowToCategory);
  }

  /**
   * @param {import('../domain/category.js').Category} category
   * @returns {Promise<void>}
   */
  async update(category) {
    await this.db.execute(
      `UPDATE categories SET name = ?, active = ?, updated_at = ? WHERE id = ?;`,
      [category.name, category.active ? 1 : 0, category.updatedAt, category.id]
    );
  }
}

function rowToCategory(row) {
  return {
    id: row.id,
    name: row.name,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
