import { expect, type Locator, type Page } from '@playwright/test';
export async function choose(page: Page, trigger: Locator, value: string) {
  await trigger.click();
  await page.locator(`.slide-select-option[data-value="${value}"]`).click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
}
/** Inspect actual animation frames without depending on a particular animation engine. */
export async function recordMotion(page: Page, selector: string) {
  await page.evaluate((selector) => {
    const samples: { x: number; y: number; opacity: string; width: number; height: number }[] = [];
    (window as any).__motionSamples = samples;
    const started = performance.now();
    function sample() {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) {
        const style = getComputedStyle(element);
        const matrix = new DOMMatrix(style.transform);
        samples.push({
          x: matrix.m41,
          y: matrix.m42,
          opacity: style.opacity,
          width: element.offsetWidth,
          height: element.offsetHeight,
        });
      }
      if (performance.now() - started < 1600) requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }, selector);
}
export async function expectSlide(page: Page, axis: 'x' | 'y' = 'x') {
  await expect
    .poll(() =>
      page.evaluate(
        (axis) => (window as any).__motionSamples.some((s: any) => Math.abs(s[axis]) > 8),
        axis,
      ),
    )
    .toBe(true);
  expect(
    await page.evaluate(() => (window as any).__motionSamples.every((s: any) => s.opacity === '1')),
  ).toBe(true);
}
