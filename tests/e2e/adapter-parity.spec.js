// @ts-check
import { test, expect } from '@playwright/test';
import { NodeSqliteAdapter } from '../../src/persistence/nodeSqliteAdapter.js';
import { runRepositorySmokeTest, checkSmokeTestResult } from '../shared/repositorySmokeTest.js';

/**
 * STATUS: written but not executed in this container — no browser was
 * available (see Build Chat wrap-up notes).
 *
 * This is the adapter-parity check from ARCHITECTURE.md §4.3: the exact same
 * repository operations (tests/shared/repositorySmokeTest.js) run once in
 * Node against NodeSqliteAdapter and once in a real browser against
 * WasmSqliteAdapter, and the results are compared field-by-field (excluding
 * the randomly-generated category id, which is compared relationally within
 * each run instead — see checkSmokeTestResult).
 */
test.describe('adapter parity — NodeSqliteAdapter vs WasmSqliteAdapter', () => {
  test('same repository operations produce equivalent results on both adapters', async ({
    page,
  }) => {
    const nodeDb = new NodeSqliteAdapter();
    const nodeResult = await runRepositorySmokeTest(nodeDb);
    nodeDb.close();
    const nodeCheck = checkSmokeTestResult(nodeResult);
    expect(nodeCheck.errors).toEqual([]);

    await page.goto('/tests/e2e/fixtures/smoke-test.html');
    await page.waitForFunction(() => window.__smokeTestResult !== undefined, { timeout: 10_000 });
    const browserOutcome = await page.evaluate(() => window.__smokeTestResult);

    expect(browserOutcome.error).toBeUndefined();
    expect(browserOutcome.check.errors).toEqual([]);
    expect(browserOutcome.check.ok).toBe(true);

    // Field-by-field parity, excluding the randomly-generated category id.
    const { categoryId: _nodeCatId, foundTransactionCategoryId: _nodeTxCatId, ...nodeComparable } =
      nodeResult;
    const {
      categoryId: _browserCatId,
      foundTransactionCategoryId: _browserTxCatId,
      ...browserComparable
    } = browserOutcome.result;
    expect(browserComparable).toEqual(nodeComparable);
  });
});
