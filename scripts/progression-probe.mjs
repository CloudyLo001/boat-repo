// The on-screen accelerate button must drive the same boost as Shift, and
// docking must unlock the next boat in the shuffled order.
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto((process.env.BOAT_PARK_URL ?? 'http://127.0.0.1:5188'), { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const order = await page.$$eval('#fleet-grid .fleet-name', (els) => els.map((e) => e.textContent.trim()));
const lockedBefore = await page.$$eval('#fleet-grid .fleet-card', (els) => els.map((e) => e.disabled));

await page.click('#play-button');
await page.waitForTimeout(2500);

// Hold the on-screen button rather than the key.
await page.keyboard.down('w');
await page.waitForTimeout(800);
await page.hover('#boost-button');
await page.mouse.down();
await page.waitForTimeout(1200);
const buttonBoosting = await page.$eval('#boost-button', (el) => el.classList.contains('is-active'));
const chipBoosting = (await page.textContent('#hud-speed')).includes('▲');
await page.mouse.up();
await page.keyboard.up('w');
await page.waitForTimeout(800);
const releasedChip = (await page.textContent('#hud-speed')).includes('▲');

// Dock boat 1, go back to the menu, confirm boat 2 of the order unlocked.
await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setState('complete'));
await page.waitForTimeout(9000);
await page.keyboard.press('Escape');
await page.waitForTimeout(800);
const lockedAfter = await page.$$eval('#fleet-grid .fleet-card', (els) => els.map((e) => e.disabled));
const starsFirst = await page.$$eval('#fleet-grid .fleet-stars', (els) => els.map((e) => e.textContent.trim()));

console.log(JSON.stringify({
  order,
  buttonDrivesBoost: buttonBoosting && chipBoosting,
  boostReleases: !releasedChip,
  lockedBefore,
  lockedAfter,
  unlockedNextInOrder: lockedBefore[1] === true && lockedAfter[1] === false,
  firstBoatRated: starsFirst[0],
  errors,
}, null, 2));

await context.close();
await browser.close();
