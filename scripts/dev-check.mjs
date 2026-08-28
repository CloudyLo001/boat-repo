import { chromium } from '@playwright/test';
const url = process.argv[2] ?? 'http://127.0.0.1:52828/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const bad = [], errs = [];
page.on('response', r => { if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`); });
page.on('pageerror', e => errs.push(String(e)));
page.on('console', m => m.type() === 'error' && errs.push(m.text()));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.click('#play-button');
await page.waitForTimeout(7000);
const d = await page.evaluate(() => ({
  frames: window.__THREE_GAME_DIAGNOSTICS__.frame,
  calls: window.__THREE_GAME_DIAGNOSTICS__.renderer.calls,
  model: window.__THREE_GAME_TEST_HOOKS__.measureWaterline().usingModel,
  audio: window.__THREE_GAME_TEST_HOOKS__.audioState().buffersLoaded,
}));
console.log(JSON.stringify({ url, ...d, failed: bad, errors: errs }, null, 2));
await browser.close();
