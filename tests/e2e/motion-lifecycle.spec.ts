import { test, expect } from '@playwright/test';
import { choose, recordMotion, expectSlide } from './motion-helpers';

test('sorting retains product nodes, repositions them, and repeated navigation leaves one working island', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/en/shop/');
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  const original = await page.locator('[data-product-id="b01-01"]').elementHandle();
  await choose(page, page.getByRole('combobox', { name: 'Sort by' }), 'price-desc');
  await expect(page.locator('.catalog-result-card').first()).toHaveAttribute(
    'data-product-id',
    'b01-10',
  );
  expect(await original!.evaluate((node) => node.isConnected)).toBe(true);
  for (let i = 0; i < 3; i++) {
    await page.locator('.language-link').click();
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    await page.locator('.catalog-result-card .product-image-link').first().click();
    await expect(page.getByRole('button', { name: 'M', exact: true })).toBeEnabled();
    await page.goBack();
    await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  }
  await expect(page.locator('.catalog')).toHaveCount(1);
  await page.getByRole('searchbox').fill('Studio');
  await expect(page.locator('.catalog-result-card')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('below-fold content slides into view once and remains visible when motion is reduced', async ({
  page,
}) => {
  await page.goto('/de/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const footer = page.locator('.footer-top');
  await recordMotion(page, '.footer-top');
  await footer.scrollIntoViewIfNeeded();
  await expectSlide(page);
  await expect(footer).toHaveCSS('transform', 'none');
  await page.locator('.hero').scrollIntoViewIfNeeded();
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toHaveCSS('transform', 'none');
  await page.reload();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(footer).toHaveCSS('transform', 'none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('server-rendered content remains visible without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/de/');
  await expect(page.locator('.hero')).toBeVisible();
  await expect(page.locator('.footer-top')).toBeVisible();
  await context.close();
});
