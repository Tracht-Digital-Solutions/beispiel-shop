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

// Pause at the actual state change instead of relying on the runner reaching a 220 ms transition.
async function holdPhase(page: Page, phase: 'exit' | 'enter') {
  await page.locator('.catalog-results').evaluate((node, phase) => {
    const observer = new MutationObserver(() => {
      if ((node as HTMLElement).dataset.phase !== phase) return;
      const animations = node.getAnimations({ subtree: true });
      if (!animations.length) return;
      animations.forEach((animation) => {
        animation.pause();
        animation.currentTime = Number(animation.effect?.getTiming().duration) / 2;
      });
      observer.disconnect();
    });
    observer.observe(node, { attributes: true, attributeFilter: ['data-phase'] });
  }, phase);
}

async function releasePhase(page: Page) {
  await page.locator('.catalog-results').evaluate((node) => {
    node.getAnimations({ subtree: true }).forEach((animation) => animation.finish());
  });
}

test('search cards leave and enter through clipped full-width swipes without fading', async ({
  page,
}) => {
  await openCatalog(page, 'en');
  await holdPhase(page, 'exit');
  await page.getByRole('searchbox').fill('Studio');
  const results = page.locator('.catalog-results');
  await expect(results).toHaveAttribute('data-phase', 'exit');
  await expect(results.locator('.product-card')).toHaveCount(16);
  await expect(results.locator('.catalog-results-content')).toHaveJSProperty('inert', true);
  await expect(results.locator('.catalog-results-content')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.getByRole('searchbox')).toBeFocused();
  const movement = await results.locator('.catalog-result-card').evaluateAll((slots) =>
    slots.map((slot) => {
      const card = slot.querySelector<HTMLElement>('.product-card')!;
      const frames = (card.getAnimations()[0].effect as KeyframeEffect).getKeyframes();
      return {
        href: card.querySelector('a')!.getAttribute('href'),
        end: frames.at(-1)!.transform,
        opacity: getComputedStyle(card).opacity,
        offset: new DOMMatrix(getComputedStyle(card).transform).m41,
        width: card.offsetWidth,
      };
    }),
  );
  for (const card of movement) {
    const matches = [
      '/en/product/faded-tee/',
      '/en/product/studio-tee/',
      '/en/product/zip-hoodie/',
    ].includes(card.href!);
    expect(card.end).toBe(matches ? 'translateX(110%)' : 'translateX(-110%)');
    expect(card.opacity).toBe('1');
    expect(Math.abs(card.offset)).toBeGreaterThan(card.width * 0.5);
  }
  await holdPhase(page, 'enter');
  await releasePhase(page);
  await expect(results).toHaveAttribute('data-phase', 'enter');
  await expect(results.locator('.product-card')).toHaveCount(3);
  expect(
    await results.locator('.product-card').evaluateAll((cards) =>
      cards.every((card) => {
        const frames = (card.getAnimations()[0].effect as KeyframeEffect).getKeyframes();
        return (
          frames[0].transform === 'translateX(110%)' &&
          frames.at(-1)!.transform === 'none' &&
          getComputedStyle(card).opacity === '1'
        );
      }),
    ),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await releasePhase(page);
  await expectProducts(page, 'en', ['faded-tee', 'studio-tee', 'zip-hoodie']);
  await page.getByRole('searchbox').fill('no-product-matches-this');
  await expectProducts(page, 'en', []);
  await page.getByRole('button', { name: 'View all products' }).click();
  await expect(page.getByRole('searchbox')).toBeFocused();
  await expect(results).toHaveAttribute('data-phase', 'idle');
  await expect(results.locator('.product-card')).toHaveCount(16);
});

test('category groups swipe in both directions and changing motion preference settles a pending switch', async ({
  page,
}) => {
  await openCatalog(page, 'en', '?category=hoodies');
  const categories = page.locator('.category-tabs');
  for (const { name, direction, slugs } of [
    {
      name: /^T-shirts/,
      direction: -1,
      slugs: ['heavy-tee', 'faded-tee', 'studio-tee', 'line-tee'],
    },
    {
      name: /^Hoodies &/,
      direction: 1,
      slugs: ['concrete-hoodie', 'signal-hoodie', 'zip-hoodie', 'raw-sweat'],
    },
  ]) {
    await holdPhase(page, 'exit');
    const tab = categories.getByRole('button', { name });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-pressed', 'true');
    await expect(tab).toBeFocused();
    const content = page.locator('.catalog-results-content');
    expect(
      await content.evaluate(
        (node) =>
          (node.getAnimations()[0].effect as KeyframeEffect).getKeyframes().at(-1)!.transform,
      ),
    ).toBe(`translateX(${-direction * 110}%)`);
    await holdPhase(page, 'enter');
    await releasePhase(page);
    await expect(page.locator('.catalog-results')).toHaveAttribute('data-phase', 'enter');
    expect(
      await content.evaluate(
        (node) => (node.getAnimations()[0].effect as KeyframeEffect).getKeyframes()[0].transform,
      ),
    ).toBe(`translateX(${direction * 110}%)`);
    await releasePhase(page);
    await expectProducts(page, 'en', slugs);
  }
  await holdPhase(page, 'exit');
  await categories.getByRole('button', { name: /^Pants/ }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectProducts(page, 'en', ['cargo-pant', 'wide-denim', 'carpenter-pant', 'track-pant']);
  expect(
    await page
      .locator('.catalog-results')
      .evaluate((node) => node.getAnimations({ subtree: true }).length),
  ).toBe(0);
});
