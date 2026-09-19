import { test, expect, type Locator } from '@playwright/test';

async function picker(select: Locator) {
  return select.evaluate((node) => {
    const style = getComputedStyle(node, '::picker(select)');
    return {
      opacity: style.opacity,
      display: style.display,
      y: new DOMMatrix(style.transform).m42,
      height: parseFloat(style.height),
    };
  });
}

for (const locale of ['de', 'en']) {
  test(`${locale}: dropdowns swipe open and closed, preserve keyboard selection and respect reduced motion`, async ({
    page,
  }, testInfo) => {
    await page.goto(`/${locale}/shop/`);
    await expect(page.locator('.catalog')).toHaveAttribute('data-ready', 'true');
    // Picker transitions live inside the browser's shadow tree and are not exposed by
    // getAnimations(). Slow only this transition so intermediate frames are reproducible.
    await page.addStyleTag({ content: 'select::picker(select) { transition-duration: 2s; }' });
    const sort = page.getByRole('combobox', { name: locale === 'de' ? 'Sortierung' : 'Sort by' });
    await sort.click();
    await expect.poll(async () => (await picker(sort)).y).toBeLessThan(-10);
    const entry = await picker(sort);
    expect(entry.opacity).toBe('1');
    await expect.poll(async () => (await picker(sort)).y).toBe(0);
    await page.keyboard.press('Escape');
    await expect.poll(() => sort.evaluate((node) => node.matches(':open'))).toBe(false);
    await expect.poll(async () => (await picker(sort)).y).toBeLessThan(-entry.height / 2);
    const exit = await picker(sort);
    expect(exit.opacity).toBe('1');
    expect(exit.display).not.toBe('none');
    await expect.poll(async () => (await picker(sort)).display).toBe('none');
    await expect(sort).toBeFocused();

    await page.addStyleTag({ content: 'select::picker(select) { transition-duration: 320ms; }' });
    await sort.press('Space');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(sort).toHaveValue('name');
    await expect(page).toHaveURL(/sort=name/);

    if (testInfo.project.name === 'mobile') {
      await page.getByRole('button', { name: locale === 'de' ? 'Filter +' : 'Filters +' }).click();
    }
    const size = page.locator(`#${testInfo.project.name}-size`);
    await size.click();
    await page.getByRole('option', { name: 'M', exact: true }).click();
    await expect(size).toHaveValue('M');
    await expect(page).toHaveURL(/size=M/);
    if (testInfo.project.name === 'mobile') {
      await expect(page.locator('.filter-dialog')).toBeVisible();
      await page
        .getByRole('button', { name: locale === 'de' ? 'Filter schließen' : 'Close filters' })
        .click();
    }

    await sort.click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect((await picker(sort)).y).toBe(0);
    await page.keyboard.press('Escape');
    expect((await picker(sort)).display).toBe('none');
    await sort.click();
    expect((await picker(sort)).y).toBe(0);
    await page.keyboard.press('Escape');
    expect((await picker(sort)).display).toBe('none');
  });
}
