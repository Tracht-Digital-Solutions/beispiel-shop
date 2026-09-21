import { recordMotion, expectSlide } from './motion-helpers';
import { test, expect, type Page } from '@playwright/test';

async function openCatalog(page: Page, locale: 'de' | 'en', query = '') {
  await page.goto(`/${locale}/shop/${query}`);
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.catalog-results')).toHaveAttribute('data-phase', 'idle');
}

async function expectProducts(page: Page, locale: 'de' | 'en', slugs: string[]) {
  const results = page.locator('.catalog-results');
  await expect(results).toHaveAttribute('data-phase', 'idle');
  await expect(results.locator('.product-image-link')).toHaveCount(slugs.length);
  expect(
    await results
      .locator('.product-image-link')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
  ).toEqual(slugs.map((slug) => `/${locale}/product/${slug}/`));
  await expect(results.locator('[inert]')).toHaveCount(0);
  await expect(results.locator('[aria-hidden="true"] .product-card')).toHaveCount(0);
}

for (const locale of ['de', 'en'] as const) {
  test(`${locale}: rapid searches and category reversals settle on the latest selection`, async ({
    page,
  }) => {
    await openCatalog(page, locale);
    const search = page.getByRole('searchbox');
    await search.fill('Signal');
    await search.fill('no-product-matches-this');
    await search.fill('Studio');
    await expectProducts(page, locale, ['faded-tee', 'studio-tee', 'zip-hoodie']);
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('Studio');
    await expect(page).toHaveURL(new RegExp(`/${locale}/shop/\\?q=Studio$`));
    await expect(page.locator('.catalog-status [role="status"]')).toHaveText(
      locale === 'de' ? '3 Produkte' : '3 products',
    );

    const categories = page.locator('.category-tabs');
    await categories.getByRole('button', { name: locale === 'de' ? /^Hosen/ : /^Pants/ }).click();
    await categories
      .getByRole('button', { name: locale === 'de' ? /^T-Shirts/ : /^T-shirts/ })
      .click();
    const hoodies = categories.getByRole('button', { name: /^Hoodies &/ });
    await hoodies.click();
    await expectProducts(page, locale, ['zip-hoodie']);
    await expect(hoodies).toBeFocused();
    await expect(hoodies).toHaveClass(/active/);
    await expect(page).toHaveURL(/category=hoodies/);
    await expect(page).toHaveURL(/q=Studio/);

    // A search can be cleared or replaced while an outgoing set is still present.
    await search.fill('no-product-matches-this');
    await expectProducts(page, locale, []);
    await expect(
      page.getByRole('heading', {
        name: locale === 'de' ? 'Noch nicht dein Match.' : 'No match. Yet.',
      }),
    ).toBeVisible();
    await expect(search).toBeFocused();
    await search.fill('Signal');
    await search.fill('');
    await expectProducts(page, locale, [
      'concrete-hoodie',
      'signal-hoodie',
      'zip-hoodie',
      'raw-sweat',
    ]);
    await expect(search).toBeFocused();
    await expect(page).not.toHaveURL(/[?&]q=/);
    await page
      .locator('.filter-chips')
      .getByRole('button', { name: locale === 'de' ? 'Zurücksetzen' : 'Reset all' })
      .click();
    await expect(page.locator('.catalog-results')).toHaveAttribute('data-phase', 'idle');
    await expect(page.locator('.catalog-results .product-card')).toHaveCount(16);
    await expect(page).toHaveURL(`/${locale}/shop/`);
  });
}

test('a filtered catalogue survives product navigation, back and reload', async ({ page }) => {
  await openCatalog(page, 'en', '?category=tees&q=Studio');
  await expectProducts(page, 'en', ['faded-tee', 'studio-tee']);
  await page.locator('.catalog-results .product-image-link').first().click();
  await expect(page).toHaveURL('/en/product/faded-tee/');
  await page.goBack();
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  await expectProducts(page, 'en', ['faded-tee', 'studio-tee']);
  await expect(page.getByRole('searchbox')).toHaveValue('Studio');
  await expect(page.locator('.category-tabs .active')).toContainText('T-shirts');
  await page.reload();
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  await expectProducts(page, 'en', ['faded-tee', 'studio-tee']);
  await expect(page.getByRole('searchbox')).toHaveValue('Studio');
  await expect(page).toHaveURL(/category=tees&q=Studio/);
});

test('reduced motion updates search and category results without moving stale products', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openCatalog(page, 'en');
  const search = page.getByRole('searchbox');
  await search.fill('Studio');
  await expectProducts(page, 'en', ['faded-tee', 'studio-tee', 'zip-hoodie']);
  await expect(search).toBeFocused();
  await page
    .locator('.category-tabs')
    .getByRole('button', { name: /^Hoodies &/ })
    .click();
  await expectProducts(page, 'en', ['zip-hoodie']);
  expect(
    await page.locator('.catalog').evaluate((node) => node.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await search.fill('no-product-matches-this');
  await expectProducts(page, 'en', []);
  await page.getByRole('button', { name: 'View all products' }).click();
  await expect(search).toBeFocused();
  await expect(page.locator('.catalog-results')).toHaveAttribute('data-phase', 'idle');
  await expect(page.locator('.catalog-results .product-card')).toHaveCount(16);
  expect(
    await page.locator('.catalog').evaluate((node) => node.getAnimations({ subtree: true }).length),
  ).toBe(0);
});

test('search removes non-matches with a full slide while retained cards reposition without fading', async ({
  page,
}) => {
  await openCatalog(page, 'en');
  await recordMotion(page, '.catalog-result-card[data-product-id="b01-01"] > div');
  await page.getByRole('searchbox').fill('Studio');
  await expectSlide(page);
  await expectProducts(page, 'en', ['faded-tee', 'studio-tee', 'zip-hoodie']);
  await recordMotion(page, '.catalog-result-card[data-product-id="b01-01"] > div');
  await page.getByRole('searchbox').fill('');
  await expectSlide(page);
  await expect(page.locator('.catalog-result-card')).toHaveCount(16);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('category reversal and live reduced motion settle the newest selection', async ({ page }) => {
  await openCatalog(page, 'en', '?category=hoodies');
  await page
    .locator('.category-tabs')
    .getByRole('button', { name: /^T-shirts/ })
    .click();
  await page
    .locator('.category-tabs')
    .getByRole('button', { name: /^Pants/ })
    .click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectProducts(page, 'en', ['cargo-pant', 'wide-denim', 'carpenter-pant', 'track-pant']);
});
