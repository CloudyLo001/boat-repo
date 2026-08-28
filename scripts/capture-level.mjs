// Capture a screenshot of a specific fleet level via the level:N test hook.
// Usage: node scripts/capture-level.mjs <levelIndex> <outPath> [waitMs]
import { chromium } from '@playwright/test';

const [level = '0', out = 'artifacts/level.png', wait = '5000'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
page.on('pageerror', (err) => errors.push(String(err)));
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });
await page.evaluate((n) => window.__THREE_GAME_TEST_HOOKS__.setState(/^\d+$/.test(String(n)) ? `level:${n}` : `boat:${n}`), level);
await page.waitForTimeout(Number(wait));
await page.screenshot({ path: out });
console.log(JSON.stringify({ level, out, errors }));
await browser.close();
