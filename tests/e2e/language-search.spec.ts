import { test, expect } from '@playwright/test';
import { recordMotion, expectSlide } from './motion-helpers';
test('all page navigation slides in both language directions and keeps filters and browser history', async ({
  page,
}) => {
  await page.goto('/de/shop/?category=tees&q=Studio#catalog-search');
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  for (const locale of ['en', 'de']) {
    await recordMotion(page, '.page-shell');
    await page.locator('.language-link').click();
    await expect(page).toHaveURL('/' + locale + '/shop/?category=tees&q=Studio#catalog-search');
    await expectSlide(page);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('searchbox')).toHaveValue('Studio');
    await expect(page.locator('.catalog-result-card')).toHaveCount(2);
    await expect(page.locator('.page-shell')).toHaveCSS('transform', 'none');
  }
  await page.locator('.catalog-result-card .product-image-link').first().click();
  await expect(page).toHaveURL('/de/product/faded-tee/');
  await page.goBack();
  await expect(page.getByRole('searchbox')).toHaveValue('Studio');
});
test('reduced-motion language changes retain the bag without a page animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.goto('/de/product/heavy-tee/');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'In den Warenkorb', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.locator('.language-link').click();
  await expect(page).toHaveURL('/en/product/heavy-tee/');
  await expect(page.locator('.cart-number')).toHaveText('01');
  await expect(page.locator('html')).not.toHaveAttribute('data-language-swipe');
  await expect(page.locator('.page-shell')).toHaveCSS('transform', 'none');
});

for (const locale of ['de', 'en'] as const) {
  test(`${locale}: the search button and Enter show results, including empty matches`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/shop/?category=tees#catalog-search`);
    await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
    const search = page.getByRole('searchbox');
    const button = page
      .getByRole('search')
      .getByRole('button', { name: locale === 'de' ? 'Suchen' : 'Search', exact: true });
    await expect(search).toBeFocused();
    await button.click();
    await expect(search).toBeFocused();
    await search.fill('Studio');
    await button.click();
    await expect(page.locator('.search-summary')).toBeFocused();
    await expect(page.locator('.search-summary')).toHaveText(
      locale === 'de' ? '2 Produkte' : '2 products',
    );
    await expect(page).toHaveURL(`/${locale}/shop/?q=Studio&category=tees#catalog-search`);
    await expect(page.locator('.catalog-results')).toHaveAttribute('data-phase', 'idle');
    await expect(page.locator('.catalog-results .product-card')).toHaveCount(2);
    await search.fill('not-a-product');
    await search.press('Enter');
    await expect(page.locator('.search-summary')).toBeFocused();
    await expect(page.locator('.empty-state')).toBeVisible();
    const bounds = await button.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  });
}

test('header search opens the input and preserves existing catalogue filters', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/de/product/faded-tee/');
  await page.getByRole('link', { name: 'Suchen', exact: true }).click();
  await expect(page).toHaveURL('/de/shop/#catalog-search');
  await expect(page.getByRole('searchbox')).toBeFocused();
  await page.getByRole('searchbox').fill('Studio');
  await page
    .locator('.category-tabs')
    .getByRole('button', { name: /^T-Shirts/ })
    .click();
  await page.getByRole('link', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('searchbox')).toBeFocused();
  await expect(page.getByRole('searchbox')).toHaveValue('Studio');
  await expect(page).toHaveURL('/de/shop/?q=Studio&category=tees#catalog-search');
});
