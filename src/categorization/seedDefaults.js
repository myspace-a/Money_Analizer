/**
 * seedDefaults.js — creates the built-in default categories and rules
 * (defaultRules.js) the first time the app runs against a database, and
 * does nothing on every subsequent run.
 *
 * Idempotency matters here specifically because this runs on every app
 * startup (main.js), the same way runMigrations() does — it must be safe
 * to call repeatedly without creating duplicate categories or duplicate
 * default rules.
 */

import { createCategory } from '../domain/category.js';
import { createRule } from '../domain/rule.js';
import { DEFAULT_RULE_SEEDS, defaultCategoryNames } from './defaultRules.js';

/**
 * @param {import('../repositories/categoryRepository.js').CategoryRepository} categoryRepo
 * @param {import('../repositories/ruleRepository.js').RuleRepository} ruleRepo
 * @returns {Promise<{categoriesCreated: number, rulesCreated: number}>}
 */
export async function seedDefaults(categoryRepo, ruleRepo) {
  // Categories: ensure each default category exists, matched by name. Safe
  // to re-check every run — findByName is a cheap lookup, and a category a
  // user later renames or deactivates (Phase 5) is intentionally left
  // alone here; this only fills in what's missing.
  const categoryIdByName = new Map();
  let categoriesCreated = 0;
  for (const name of defaultCategoryNames()) {
    const existing = await categoryRepo.findByName(name);
    if (existing) {
      categoryIdByName.set(name, existing.id);
      continue;
    }
    const category = createCategory({ name });
    await categoryRepo.insert(category);
    categoryIdByName.set(name, category.id);
    categoriesCreated++;
  }

  // Rules: only seed if no default rules exist yet at all. This is
  // deliberately coarser than the per-category check above — once default
  // rules exist, later changes to DEFAULT_RULE_SEEDS in code are a
  // versioning/migration concern (ruleVersion), not something this
  // startup seeding step silently re-applies.
  const existingDefaultRules = await ruleRepo.findBySource('default');
  let rulesCreated = 0;
  if (existingDefaultRules.length === 0) {
    for (const seed of DEFAULT_RULE_SEEDS) {
      const categoryId = categoryIdByName.get(seed.categoryName);
      const rule = createRule({
        categoryId,
        matchType: seed.matchType,
        matchValue: seed.matchValue,
        priority: seed.priority,
        source: 'default',
      });
      await ruleRepo.insert(rule);
      rulesCreated++;
    }
  }

  return { categoriesCreated, rulesCreated };
}
