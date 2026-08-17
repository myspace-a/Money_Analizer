import { WasmSqliteAdapter } from '../../../src/persistence/wasmSqliteAdapter.js';
import { runRepositorySmokeTest, checkSmokeTestResult } from '../../shared/repositorySmokeTest.js';

const statusEl = document.getElementById('status');

async function run() {
  const db = new WasmSqliteAdapter();
  await db.init();
  const result = await runRepositorySmokeTest(db);
  const check = checkSmokeTestResult(result);
  window.__smokeTestResult = { result, check };
  statusEl.textContent = check.ok ? 'ok' : 'failed';
}

run().catch((err) => {
  window.__smokeTestResult = { error: err.message };
  statusEl.textContent = `error: ${err.message}`;
});
