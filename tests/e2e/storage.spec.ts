import { test, expect, type Page } from '@playwright/test';

const cartKey = 'block01-cart-v1';

function captureClientErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`Page error: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`Console error: ${message.text()}`);
  });
  return errors;
}

async function staggerCommerceHydration(page: Page) {
  // Reproduce separate Astro islands loading after the header has restored
  // browser state. Their first client snapshot must still match server HTML.
  await page.route(/\/(?:Cart|Checkout|ProductDetail)\.[^/]+\.js$/, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.continue();
  });
}

test('saved cart hydrates across product, cart and checkout without client errors', async ({
  page,
}) => {
  const errors = captureClientErrors(page);
  await staggerCommerceHydration(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      'block01-cart-v1',
      JSON.stringify([{ variantId: 'heavy-tee-chalk-m', quantity: 2 }]),
    ),
  );
  for (const url of ['/en/product/heavy-tee/', '/en/cart/', '/en/checkout/', '/de/cart/']) {
    await page.goto(url);
    await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
    await expect(page.locator('.cart-number')).toHaveText('02');
    if (url.includes('/cart/')) {
      await expect(page.locator('.commerce-quantity input')).toHaveValue('2');
    } else if (url.includes('/checkout/')) {
      await expect(page.locator('.commerce-checkout-items li')).toHaveCount(1);
      await expect(page.locator('.commerce-checkout-items')).toContainText('Qty 2');
    }
    expect(errors, url).toEqual([]);
  }
});

test('fully blocked storage stays usable and navigates without hydration errors', async ({
  page,
}) => {
  const errors = captureClientErrors(page);
  await staggerCommerceHydration(page);
  await page.addInitScript(() => {
    for (const key of ['localStorage', 'sessionStorage']) {
      Object.defineProperty(window, key, {
        get() {
          throw new DOMException('Storage blocked', 'SecurityError');
        },
      });
    }
  });
  await addTee(page);
  await expect(page.locator('.commerce-notice')).toContainText(
    'lost when you reload or change pages',
  );
  await page.getByRole('button', { name: 'Increase quantity of Heavyweight Tee' }).click();
  await expect(page.locator('.commerce-quantity input')).toHaveValue('2');
  await page.getByRole('link', { name: 'View bag', exact: true }).click();
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.locator('.commerce-cart-item')).toHaveCount(0);
  await expect(page.locator('.commerce-notice')).toContainText(
    'lost when you reload or change pages',
  );
  await page.goto('/en/checkout/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Your fit is missing.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('adding the last available unit preserves focus when the bag closes', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'block01-cart-v1',
      JSON.stringify([{ variantId: 'heavy-tee-chalk-m', quantity: 9 }]),
    ),
  );
  await page.goto('/en/product/heavy-tee/');
  await expect(page.locator('.cart-number')).toHaveText('09');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await expect(page.locator('.commerce-cart-drawer')).toBeVisible();
  await expect(page.locator('.cart-number')).toHaveText('10');
  await page.keyboard.press('Escape');
  const capped = page.getByRole('button', { name: 'Maximum stock already in bag' });
  await expect(capped).toBeFocused();
  await expect(capped).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  await expect(page.locator('.commerce-cart-drawer')).not.toBeVisible();
  await expect(page.locator('.cart-number')).toHaveText('10');
});

async function simulateFullLocalStorage(page: Page) {
  await page.addInitScript(() => {
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === window.localStorage && sessionStorage.getItem('allow-local-writes') !== 'yes') {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem.call(this, key, value);
    };
  });
}

async function addTee(page: Page) {
  await page.goto('/en/product/heavy-tee/');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await expect(page.locator('.commerce-cart-drawer')).toBeVisible();
  await expect(page.locator('.cart-number')).toHaveText('01');
}

test('readable but full local storage falls back across navigation and demo checkout', async ({
  page,
}) => {
  await simulateFullLocalStorage(page);
  await addTee(page);
  await expect(page.locator('.commerce-notice')).toContainText('until you close this tab');
  expect(await page.evaluate((key) => localStorage.getItem(key), cartKey)).toBeNull();
  expect(
    await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) || '[]'), cartKey),
  ).toHaveLength(1);
  await page.getByRole('link', { name: 'Go to demo checkout', exact: true }).click();
  await expect(page.locator('.commerce-checkout-items li')).toHaveCount(1);
  await page.getByRole('button', { name: 'Use sample details' }).click();
  await page.getByRole('button', { name: 'Continue to shipping & review' }).click();
  await page.getByRole('button', { name: 'Complete demo order' }).click();
  await expect(page.getByRole('heading', { name: 'Good fit. Good choice.' })).toBeVisible();
  await page.goto('/en/cart/');
  await expect(page.locator('.cart-number')).toHaveText('00');
  await expect(page.locator('.commerce-cart-item')).toHaveCount(0);
  expect(
    await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) || '[]'), cartKey),
  ).toEqual([]);
});

test('successful local writes remove the session fallback without resurrecting stale items', async ({
  page,
}) => {
  await simulateFullLocalStorage(page);
  await addTee(page);
  await page.keyboard.press('Escape');
  await page.goto('/en/cart/');
  await expect(page.locator('.commerce-quantity input')).toHaveValue('1');
  await page.evaluate(() => sessionStorage.setItem('allow-local-writes', 'yes'));
  await page.getByRole('button', { name: 'Increase quantity of Heavyweight Tee' }).click();
  await expect(page.locator('.commerce-quantity input')).toHaveValue('2');
  await expect(page.locator('.commerce-notice')).toHaveCount(0);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), cartKey)).toBeNull();
  await page.reload();
  await expect(page.locator('.commerce-quantity input')).toHaveValue('2');
  await page.getByRole('button', { name: 'Remove Heavyweight Tee' }).click();
  await page.reload();
  await expect(page.locator('.cart-number')).toHaveText('00');
  await expect(page.locator('.commerce-cart-item')).toHaveCount(0);
});
