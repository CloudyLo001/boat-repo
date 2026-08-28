// Capture a level while holding W so the leading end of the model (bow) is
// unambiguous. Usage: node scripts/drive-capture.mjs <levelIndex> <outPath>
import { chromium } from '@playwright/test';

const [level = '1', out = 'artifacts/drive.png'] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });
await page.evaluate((n) => window.__THREE_GAME_TEST_HOOKS__.setState(`level:${n}`), level);
await page.waitForTimeout(3500);
const before = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.player.position);
await page.keyboard.down('w');
await page.waitForTimeout(2200);
await page.screenshot({ path: out });
const after = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.player.position);
await page.keyboard.up('w');
console.log(JSON.stringify({ level, out, dz: (after.z - before.z).toFixed(2) }));
await browser.close();
