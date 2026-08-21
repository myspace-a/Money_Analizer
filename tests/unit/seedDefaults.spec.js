import { describe, it, expect, afterEach } from 'vitest';
import { NodeSqliteAdapter } from '../../src/persistence/nodeSqliteAdapter.js';
import { runMigrations } from '../../src/persistence/migrationRunner.js';
import { CategoryRepository } from '../../src/repositories/categoryRepository.js';
import { RuleRepository } from '../../src/repositories/ruleRepository.js';
import { seedDefaults } from '../../src/categorization/seedDefaults.js';
import { DEFAULT_RULE_SEEDS, defaultCategoryNames } from '../../src/categorization/defaultRules.js';
import { createCategory } from '../../src/domain/category.js';

describe('seedDefaults (idempotent startup seeding)', () => {
  let db;
  let categoryRepo;
  let ruleRepo;

  afterEach(() => {
    db?.close();
  });

  it('creates the default categories and rules on a fresh database', async () => {
    db = new NodeSqliteAdapter();
    await runMigrations(db);
    categoryRepo = new CategoryRepository(db);
    ruleRepo = new RuleRepository(db);

    const result = await seedDefaults(categoryRepo, ruleRepo);

    expect(result.categoriesCreated).toBe(defaultCategoryNames().length);
    expect(result.rulesCreated).toBe(DEFAULT_RULE_SEEDS.length);

    const categories = await categoryRepo.findAll();
    const categoryNames = categories.map((c) => c.name);
    for (const name of defaultCategoryNames()) {
      expect(categoryNames).toContain(name);
    }

    const defaultRules = await ruleRepo.findBySource('default');
    expect(defaultRules).toHaveLength(DEFAULT_RULE_SEEDS.length);
    for (const rule of defaultRules) {
      expect(rule.source).toBe('default');
      expect(rule.categoryId).toBeTruthy();
    }
  });

  it('does nothing on a second run — no duplicate categories or rules', async () => {
    db = new NodeSqliteAdapter();
    await runMigrations(db);
    categoryRepo = new CategoryRepository(db);
    ruleRepo = new RuleRepository(db);

    await seedDefaults(categoryRepo, ruleRepo);
    const second = await seedDefaults(categoryRepo, ruleRepo);

    expect(second.categoriesCreated).toBe(0);
    expect(second.rulesCreated).toBe(0);

    const categories = await categoryRepo.findAll();
    const defaultRules = await ruleRepo.findBySource('default');
    expect(categories).toHaveLength(defaultCategoryNames().length);
    expect(defaultRules).toHaveLength(DEFAULT_RULE_SEEDS.length);
  });

  it('reuses an existing category if the user already created one with a matching name', async () => {
    db = new NodeSqliteAdapter();
    await runMigrations(db);
    categoryRepo = new CategoryRepository(db);
    ruleRepo = new RuleRepository(db);

    const preexisting = createCategory({ name: defaultCategoryNames()[0] });
    await categoryRepo.insert(preexisting);

    const result = await seedDefaults(categoryRepo, ruleRepo);

    // One fewer category created, since one already existed by name.
    expect(result.categoriesCreated).toBe(defaultCategoryNames().length - 1);

    const categories = await categoryRepo.findAll();
    const matchingByName = categories.filter((c) => c.name === defaultCategoryNames()[0]);
    expect(matchingByName).toHaveLength(1);
    expect(matchingByName[0].id).toBe(preexisting.id);
  });
});
