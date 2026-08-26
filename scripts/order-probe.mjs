// The run order must always open with the dinghy, vary between fresh runs, and
// stay put across a reload within one run.
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const readOrder = (page) =>
  page.$$eval('#fleet-grid .fleet-name', (els) => els.map((e) => e.textContent.trim()));

// Several fresh runs, each with cleared storage.
const runs = [];
for (let i = 0; i < 5; i += 1) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  runs.push(await readOrder(page));
  await context.close();
}

// Persistence + reshuffle inside one run.
const context = await browser.newContext();
const page = await context.newPage();
await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const first = await readOrder(page);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const afterReload = await readOrder(page);
await page.click('#reshuffle-fleet');
await page.waitForTimeout(300);
const afterReshuffle = await readOrder(page);

// Starting play uses position 0 of the order.
await page.click('#play-button');
await page.waitForTimeout(900);
const hudLevel = await page.textContent('#hud-level');
const buttonVisible = await page.isVisible('#boost-button');

console.log(JSON.stringify({
  everyRunStartsWithDinghy: runs.every((r) => r[0] === 'Dinghy'),
  distinctOrders: new Set(runs.map((r) => r.join('>'))).size,
  runsSampled: runs.length,
  persistsAcrossReload: first.join('>') === afterReload.join('>'),
  reshuffleChangesOrder: afterReshuffle.join('>') !== afterReload.join('>'),
  reshuffleKeepsDinghyFirst: afterReshuffle[0] === 'Dinghy',
  hudLevel,
  accelerateButtonVisible: buttonVisible,
  sampleOrder: runs[0],
}, null, 2));

await context.close();
await browser.close();
