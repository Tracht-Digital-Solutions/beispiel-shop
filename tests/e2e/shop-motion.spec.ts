import { test, expect, type Locator, type Page } from '@playwright/test';

async function addTee(page: Page) {
  await page.goto('/en/product/heavy-tee/');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  const drawer = page.locator('.commerce-cart-drawer');
  await expect(drawer).toBeVisible();
  await finishMotion(drawer);
  return drawer;
}

async function finishMotion(element: Locator) {
  await element.evaluate(async (node) => {
    await Promise.allSettled(
      node.getAnimations({ subtree: true }).map((motion) => motion.finished),
    );
  });
}

// Hold an actual exit midway so we can inspect the still-visible interface,
// without depending on how quickly the test runner reaches the next assertion.
async function holdExit(button: Locator, ownerSelector: string, state: string) {
  const held = await button.evaluate(
    async (element, { ownerSelector, state }) => {
      const owner = element.closest<HTMLElement>(ownerSelector);
      if (!owner) throw new Error(`Missing motion owner: ${ownerSelector}`);
      (element as HTMLButtonElement).click();
      for (let frame = 0; frame < 10; frame++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const motions = owner.getAnimations().filter((motion) => motion.playState === 'running');
        if (owner.dataset.state === state && motions.length) {
          motions.forEach((motion) => motion.pause());
          return motions.length;
        }
      }
      return 0;
    },
    { ownerSelector, state },
  );
  expect(held, 'The outgoing content must remain mounted while it moves').toBeGreaterThan(0);
}

async function releaseMotion(element: Locator) {
  await element.evaluate((node) => {
    node.getAnimations({ subtree: true }).forEach((motion) => motion.finish());
  });
}

async function swipe(page: Page, element: Locator, direction: 'left' | 'right') {
  await element.scrollIntoViewIfNeeded();
  const bounds = await element.boundingBox();
  if (!bounds) throw new Error('Swipe target has no visible bounds');
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Touch viewport unavailable');
  const from = bounds.x + bounds.width * (direction === 'left' ? 0.8 : 0.2);
  const to = bounds.x + bounds.width * (direction === 'left' ? 0.2 : 0.8);
  const y = Math.max(20, Math.min(viewport.height - 20, bounds.y + bounds.height / 2));
  const client = await page.context().newCDPSession(page);
  try {
    await client.send('Input.synthesizeScrollGesture', {
      x: from,
      y,
      xDistance: to - from,
      yDistance: 0,
      speed: 500,
      preventFling: true,
      gestureSourceType: 'touch',
    });
  } finally {
    await client.detach();
  }
}

test('closing the bag retains its content and scroll lock until it returns focus', async ({
  page,
}) => {
  const drawer = await addTee(page);
  const add = page.getByRole('button', { name: 'Add to bag', exact: true });
  await holdExit(
    drawer.getByRole('button', { name: 'Close bag' }),
    '.commerce-cart-drawer',
    'closing',
  );

  await expect(drawer).toBeVisible();
  await expect(drawer.locator('.commerce-cart-item')).toHaveCount(1);
  await expect(drawer.getByRole('link', { name: 'Go to demo checkout' })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  // A second close request must not release the modal early.
  await page.keyboard.press('Escape');
  await expect(drawer).toBeVisible();
  await releaseMotion(drawer);
  await expect(drawer).not.toBeVisible();
  await expect(add).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');

  const opener = page.getByRole('button', { name: 'Open bag, 01', exact: true });
  await opener.click();
  await expect(drawer.locator('.commerce-cart-item')).toHaveCount(1);
  await finishMotion(drawer);
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('removing and re-adding the last item does not restore a deleted row or lose the new item', async ({
  page,
}) => {
  const drawer = await addTee(page);
  const row = drawer.locator('.commerce-cart-item');
  const remove = drawer.getByRole('button', { name: 'Remove Heavyweight Tee' });
  await remove.focus();
  await holdExit(remove, '.commerce-cart-item', 'exit');

  await expect(page.locator('.cart-number')).toHaveText('00');
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('block01-cart-v1') || '[]')),
  ).toEqual([]);
  await expect(row).toHaveJSProperty('inert', true);
  await expect(row).toHaveAttribute('aria-hidden', 'true');
  await expect(drawer.getByRole('link', { name: 'Go to demo checkout' })).toHaveCount(0);

  // Leave while the old row is still moving, then immediately add the same variant.
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  await expect(drawer).toBeVisible();
  await releaseMotion(drawer);
  await expect(row).toHaveCount(1);
  await expect(row).not.toHaveAttribute('data-state', 'exit');
  await expect(row.locator('input')).toHaveValue('1');
  await expect(page.locator('.cart-number')).toHaveText('01');

  await page.goto('/en/cart/');
  const cart = page.locator('.commerce-cart-page');
  await expect(cart.locator('.commerce-cart-item')).toHaveCount(1);
  await cart.getByRole('button', { name: 'Remove Heavyweight Tee' }).click();
  await expect(cart.locator('.commerce-cart-item')).toHaveCount(0);
  const emptyLink = cart.getByRole('link', { name: 'Explore the collection' });
  await expect(emptyLink).toBeVisible();
  await expect(emptyLink).toBeFocused();
  await page.reload();
  await expect(cart.locator('.commerce-cart-item')).toHaveCount(0);
  await expect(emptyLink).toBeVisible();
});

test('fast image changes settle on the selected image and magnification supports keyboard navigation', async ({
  page,
  isMobile,
}) => {
  await page.goto('/en/product/heavy-tee/');
  const gallery = page.locator('.product-gallery-main');
  const image = gallery.locator('img');
  const first = page.getByRole('button', { name: 'Show image 1', exact: true });
  const second = page.getByRole('button', { name: 'Show image 2', exact: true });
  await second.click();
  await first.click();
  await second.click();
  await expect(second).toHaveAttribute('aria-pressed', 'true');
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  await finishMotion(gallery);
  await expect(gallery).toHaveAttribute('data-sliding', 'false');
  await expect(image).toHaveAttribute('src', '/images/look-1.webp');
  await expect(image).toHaveCount(1);

  if (!isMobile) {
    await gallery.hover();
    const lens = page.locator('.product-magnifier');
    await expect(lens).toBeVisible();
    const originalPosition = await lens.evaluate(
      (node) => getComputedStyle(node).backgroundPosition,
    );
    const galleryBounds = await gallery.boundingBox();
    if (!galleryBounds) throw new Error('Missing gallery bounds');
    await page.mouse.move(
      galleryBounds.x + galleryBounds.width * 0.7,
      galleryBounds.y + galleryBounds.height * 0.6,
    );
    await expect
      .poll(() => lens.evaluate((node) => getComputedStyle(node).backgroundPosition))
      .not.toBe(originalPosition);
    const magnifiedWidth = await lens.evaluate((node) =>
      parseFloat(getComputedStyle(node).backgroundSize),
    );
    expect(magnifiedWidth).toBeGreaterThan(galleryBounds.width);
    await page.getByRole('heading', { name: 'Heavyweight Tee', exact: true }).hover();
    await expect(page.locator('.product-magnifier')).not.toBeVisible();
  }

  await gallery.click();
  const dialog = page.locator('.product-zoom-dialog');
  await expect(dialog).toBeVisible();
  await finishMotion(dialog);
  const detail = dialog.getByRole('button', { name: 'Image detail', exact: true });
  if (isMobile) await detail.tap();
  else await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click();
  const reset = dialog.getByRole('button', { name: 'Reset zoom', exact: true });
  await expect(reset).toHaveAttribute('aria-pressed', 'true');
  await detail.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await expect(dialog.locator('img')).toHaveAttribute('src', '/images/look-1.webp');
  await reset.click();
  await expect(dialog.getByRole('button', { name: 'Zoom in', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
  await dialog.getByRole('button', { name: 'Next image', exact: true }).click();
  await finishMotion(dialog);
  await expect(dialog.locator('img')).toHaveAttribute('src', '/images/heavy-tee.webp');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(gallery).toBeFocused();
});

test('touch swipes change images without opening or toggling zoom, and a zoomed drag pans', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Touch gestures use the mobile browser project.');
  await page.goto('/en/product/heavy-tee/');
  await expect(page.getByRole('button', { name: 'Show image 2', exact: true })).toBeEnabled();
  const gallery = page.locator('.product-gallery-main');
  const dialog = page.locator('.product-zoom-dialog');
  await swipe(page, gallery, 'left');
  await expect(gallery.locator('img')).toHaveAttribute('src', '/images/look-1.webp');
  await expect(gallery).toHaveAttribute('data-sliding', 'false');
  await expect(dialog).not.toBeVisible();

  // A deliberate thumbnail selection is separate from the suppressed swipe click.
  await page.getByRole('button', { name: 'Show image 1', exact: true }).click();
  await expect(gallery).toHaveAttribute('data-sliding', 'false');
  await gallery.tap();
  await expect(dialog).toBeVisible();
  await finishMotion(dialog);
  const detail = dialog.getByRole('button', { name: 'Image detail', exact: true });
  await swipe(page, detail, 'left');
  await expect(detail.locator('img')).toHaveAttribute('src', '/images/look-1.webp');
  await expect(detail).toHaveAttribute('data-sliding', 'false');
  await expect(detail).toHaveAttribute('aria-pressed', 'false');

  await detail.tap();
  await expect(detail).toHaveAttribute('aria-pressed', 'true');
  const originalOrigin = await detail
    .locator('img')
    .evaluate((node) => getComputedStyle(node).transformOrigin);
  await swipe(page, detail, 'right');
  await expect(detail).toHaveAttribute('aria-pressed', 'true');
  await expect(detail.locator('img')).toHaveAttribute('src', '/images/look-1.webp');
  await expect
    .poll(() => detail.locator('img').evaluate((node) => getComputedStyle(node).transformOrigin))
    .not.toBe(originalOrigin);
  await dialog.getByRole('button', { name: 'Close image', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(gallery).toBeFocused();
});

test('accordion reversals leave content, focus and expanded state consistent', async ({ page }) => {
  await page.goto('/en/product/heavy-tee/');
  await expect(page.locator('astro-island[ssr]')).toHaveCount(0);
  const accordion = page
    .locator('.product-accordions details')
    .filter({ hasText: 'Care instructions' });
  const summary = accordion.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await finishMotion(accordion);
  await expect(summary).toHaveAttribute('aria-expanded', 'true');
  await expect(accordion).toHaveAttribute('open', '');
  await expect(accordion.locator('p')).toBeVisible();
  await expect(summary).toBeFocused();
  await page.keyboard.press('Space');
  await finishMotion(accordion);
  await expect(summary).toHaveAttribute('aria-expanded', 'false');
  await expect(accordion).not.toHaveAttribute('open');
  await expect(accordion.locator('p')).not.toBeVisible();
  await expect(summary).toBeFocused();
});

test('reduced motion preserves instant gallery, accordion and cart actions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/en/product/heavy-tee/');
  await page.getByRole('button', { name: 'Show image 2', exact: true }).click();
  await expect(page.locator('.product-gallery-main img')).toHaveAttribute(
    'src',
    '/images/look-1.webp',
  );
  const accordion = page
    .locator('.product-accordions details')
    .filter({ hasText: 'Care instructions' });
  await accordion.locator('summary').click();
  await expect(accordion.locator('p')).toBeVisible();
  await accordion.locator('summary').click();
  await expect(accordion.locator('p')).not.toBeVisible();
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'Add to bag', exact: true }).click();
  const drawer = page.locator('.commerce-cart-drawer');
  await expect(drawer.locator('.commerce-cart-item')).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.getAnimations().filter((motion) => motion.playState === 'running').length,
    ),
  ).toBe(0);
  await drawer.getByRole('button', { name: 'Remove Heavyweight Tee' }).click();
  await expect(drawer.locator('.commerce-cart-item')).toHaveCount(0);
  await expect(drawer.getByRole('link', { name: 'Explore the collection' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to bag', exact: true })).toBeFocused();
  expect(
    await page.evaluate(
      () => document.getAnimations().filter((motion) => motion.playState === 'running').length,
    ),
  ).toBe(0);
});
