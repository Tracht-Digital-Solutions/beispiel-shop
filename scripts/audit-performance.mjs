import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4321';
await mkdir('docs/performance', { recursive: true });
const profileDir = resolve(process.env.LIGHTHOUSE_PROFILE_DIR || '.cache/lighthouse-profile');
await mkdir(profileDir, { recursive: true });
const chrome = await launch({
  chromePath: chromium.executablePath(),
  userDataDir: profileDir,
  chromeFlags: ['--headless=new', '--no-sandbox'],
});
const results = [];
try {
  for (const [name, route] of [
    ['home', '/de/'],
    ['product', '/en/product/concrete-hoodie/'],
  ]) {
    const result = await lighthouse(base + route, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    });
    const { lhr } = result;
    await writeFile(`docs/performance/${name}.json`, JSON.stringify(lhr, null, 2));
    results.push({
      name,
      url: route,
      date: lhr.fetchTime,
      lighthouseVersion: lhr.lighthouseVersion,
      performance: lhr.categories.performance.score,
      accessibility: lhr.categories.accessibility.score,
      bestPractices: lhr.categories['best-practices'].score,
      seo: lhr.categories.seo.score,
      lcp: lhr.audits['largest-contentful-paint'].numericValue,
      cls: lhr.audits['cumulative-layout-shift'].numericValue,
      tbt: lhr.audits['total-blocking-time'].numericValue,
      environment: lhr.environment,
    });
  }
  await writeFile('docs/performance/summary.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally {
  chrome.kill();
}
