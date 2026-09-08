import { chromium, devices } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4321';
await mkdir('docs/screenshots', { recursive: true });
const browser = await chromium.launch();
for (const [name, options] of [
  ['desktop', { viewport: { width: 1440, height: 1000 } }],
  ['mobile', { ...devices['Pixel 7'], deviceScaleFactor: 1 }],
  ['tablet', { viewport: { width: 834, height: 1112 } }],
]) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto(base + '/de/');
  await page.evaluate(() => document.fonts.ready);
  // Scroll through the page so lazy images are present in the full-page capture.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
  });
  await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: false });
  await page.screenshot({ path: `docs/screenshots/${name}-full.png`, fullPage: true });
  if (name === 'desktop') {
    await page.goto(base + '/en/product/concrete-hoodie/');
    await page.screenshot({ path: 'docs/screenshots/product.png', fullPage: true });
  }
  await context.close();
}
await browser.close();
