import { test, expect, type Page } from '@playwright/test';

type MotionWindow = Window & {
  languageMotions?: { name: string; frames: Keyframe[] }[];
  languageMotionError?: string;
};

async function holdLanguageSwipe(page: Page) {
  await page.addInitScript(() => {
    (window as MotionWindow).languageMotions = [];
    window.addEventListener('pagereveal', (event) => {
      const transition = (event as PageRevealEvent).viewTransition;
      if (!transition)
        (window as MotionWindow).languageMotionError = 'No native transition was created';
      transition?.ready
        .then(() => {
          const motions = document
            .getAnimations()
            .filter(
              (animation) =>
                animation instanceof CSSAnimation &&
                animation.animationName.startsWith('language-'),
            );
          (window as MotionWindow).languageMotions = motions.map((animation) => ({
            name: (animation as CSSAnimation).animationName,
            frames: (animation.effect as KeyframeEffect).getKeyframes(),
          }));
          motions.forEach((animation) => {
            animation.pause();
            animation.currentTime = 180;
          });
        })
        .catch((error) => {
          (window as MotionWindow).languageMotionError = String(error);
        });
    });
  });
}

async function releaseLanguageSwipe(page: Page) {
  await page.evaluate(() =>
    document
      .getAnimations()
      .filter(
        (animation) =>
          animation instanceof CSSAnimation && animation.animationName.startsWith('language-'),
      )
      .forEach((animation) => animation.finish()),
  );
  await expect(page.locator('html')).not.toHaveAttribute('data-language-swipe');
  // Let the browser dispose the manually-finished snapshot before another navigation.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

test('the whole page swipes in both language directions while preserving the route and filters', async ({
  page,
}, testInfo) => {
  await holdLanguageSwipe(page);
  await page.goto('/de/shop/?category=tees&q=Studio#catalog-search');
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  for (const { locale, direction, names } of [
    { locale: 'en', direction: 'forward', names: ['language-in-right', 'language-out-left'] },
    { locale: 'de', direction: 'backward', names: ['language-in-left', 'language-out-right'] },
  ]) {
    await page.locator('.language-link').click();
    await expect(page).toHaveURL(`/${locale}/shop/?category=tees&q=Studio#catalog-search`);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect
      .poll(() =>
        page.evaluate(() => ({
          names: (window as MotionWindow).languageMotions?.map((motion) => motion.name).sort(),
          error: (window as MotionWindow).languageMotionError,
        })),
      )
      .toEqual({ names, error: undefined });
    await expect(page.locator('html')).toHaveAttribute('data-language-swipe', direction);
    const motions = await page.evaluate(() => (window as MotionWindow).languageMotions!);
    expect(
      motions.every((motion) =>
        motion.frames.every((frame) => frame.opacity === undefined || Number(frame.opacity) === 1),
      ),
    ).toBe(true);
    await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
    await expect(page.getByRole('searchbox')).toHaveValue('Studio');
    await expect(page.locator('.catalog-results .product-card')).toHaveCount(2);
    if (locale === 'en') await page.screenshot({ path: testInfo.outputPath('language-swipe.png') });
    await releaseLanguageSwipe(page);
  }
  await page.locator('.product-image-link').first().click();
  await expect(page).toHaveURL('/de/product/faded-tee/');
  await expect(page.locator('html')).not.toHaveAttribute('data-language-swipe');
  expect(await page.evaluate(() => (window as MotionWindow).languageMotions)).toEqual([]);
});

test('reduced-motion language changes retain the bag without a page animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await holdLanguageSwipe(page);
  await page.goto('/de/product/heavy-tee/');
  await page.getByRole('button', { name: 'M', exact: true }).click();
  await page.getByRole('button', { name: 'In den Warenkorb', exact: true }).click();
  await page.keyboard.press('Escape');
  await page.locator('.language-link').click();
  await expect(page).toHaveURL('/en/product/heavy-tee/');
  await expect(page.locator('.cart-number')).toHaveText('01');
  await expect(page.locator('html')).not.toHaveAttribute('data-language-swipe');
  expect(await page.evaluate(() => (window as MotionWindow).languageMotions)).toEqual([]);
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
