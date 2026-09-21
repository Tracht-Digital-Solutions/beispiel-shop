import { test, expect } from '@playwright/test';
import { choose, recordMotion, expectSlide } from './motion-helpers';
for (const locale of ['de', 'en'])
  test(
    locale + ': dropdown opens and closes with a slide, keyboard selection and modal containment',
    async ({ page, isMobile }) => {
      await page.goto('/' + locale + '/shop/');
      await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
      if (isMobile) await page.locator('.mobile-filter-button').click();
      const trigger = page.locator(isMobile ? '#mobile-size' : '#desktop-size');
      await recordMotion(page, '.slide-select-popup');
      await trigger.click();
      await expectSlide(page, 'y');
      await page.keyboard.press('m');
      await page.keyboard.press('Enter');
      await expect(trigger).toContainText('M');
      await expect(page).toHaveURL(/size=M/);
      await expect(page.locator('.slide-select-popup')).not.toBeVisible();
      await trigger.click();
      if (isMobile)
        expect(
          await page
            .locator('.slide-select-popup')
            .evaluate((node) => !!node.closest('dialog[open]')),
        ).toBe(true);
      await recordMotion(page, '.slide-select-popup');
      await page.keyboard.press('Escape');
      await expectSlide(page, 'y');
      await expect(page.locator('.slide-select-popup')).not.toBeVisible();
      await expect(trigger).toBeFocused();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await choose(page, trigger, 'L');
      await expect(trigger).toContainText('L');
      await expect(page.locator('.slide-select-popup')).not.toBeVisible();
    },
  );
