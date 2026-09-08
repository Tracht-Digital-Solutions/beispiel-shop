import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function addTee(page: Page, locale = 'de') {
  await page.goto(`/${locale}/product/heavy-tee/`);
  await expect(page.getByRole('button', { name: /^XS —/ })).toBeDisabled();
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await expect(page.getByRole('button', { name: 'M', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page
    .getByRole('button', { name: locale === 'de' ? 'In den Warenkorb' : 'Add to bag', exact: true })
    .click();
  await expect(page.locator('.commerce-cart-drawer')).toBeVisible();
}
test('root defaults to German and the collection images load', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/de\/$/);
  await expect(page).toHaveTitle(/BLOCK\/01/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('DEIN RHYTHMUS.');
  await expect(page.locator('.hero-image')).toBeVisible();
  await page.locator('.featured').scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator('.featured img')
        .evaluateAll((images) =>
          images.every(
            (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
});
test('filters combine, persist in URL and reset from zero matches', async ({ page }, testInfo) => {
  await page.goto('/de/shop/?category=tees&size=M');
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.product-card')).toHaveCount(4);
  await page.getByRole('searchbox').fill('nicht-vorhanden');
  await expect(page.getByRole('heading', { name: 'Noch nicht dein Match.' })).toBeVisible();
  await expect(page).toHaveURL(/q=nicht-vorhanden/);
  await page.reload();
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  await expect(page.getByRole('searchbox')).toHaveValue('nicht-vorhanden');
  await page.getByRole('button', { name: 'Alle Produkte zeigen' }).click();
  await expect(page.locator('.product-card')).toHaveCount(16);
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Filter +' }).click();
    await page.locator('#mobile-color').selectOption('orange');
    await page.getByRole('button', { name: '2 Produkte anzeigen' }).click();
  } else await page.locator('#desktop-color').selectOption('orange');
  await expect(page.locator('.product-card')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Sortierung' }).selectOption('price-desc');
  await expect(page.locator('.product-card').first()).toContainText('Signal Hoodie');
});
for (const locale of ['de', 'en'])
  test(`${locale}: purchase, validation, quantities and confirmation`, async ({ page }) => {
    const de = locale === 'de';
    const writes: string[] = [];
    page.on('request', (r) => {
      if (r.method() === 'POST') writes.push(r.url());
    });
    await addTee(page, locale);
    await page.keyboard.press('Escape');
    await expect(page.locator('.commerce-cart-drawer')).not.toBeVisible();
    await expect(
      page.getByRole('button', { name: de ? 'In den Warenkorb' : 'Add to bag', exact: true }),
    ).toBeFocused();
    await page.goto(`/${locale}/cart/`);
    await expect(page.locator('.commerce-cart-item')).toHaveCount(1);
    await page
      .getByRole('button', {
        name: de ? 'Menge von Heavyweight Tee erhöhen' : 'Increase quantity of Heavyweight Tee',
      })
      .click();
    await expect(page.locator('.commerce-quantity input')).toHaveValue('2');
    await page.reload();
    await expect(page.locator('.commerce-quantity input')).toHaveValue('2');
    await page.goto(`/${locale}/checkout/`);
    await page
      .getByRole('button', {
        name: de ? 'Weiter zu Versand & Prüfung' : 'Continue to shipping & review',
      })
      .click();
    await expect(page.getByLabel(de ? 'Vorname' : 'First name', { exact: true })).toBeFocused();
    await page
      .getByRole('button', { name: de ? 'Beispieldaten einsetzen' : 'Use sample details' })
      .click();
    await page
      .getByRole('button', {
        name: de ? 'Weiter zu Versand & Prüfung' : 'Continue to shipping & review',
      })
      .click();
    await expect(page.locator('.commerce-review-address')).toContainText('Alex Beispiel');
    await page
      .getByRole('button', { name: de ? 'Demo-Bestellung abschließen' : 'Complete demo order' })
      .click();
    await expect(
      page.getByRole('heading', { name: de ? 'Guter Fit. Gute Wahl.' : 'Good fit. Good choice.' }),
    ).toBeVisible();
    await expect(page.locator('.cart-number')).toHaveText('00');
    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(storage).not.toContain('alex@example.com');
    expect(storage).not.toContain('Musterstraße');
    expect(writes).toEqual([]);
    await page.reload();
    await expect(
      page.getByRole('heading', {
        name: de ? 'Hier fehlt noch dein Fit.' : 'Your fit is missing.',
      }),
    ).toBeVisible();
  });
test('language switching keeps product and bag; last item can be removed', async ({ page }) => {
  await addTee(page);
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: /Switch to English/ }).click();
  await expect(page).toHaveURL('/en/product/heavy-tee/');
  await expect(page.locator('.cart-number')).toHaveText('01');
  await page.goto('/en/cart/');
  await expect(page.locator('.commerce-cart-item')).toHaveCount(1);
  await page.getByRole('button', { name: 'Remove Heavyweight Tee' }).click();
  await expect(page.locator('.commerce-cart-item')).toHaveCount(0);
});
test('blocked storage leaves the shopping flow usable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await addTee(page, 'en');
  await expect(page.locator('.commerce-cart-drawer')).toContainText(
    'cannot save your bag permanently',
  );
  await expect(page.locator('.cart-number')).toHaveText('01');
  await page.goto('/en/cart/');
  await expect(page.locator('.commerce-cart-item')).toHaveCount(1);
});
test('size guide and zoom dialogs support Escape and return focus', async ({ page }) => {
  await page.goto('/en/product/heavy-tee/');
  const guide = page.getByRole('button', { name: 'Size guide' });
  await guide.click();
  await expect(page.locator('.product-guide-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(guide).toBeFocused();
  const zoom = page.getByRole('button', { name: /Enlarge product image/ });
  await zoom.click();
  await expect(page.locator('.product-zoom-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(zoom).toBeFocused();
  await page.getByRole('button', { name: 'Show image 2' }).click();
  await expect(page.locator('.product-gallery-main img')).toHaveAttribute(
    'src',
    '/images/look-1.webp',
  );
  await expect
    .poll(() =>
      page
        .locator('.product-gallery-main img')
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
});
test('all catalog and lookbook images load locally without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const url of ['/en/shop/', '/de/lookbook/']) {
    await page.goto(url);
    for (const image of await page.locator('main img').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (img) =>
              (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0,
          ),
        )
        .toBe(true);
    }
  }
  expect(errors).toEqual([]);
});
test('checkout and open shopping dialogs pass accessibility checks', async ({ page }, testInfo) => {
  await addTee(page, 'en');
  let scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.keyboard.press('Escape');
  await page.goto('/en/checkout/');
  await page.getByRole('button', { name: 'Use sample details' }).click();
  await page.getByLabel('First name', { exact: true }).fill('   ');
  await page.getByRole('button', { name: 'Continue to shipping & review' }).click();
  await expect(page.getByLabel('First name', { exact: true })).toBeFocused();
  await page.getByLabel('First name', { exact: true }).fill('Alex');
  scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.getByRole('button', { name: 'Continue to shipping & review' }).click();
  scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
    .analyze();
  expect(scan.violations).toEqual([]);
  if (testInfo.project.name === 'mobile') {
    await page.goto('/en/shop/');
    await page.getByRole('button', { name: 'Filters +' }).click();
    scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
      .analyze();
    expect(scan.violations).toEqual([]);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Open menu' }).click();
    scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
      .analyze();
    expect(scan.violations).toEqual([]);
  }
});
test('representative pages are accessible and fit the viewport', async ({ page }) => {
  for (const url of ['/de/', '/en/shop/', '/en/product/concrete-hoodie/', '/de/lookbook/']) {
    await page.goto(url);
    await page.locator('main').waitFor();
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
      .analyze();
    expect(
      scan.violations,
      `${url}: ${JSON.stringify(scan.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      url,
    ).toBe(true);
  }
});
test('small phone and tablet layouts do not overflow', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === 'mobile',
    'Explicit widths are covered in the desktop project.',
  );
  for (const width of [320, 834]) {
    await page.setViewportSize({ width, height: 900 });
    for (const url of [
      '/de/',
      '/en/shop/',
      '/de/product/concrete-hoodie/',
      '/en/lookbook/',
      '/de/about/',
    ]) {
      await page.goto(url);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        `${width}: ${url}`,
      ).toBe(true);
    }
  }
});
