// Measure headless fps and renderer stats for a level.
import { chromium } from '@playwright/test';

const level = process.argv[2] ?? '0';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });
await page.evaluate((n) => window.__THREE_GAME_TEST_HOOKS__.setState(`level:${n}`), level);
await page.waitForTimeout(4000);
const a = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.frame);
await page.waitForTimeout(3000);
const b = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__);
console.log(JSON.stringify({ level, fps: +((b.frame - a) / 3).toFixed(1), calls: b.renderer.calls, triangles: b.renderer.triangles }));
await browser.close();
