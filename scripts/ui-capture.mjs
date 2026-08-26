import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto('http://127.0.0.1:5188', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
// Menu: fleet list showing the drawn order.
await page.evaluate(() => document.querySelector('#fleet').scrollIntoView());
await page.waitForTimeout(600);
await page.screenshot({ path: 'artifacts/ui-fleet-order.png' });
// In game: accelerate button held.
await page.click('#play-button');
await page.waitForTimeout(3500);
await page.keyboard.down('w');
await page.waitForTimeout(1500);
await page.keyboard.down('Shift');
await page.waitForTimeout(1200);
await page.screenshot({ path: 'artifacts/ui-accelerate.png' });
await page.keyboard.up('Shift');
await page.keyboard.up('w');
console.log('captured');
await browser.close();
