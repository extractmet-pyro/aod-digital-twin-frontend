// E2E smoke: loads every view, exercises Run / MPC / estimation actions, records console errors and screenshots.
// Usage: FRONTEND_URL=http://localhost:4173 API_URL=http://localhost:8000 node tests/e2e/smoke.mjs [outdir]
import { chromium } from 'playwright';
import fs from 'node:fs';

const FE = process.env.FRONTEND_URL || 'http://localhost:4173';
const API = process.env.API_URL || 'http://localhost:8000';
const OUT = process.argv[2] || 'screenshots';
fs.mkdirSync(OUT, { recursive: true });
const VIEWS = ['overview', 'vessel', 'schematic', 'design', 'recipe', 'trends', 'balance', 'heat', 'slag', 'offgas', 'thermo', 'ml', 'mpc', 'scenarios', 'economics', 'reports', 'settings'];
const errors = [];
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage', '--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL_CONNECTION_FAILED')) errors.push(`[console] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
await page.addInitScript((api) => localStorage.setItem('aod.api', api), API);
await page.goto(FE + '/#/overview');
await page.waitForFunction(() => window.__AOD__?.backend?.online === true, null, { timeout: 30000 });
const results = {};
// backend run of demo heat A
await page.click('[data-demo="DEMO-A-304L"]');
await page.waitForFunction(() => window.__AOD__.runOrigin === 'BACKEND', null, { timeout: 120000 });
results.backend_run = await page.evaluate(() => ({ run_id: window.__AOD__.run.run_id, pass: window.__AOD__.run.balance_residual.pass }));
for (const v of VIEWS) {
  await page.goto(FE + '/#/' + v); await page.waitForTimeout(v === 'vessel' || v === 'overview' ? 2500 : 900);
  const err = await page.$('.banner.red');
  const txt = err ? await err.textContent() : '';
  if (txt.startsWith('View error')) errors.push(`[view ${v}] ${txt}`);
  results[v] = { canvases: await page.$$eval('canvas', (c) => c.length) };
  await page.screenshot({ path: `${OUT}/${v}.png`, fullPage: v !== 'vessel' });
}
// actions
await page.goto(FE + '/#/thermo'); await page.click('#th-go'); await page.waitForSelector('#th-c', { timeout: 30000 }); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/thermo_computed.png`, fullPage: true });
await page.goto(FE + '/#/design'); await page.click('[data-cap="150"]'); await page.waitForSelector('#d-prof', { timeout: 30000 }); await page.waitForTimeout(500); await page.screenshot({ path: `${OUT}/design_150t.png`, fullPage: true });
await page.goto(FE + '/#/ml'); await page.check('#f-an'); await page.click('#f-go'); await page.waitForSelector('#e-c', { timeout: 120000 }); await page.waitForTimeout(600);
results.estimation_mode = await page.evaluate(() => window.__AOD__.recon.summary.mode);
await page.click('#m-go'); await page.waitForSelector('#m-T', { timeout: 120000 }); await page.click('#m-card'); await page.waitForSelector('#m-imp', { timeout: 60000 }); await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/ml_computed.png`, fullPage: true });
await page.goto(FE + '/#/mpc'); await page.fill('#mp-n', '12'); await page.fill('#mp-r', '2'); await page.click('#mp-go');
await page.waitForFunction(() => window.__AOD__.rec !== null, null, { timeout: 280000 }); await page.waitForTimeout(800);
results.mpc = await page.evaluate(() => ({ status: window.__AOD__.rec.status, advisory_only: window.__AOD__.rec.advisory_only, actions: window.__AOD__.rec.proposed_actions?.length }));
await page.click('#rv-ap'); await page.waitForTimeout(1500);
results.approval = await page.evaluate(() => window.__AOD__.rec.approval_status);
await page.screenshot({ path: `${OUT}/mpc_computed.png`, fullPage: true });
await page.goto(FE + '/#/scenarios'); await page.click('#bv-add'); await page.click('#bv-go'); await page.waitForSelector('#cm-C', { timeout: 120000 }); await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/scenarios_computed.png`, fullPage: true });
// backend-down behaviour
const p2 = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await p2.addInitScript(() => localStorage.setItem('aod.api', 'http://127.0.0.1:9'));
await p2.goto(FE + '/#/overview'); await p2.waitForTimeout(3000);
results.offline = await p2.evaluate(() => ({ online: window.__AOD__.backend.online, origin: window.__AOD__.runOrigin, hasRun: !!window.__AOD__.run }));
await p2.screenshot({ path: `${OUT}/offline_fixture.png` });
// mobile layout
const p3 = await browser.newPage({ viewport: { width: 390, height: 844 } });
await p3.addInitScript((api) => localStorage.setItem('aod.api', api), API);
await p3.goto(FE + '/#/overview'); await p3.waitForTimeout(2500);
results.mobile_overflow = await p3.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
await p3.screenshot({ path: `${OUT}/mobile_overview.png` });
await browser.close();
const report = { results, errors };
fs.writeFileSync(`${OUT}/e2e_result.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
process.exit(errors.length ? 1 : 0);
