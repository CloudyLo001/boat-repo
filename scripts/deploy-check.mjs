// Load the production build exactly as GitHub Pages will serve it — under a
// /<repo>/ subpath — and confirm nothing 404s and the scene actually renders.
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://127.0.0.1:4188/boat-park/';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const failed = [];
const errors = [];
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.click('#play-button');
await page.waitForTimeout(8000);

const diag = await page.evaluate(() => {
  const d = window.__THREE_GAME_DIAGNOSTICS__;
  const a = window.__THREE_GAME_TEST_HOOKS__.audioState();
  return {
    frames: d.frame,
    drawCalls: d.renderer.calls,
    triangles: d.renderer.triangles,
    boatHasModel: window.__THREE_GAME_TEST_HOOKS__.measureWaterline().usingModel,
    audioBuffers: a.buffersLoaded,
    audioLoops: a.loopsRunning,
  };
});
await page.screenshot({ path: 'artifacts/deploy-check.png' });

console.log(JSON.stringify({ url, ...diag, failedRequests: failed, errors }, null, 2));
await browser.close();
