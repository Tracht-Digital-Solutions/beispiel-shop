import { test, expect } from '@playwright/test';

async function holdNextTransition(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    (window as any).__pageSlides = null;
    document.addEventListener(
      'astro:before-swap',
      (event: any) => {
        event.viewTransition.ready
          .then(() => {
            const animations = document
              .getAnimations()
              .filter((animation) =>
                (animation as CSSAnimation).animationName?.startsWith('page-slide-'),
              );
            animations.forEach((animation) => animation.pause());
            (window as any).__pageSlides = animations;
          })
          .catch(() => {});
      },
      { once: true },
    );
  });
}

test('page snapshots move together without gaps at quarter, half and three-quarter progress', async ({
  page,
}, testInfo) => {
  await page.goto('/de/shop/');
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  for (const [locale, direction] of [
    ['en', 1],
    ['de', -1],
  ] as const) {
    await holdNextTransition(page);
    await page.locator('.language-link').click();
    await expect(page).toHaveURL('/' + locale + '/shop/');
    await page.waitForFunction(() => (window as any).__pageSlides?.length === 2);
    for (const progress of [0.25, 0.5, 0.75]) {
      const frame = await page.evaluate(async (progress) => {
        const animations = (window as any).__pageSlides as Animation[];
        animations.forEach((animation) => {
          animation.currentTime = 420 * progress;
        });
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const read = (name: string) => {
          const style = getComputedStyle(
            document.documentElement,
            '::view-transition-' + name + '(root)',
          );
          return {
            x: new DOMMatrix(style.transform).m41,
            width: parseFloat(style.width),
            opacity: style.opacity,
            duration: style.animationDuration,
          };
        };
        return { old: read('old'), next: read('new'), width: innerWidth };
      }, progress);
      expect(frame.old.opacity).toBe('1');
      expect(frame.next.opacity).toBe('1');
      expect(frame.old.duration).toBe('0.42s');
      expect(frame.next.duration).toBe('0.42s');
      expect(frame.old.x * direction).toBeLessThan(0);
      expect(frame.next.x * direction).toBeGreaterThan(0);
      const seam =
        direction === 1
          ? frame.old.x + frame.old.width - frame.next.x
          : frame.next.x + frame.next.width - frame.old.x;
      expect(Math.abs(seam)).toBeLessThan(1);
      expect(frame.old.width).toBe(frame.width);
      expect(frame.next.width).toBe(frame.width);
      if (progress === 0.5)
        await page.screenshot({ path: testInfo.outputPath('slide-' + locale + '.png') });
    }
    await page.evaluate(() =>
      (window as any).__pageSlides.forEach((animation: Animation) => animation.finish()),
    );
    await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('.page-shell')).toHaveCSS('transform', 'none');
  }
});

test('a slow destination keeps the current page visible until it is ready', async ({ page }) => {
  await page.goto('/de/shop/');
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/en/shop/', async (route) => {
    await gate;
    await route.continue();
  });
  const request = page.waitForRequest('**/en/shop/');
  await page.locator('.language-link').click();
  await request;
  await expect(page).toHaveURL('/de/shop/');
  await expect(page.locator('.page-shell')).toHaveCSS('transform', 'none');
  await expect(page.locator('main')).toBeVisible();
  expect(
    await page.evaluate(() =>
      document
        .getAnimations()
        .some((a) => (a as CSSAnimation).animationName?.startsWith('page-slide')),
    ),
  ).toBe(false);
  release();
  await expect(page).toHaveURL('/en/shop/');
});

test('motion reduction finishes an active slide and unsupported browsers swap immediately', async ({
  page,
}) => {
  await page.goto('/de/shop/');
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  await holdNextTransition(page);
  await page.locator('.language-link').click();
  await page.waitForFunction(() => (window as any).__pageSlides?.length === 2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter((a) => (a as CSSAnimation).animationName?.startsWith('page-slide')).length,
      ),
    )
    .toBe(0);
  await expect(page.locator('.page-shell')).toHaveCSS('transform', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    Object.defineProperty(document, 'startViewTransition', { value: undefined });
  });
  await page.goto('/de/shop/');
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  await page.locator('.language-link').click();
  await expect(page).toHaveURL('/en/shop/');
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.page-shell')).toHaveCSS('transform', 'none');
});

test('a newer navigation wins and history restores a scrolled page', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/de/shop/?category=tees');
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => scrollTo({ top: 500, behavior: 'instant' }));
  const originalScroll = await page.evaluate(() => scrollY);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/de/about/', async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  const requested = page.waitForRequest('**/de/about/');
  await page
    .locator('a[href="/de/about/"]')
    .first()
    .evaluate((link: HTMLAnchorElement) => link.click());
  await requested;
  // The visible old page remains usable while the first destination is pending.
  await page.locator('.language-link').evaluate((link: HTMLAnchorElement) => link.click());
  await expect(page).toHaveURL('/en/shop/?category=tees');
  release();
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  await page.goBack();
  await expect(page).toHaveURL('/de/shop/?category=tees');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(originalScroll, 0);
  await expect(page.locator('.catalog-result-card')).toHaveCount(4);
  await expect(page.locator('.page-shell')).toHaveCSS('transform', 'none');
  expect(errors).toEqual([]);
});
