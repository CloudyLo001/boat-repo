// Desktop smoke: drive the game through real keyboard and mouse input and
// confirm each control actually reaches the simulation.
//
// The headless renderer runs software-rasterized at a few frames per second, so
// wall-clock distance travelled is not a usable signal here. Assertions check
// that input changes the right state, not how far the hull got.
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://127.0.0.1:5188';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

await page.goto(url, { waitUntil: 'networkidle' });
// Let the menu boat and dock GLBs finish parsing.
await page.waitForTimeout(3500);

const diag = () => page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__);
const speedChip = () => page.textContent('#hud-speed');

// 1. Menu → Play
await page.click('#play-button');
await page.waitForTimeout(500);
const menuHidden = await page.evaluate(() => document.querySelector('#menu').hidden);

// 2. Throttle: W puts way on.
await page.keyboard.down('w');
await page.waitForTimeout(2500);
const underway = await diag();
await page.keyboard.up('w');

// 3. Boost: Shift is flagged in the HUD while held.
await page.keyboard.down('w');
await page.keyboard.down('Shift');
await page.waitForTimeout(1200);
const boostChip = await speedChip();
await page.keyboard.up('Shift');
await page.waitForTimeout(800);
const plainChip = await speedChip();

// 4. Rudder: A swings the bow.
const beforeTurn = await diag();
await page.keyboard.down('a');
await page.waitForTimeout(2000);
const afterTurn = await diag();
await page.keyboard.up('a');
await page.keyboard.up('w');

// 5. Drift: a hard turn leaves the hull tracking off its bow.
const drifted = afterTurn.player.slipAngleDeg > 2;

// 6. Reverse, retry, mooring, menu.
await page.keyboard.down('s');
await page.waitForTimeout(1500);
await page.keyboard.up('s');
await page.keyboard.press('r');
await page.waitForTimeout(400);
const afterRetry = await diag();

await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('complete'));
await page.waitForTimeout(1200);
const bannerVisible = await page.evaluate(() => !document.querySelector('#banner').hidden);
const bannerTitle = await page.evaluate(() => document.querySelector('#banner-title').textContent);

await page.keyboard.press('Escape');
await page.waitForTimeout(400);
const menuBack = await page.evaluate(() => !document.querySelector('#menu').hidden);

await page.screenshot({ path: 'artifacts/smoke-play.png' });

console.log(JSON.stringify({
  menuHidden,
  throttleMakesWay: underway.player.speed > 0.2,
  boostFlagged: boostChip.includes('▲') && !plainChip.includes('▲'),
  rudderSwingsBow: Math.abs(afterTurn.player.headingDeg - beforeTurn.player.headingDeg) > 1,
  hullDrifts: drifted,
  slipAngleDeg: +afterTurn.player.slipAngleDeg.toFixed(1),
  retryResets: afterRetry.elapsed < 1,
  bannerVisible,
  bannerTitle,
  menuBack,
  consoleErrors,
}, null, 2));

await browser.close();
