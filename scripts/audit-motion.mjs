import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

// Reproducible foreground rAF sampling, not field INP or a device FPS guarantee.
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4321';
const samples = [];
await mkdir('docs/performance', { recursive: true });
await mkdir('.cache', { recursive: true });
await context.tracing.start({ screenshots: true, snapshots: true });
try {
  await page.goto(base + '/en/shop/');
  await page.locator('.catalog[data-ready="true"]').waitFor();
  for (const [name, action] of [
    ['search', () => page.getByRole('searchbox').fill('Studio')],
    ['reset', () => page.getByRole('searchbox').fill('')],
    [
      'category',
      () =>
        page
          .locator('.category-tabs')
          .getByRole('button', { name: /^Hoodies/ })
          .click(),
    ],
    ['language', () => page.locator('.language-link').click()],
  ]) {
    await page.evaluate(() => {
      window.__frameSample = new Promise((resolve) => {
        const frames = [];
        let previous = performance.now();
        const start = previous;
        function sample(now) {
          frames.push(now - previous);
          previous = now;
          if (now - start < 1000) requestAnimationFrame(sample);
          else resolve(frames.slice(1));
        }
        requestAnimationFrame(sample);
      });
    });
    await action();
    const frames = await page.evaluate(() => window.__frameSample);
    const sorted = [...frames].sort((a, b) => a - b);
    samples.push({
      name,
      frames: frames.length,
      medianMs: sorted[Math.floor(sorted.length / 2)],
      p95Ms: sorted[Math.floor(sorted.length * 0.95)],
      maxMs: Math.max(...frames),
      framesOver50Ms: frames.filter((value) => value > 50).length,
    });
  }
  await writeFile(
    'docs/performance/motion-frames.json',
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: browser.version(),
        viewport: '1440x960',
        throttling: 'none',
        durationPerInteractionMs: 1000,
        samples,
      },
      null,
      2,
    ),
  );
  await context.tracing.stop({ path: '.cache/motion-performance-trace.zip' });
  console.log(JSON.stringify(samples, null, 2));
} finally {
  await browser.close();
}
