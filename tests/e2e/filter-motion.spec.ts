import { test, expect, type Locator } from '@playwright/test';

async function holdDeparture(owner: Locator, state: string) {
  await owner.evaluate((node, state) => {
    const observer = new MutationObserver(() => {
      const departing = [node, ...node.querySelectorAll('[data-state]')].filter(
        (element) => (element as HTMLElement).dataset.state === state,
      );
      const motions = departing.flatMap((element) => element.getAnimations({ subtree: true }));
      if (!motions.length) return;
      motions.forEach((motion) => {
        motion.pause();
        motion.currentTime = Number(motion.effect?.getTiming().duration) / 2;
      });
      observer.disconnect();
    });
    observer.observe(node, { attributes: true, subtree: true, attributeFilter: ['data-state'] });
  }, state);
}

for (const locale of ['de', 'en'] as const) {
  test(`${locale}: removing chips updates filters immediately and re-adding cancels the old exit`, async ({
    page,
  }) => {
    await page.goto(`/${locale}/shop/?q=Studio&size=M`);
    await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
    const chips = page.locator('.filter-chips');
    const query = chips.locator('[data-filter="q"]');
    const search = page.getByRole('searchbox');
    await holdDeparture(query, 'exit');
    await query.getByRole('button').click();
    await expect(query).toHaveAttribute('data-state', 'exit');
    await expect(query).toHaveJSProperty('inert', true);
    await expect(query).toHaveAttribute('aria-hidden', 'true');
    await expect(search).toBeFocused();
    await expect(search).toHaveValue('');
    await expect(page).toHaveURL(`/${locale}/shop/?size=M`);
    const motion = await query.locator('button').evaluate((button) => ({
      opacity: getComputedStyle(button).opacity,
      offset: new DOMMatrix(getComputedStyle(button).transform).m41,
      width: (button as HTMLButtonElement).offsetWidth,
    }));
    expect(motion.opacity).toBe('1');
    expect(motion.offset).toBeLessThan(-motion.width / 2);
    await expect(page.locator('.catalog-results')).toHaveAttribute('data-phase', 'idle');
    await expect(page.locator('.catalog-results .product-card')).toHaveCount(12);

    await search.fill('Studio');
    await expect(query).toHaveAttribute('data-state', 'idle');
    await expect(query).toHaveCount(1);
    await expect(query).not.toHaveAttribute('inert');
    await expect(page.locator('.catalog-results')).toHaveAttribute('data-phase', 'idle');
    await expect(page.locator('.catalog-results .product-card')).toHaveCount(3);
    await expect(query).toContainText('Studio');

    await holdDeparture(chips, 'exit');
    await chips
      .getByRole('button', { name: locale === 'de' ? 'Zurücksetzen' : 'Reset all' })
      .click();
    await expect(chips.locator('[data-state="exit"]')).toHaveCount(3);
    await expect(search).toBeFocused();
    await expect(page).toHaveURL(`/${locale}/shop/`);
    // Changing the preference must release even a departure already in progress.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(chips.locator('.filter-chip-slot')).toHaveCount(0);
    await expect(page.locator('.catalog-results .product-card')).toHaveCount(16);
    await search.fill('Studio');
    await chips.locator('[data-filter="q"]').getByRole('button').click();
    await expect(chips.locator('.filter-chip-slot')).toHaveCount(0);
    expect(await chips.evaluate((node) => node.getAnimations({ subtree: true }).length)).toBe(0);
  });
}

test('the filter panel swipes out through each close action and returns focus', async ({
  page,
  isMobile,
}) => {
  if (!isMobile) await page.setViewportSize({ width: 540, height: 900 });
  await page.goto('/en/shop/');
  await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
  const opener = page.getByRole('button', { name: 'Filters +' });
  const dialog = page.getByRole('dialog', { name: 'Product filters' });
  for (const action of ['close', 'results', 'escape', 'backdrop']) {
    await opener.click();
    await expect(dialog).toBeVisible();
    await dialog.evaluate(async (node) => {
      await Promise.allSettled(node.getAnimations().map((motion) => motion.finished));
    });
    const bounds = await dialog.boundingBox();
    if (!bounds) throw new Error('Missing filter panel bounds');
    // Clicking the panel's own padding must leave it open.
    await page.mouse.click(bounds.x + 8, bounds.y + 8);
    await expect(dialog).toBeVisible();
    await holdDeparture(dialog, 'closing');
    if (action === 'close') await dialog.getByRole('button', { name: 'Close filters' }).click();
    else if (action === 'results')
      await dialog.getByRole('button', { name: /products — show results/ }).click();
    else if (action === 'escape') await page.keyboard.press('Escape');
    else await page.mouse.click(10, Math.max(1, bounds.y - 30));
    await expect(dialog).toHaveAttribute('data-state', 'closing');
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((node) => node.matches(':modal'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    await dialog.evaluate((node) => node.getAnimations().forEach((motion) => motion.finish()));
    await expect(dialog).not.toBeVisible();
    await expect(opener).toBeFocused();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await opener.click();
  await dialog.getByRole('button', { name: 'Close filters' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});
