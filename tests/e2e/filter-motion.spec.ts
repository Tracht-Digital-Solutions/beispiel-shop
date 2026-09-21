import { test, expect } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { recordMotion, expectSlide } from './motion-helpers';
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

for (const locale of ['de', 'en']) {
  test(
    locale + ': tags slide in and out, remain inert during exit and support rapid re-addition',
    async ({ page }) => {
      await page.goto('/' + locale + '/shop/');
      await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
      const search = page.getByRole('searchbox');
      const query = page.locator('.filter-chip-slot[data-filter="q"]');
      await recordMotion(page, '.filter-chip-slot[data-filter="q"] > div');
      await search.fill('Studio');
      await expectSlide(page);
      await expect(query).toHaveCount(1);
      await recordMotion(page, '.filter-chip-slot[data-filter="q"] > div');
      await query.getByRole('button').click();
      await expect(search).toBeFocused();
      await expect(page).not.toHaveURL(/q=/);
      await expectSlide(page);
      await search.fill('Studio');
      await expect(query).toHaveCount(1);
      await expect(query).not.toHaveAttribute('inert');
      await search.fill('');
      await search.fill('Studio');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(query).toHaveCount(1);
      await expect(query.locator('div')).toHaveCSS('transform', 'none');
      await query.getByRole('button').click();
      await expect(query).toHaveCount(0);
      await expect(page.locator('.catalog-result-card')).toHaveCount(16);
    },
  );
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
