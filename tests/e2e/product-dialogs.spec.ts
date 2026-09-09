import { test, expect, type Locator, type Page, type TestInfo } from '@playwright/test';

const viewportsFor = (testInfo: TestInfo) =>
  testInfo.project.name === 'mobile'
    ? [
        { width: 320, height: 568 },
        { width: 667, height: 375 },
      ]
    : [{ width: 1440, height: 900 }];

async function expectCenteredAndContained(dialog: Locator, page: Page) {
  // Check the final position after the panel has entered from outside the viewport.
  await expect(dialog).toHaveCSS('transform', 'none');
  const bounds = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (!bounds || !viewport) throw new Error('Dialog or viewport bounds unavailable');
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
  expect(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2)).toBeLessThanOrEqual(1);
  expect(Math.abs(bounds.y + bounds.height / 2 - viewport.height / 2)).toBeLessThanOrEqual(1);
  return bounds;
}

async function expectImageContained(dialog: Locator, page: Page) {
  const image = dialog.locator('img');
  await image.evaluate((element: HTMLImageElement) => element.decode());
  const bounds = await expectCenteredAndContained(dialog, page);
  const metrics = await image.evaluate((element: HTMLImageElement) => {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      naturalWidth: element.naturalWidth,
      naturalHeight: element.naturalHeight,
    };
  });
  expect(metrics.naturalWidth).toBeGreaterThan(0);
  expect(metrics.naturalHeight).toBeGreaterThan(0);
  expect(metrics.width).toBeGreaterThan(0);
  expect(metrics.height).toBeGreaterThan(0);
  expect(metrics.x).toBeGreaterThanOrEqual(bounds.x - 1);
  expect(metrics.y).toBeGreaterThanOrEqual(bounds.y - 1);
  expect(metrics.x + metrics.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
  expect(metrics.y + metrics.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1);
  const naturalRatio = metrics.naturalWidth / metrics.naturalHeight;
  expect(Math.abs(metrics.width / metrics.height / naturalRatio - 1)).toBeLessThan(0.005);
}

async function expectClosed(dialog: Locator, trigger: Locator, page: Page) {
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
}

test('product controls become usable only after their interaction code loads', async ({ page }) => {
  let releaseScript!: () => void;
  const scriptGate = new Promise<void>((resolve) => {
    releaseScript = resolve;
  });
  await page.route(/\/ProductDetail\.[^/]+\.js$/, async (route) => {
    await scriptGate;
    await route.continue();
  });
  try {
    await page.goto('/en/product/heavy-tee/', { waitUntil: 'domcontentloaded' });
    const zoom = page.getByRole('button', { name: /Enlarge product image/ });
    const size = page.getByRole('button', { name: 'M', exact: true });
    const guide = page.getByRole('button', { name: /^Size guide/ });
    await expect(zoom).toBeDisabled();
    await expect(size).toBeDisabled();
    await expect(guide).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Show image 2' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Chalk', exact: true })).toBeDisabled();

    releaseScript();
    await zoom.click();
    await expect(page.locator('.product-zoom-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await size.click();
    await expect(size).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
    await expect(page.locator('.commerce-cart-drawer')).toBeVisible();
  } finally {
    releaseScript();
  }
});

test('product and lifestyle zoom stay centered, fit the viewport and return focus on close', async ({
  page,
}, testInfo) => {
  for (const viewport of viewportsFor(testInfo)) {
    await test.step(`${viewport.width} × ${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      await page.goto('/en/product/heavy-tee/');
      await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      const trigger = page.getByRole('button', {
        name: /Explore the details: Enlarge product image/,
      });
      const dialog = page.locator('.product-zoom-dialog');

      for (const [index, source] of ['/images/heavy-tee.webp', '/images/look-1.webp'].entries()) {
        await page.getByRole('button', { name: `Show image ${index + 1}`, exact: true }).click();
        await trigger.click();
        await expect(dialog).toBeVisible();
        await expect(dialog.locator('img')).toHaveAttribute('src', source);
        await expectImageContained(dialog, page);
        await expect(
          dialog.getByRole('button', { name: 'Close image', exact: true }),
        ).toBeFocused();
        if (index === 0) await page.keyboard.press('Escape');
        else await dialog.getByRole('button', { name: 'Close image', exact: true }).click();
        await expectClosed(dialog, trigger, page);
      }

      await trigger.click();
      await expect(dialog).toBeVisible();
      const bounds = await expectCenteredAndContained(dialog, page);
      expect(bounds.x).toBeGreaterThan(1);
      expect(bounds.y).toBeGreaterThan(1);
      await page.mouse.click(1, 1);
      await expectClosed(dialog, trigger, page);
    });
  }
});

test('size guide stays centered after page and dialog scrolling and closes only on the backdrop', async ({
  page,
}, testInfo) => {
  for (const viewport of viewportsFor(testInfo)) {
    await test.step(`${viewport.width} × ${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      await page.goto('/en/product/heavy-tee/');
      await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
      await page.evaluate(async () => {
        await document.fonts.ready;
        window.scrollTo({ top: 180, behavior: 'instant' });
      });
      const trigger = page.getByRole('button', { name: /^Size guide/ });
      const dialog = page.locator('.product-guide-dialog');
      await trigger.scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      await trigger.click();
      await expect(dialog).toBeVisible();
      await expectCenteredAndContained(dialog, page);
      const scrolling = await dialog.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
        return {
          scrollTop: element.scrollTop,
          scrollable: element.scrollHeight > element.clientHeight,
        };
      });
      if (scrolling.scrollable) expect(scrolling.scrollTop).toBeGreaterThan(0);
      const bounds = await expectCenteredAndContained(dialog, page);
      // The dialog's own padding is content, not the backdrop.
      await page.mouse.click(bounds.x + 5, bounds.y + bounds.height / 2);
      await expect(dialog).toBeVisible();
      await page.keyboard.press('Escape');
      await expectClosed(dialog, trigger, page);

      await trigger.click();
      await dialog.getByRole('button', { name: 'Close size guide', exact: true }).click();
      await expectClosed(dialog, trigger, page);

      await trigger.click();
      await expect(dialog).toBeVisible();
      await expectCenteredAndContained(dialog, page);
      await page.mouse.click(1, 1);
      await expectClosed(dialog, trigger, page);
    });
  }
});
