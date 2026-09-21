import { inView } from 'motion';
import type {
  TransitionBeforePreparationEvent,
  TransitionBeforeSwapEvent,
} from 'astro:transitions/client';
import { reducedMotion, slideElement, timing } from './motion';
import { $cartOpen } from './cart';

// Safari does not focus pointer-activated buttons by default. Keep dialog return
// targets and keyboard continuation consistent with the other browser engines.
document.addEventListener(
  'click',
  (event) => {
    if (event.button !== 0) return;
    const button = (event.target as Element)?.closest<HTMLButtonElement>('button');
    if (button && !button.disabled && !button.closest('[inert], .filter-chip-slot'))
      button.focus({ preventScroll: true });
  },
  true,
);

let cancelPage: (() => void) | undefined;
let cleanupReveals = () => {};
let direction = 1;
document.addEventListener('astro:before-preparation', (event) => {
  const navigation = event as TransitionBeforePreparationEvent;
  const loader = navigation.loader;
  cancelPage?.();
  const shell = document.querySelector<HTMLElement>('.page-shell');
  if (shell) {
    shell.style.transform = '';
    shell.style.pointerEvents = '';
  }
  direction = navigation.direction === 'back' ? -1 : 1;
  const fromLocale = navigation.from.pathname.split('/')[1];
  const toLocale = navigation.to.pathname.split('/')[1];
  if (fromLocale !== toLocale) direction = toLocale === 'en' ? 1 : -1;
  const dialogsClosed = Promise.all(
    Array.from(document.querySelectorAll<HTMLDialogElement>('dialog[open]')).map(
      (dialog) =>
        new Promise<void>((resolve) => {
          const done = () => {
            dialog.removeEventListener('close', done);
            navigation.signal.removeEventListener('abort', done);
            resolve();
          };
          dialog.addEventListener('close', done, { once: true });
          navigation.signal.addEventListener('abort', done, { once: true });
          dialog.close();
        }),
    ),
  );
  navigation.loader = async () => {
    try {
      await Promise.all([loader(), dialogsClosed]);
      if (navigation.signal.aborted || !shell) return;
      cleanupReveals();
      shell.style.pointerEvents = 'none';
      await new Promise<void>((resolve) => {
        const abort = () => {
          cancelPage?.();
          shell.style.transform = '';
          shell.style.pointerEvents = '';
          resolve();
        };
        navigation.signal.addEventListener('abort', abort, { once: true });
        cancelPage = slideElement(
          shell,
          getComputedStyle(shell).transform,
          `translateX(${-direction * 100}vw)`,
          timing.page,
          () => {
            navigation.signal.removeEventListener('abort', abort);
            resolve();
          },
        );
      });
    } catch (error) {
      if (shell) {
        shell.style.transform = '';
        shell.style.pointerEvents = '';
      }
      throw error;
    }
  };
});
document.addEventListener('astro:before-swap', (event) => {
  const navigation = event as TransitionBeforeSwapEvent;
  // Skipping native snapshots rejects ready in WebKit; Motion owns the visual transition.
  navigation.viewTransition.ready.catch(() => {});
  navigation.viewTransition.skipTransition();
  $cartOpen.set(false);
  navigation.newDocument
    .querySelector<HTMLElement>('.page-shell')
    ?.style.setProperty('transform', reducedMotion() ? 'none' : `translateX(${direction * 100}vw)`);
});
document.addEventListener('astro:after-swap', () => {
  const shell = document.querySelector<HTMLElement>('.page-shell');
  if (!shell) return;
  shell.style.pointerEvents = 'none';
  cancelPage = slideElement(shell, shell.style.transform, 'none', timing.page, () => {
    shell.style.transform = '';
    shell.style.pointerEvents = '';
  });
});
document.addEventListener('astro:page-load', () => {
  cleanupReveals();
  const cleanup: (() => void)[] = [];
  if (!reducedMotion()) {
    document
      .querySelectorAll<HTMLElement>(
        'main > section, main > .container > section, .site-footer .footer-top, .product-related',
      )
      .forEach((element) => {
        // Above-the-fold content is already visible or introduced by the page slide.
        if (element.getBoundingClientRect().top < innerHeight) return;
        const viewport = document.createElement('div');
        viewport.style.overflow = 'clip';
        element.before(viewport);
        viewport.append(element);
        element.style.transform = 'translateX(100vw)';
        let cancelReveal: (() => void) | undefined;
        const stop = inView(
          viewport,
          () => {
            cancelReveal = slideElement(element, 'translateX(100vw)', 'none', timing.panel);
          },
          { margin: '0px 0px -24px 0px' },
        );
        const showForFocus = () => {
          cancelReveal?.();
          stop();
          element.style.transform = '';
        };
        viewport.addEventListener('focusin', showForFocus);
        cleanup.push(() => {
          cancelReveal?.();
          stop();
          viewport.removeEventListener('focusin', showForFocus);
          element.style.transform = '';
          viewport.replaceWith(element);
        });
      });
  }
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = () => {
    if (preference.matches) cleanup.forEach((fn) => fn());
  };
  preference.addEventListener('change', reduce);
  cleanupReveals = () => {
    cleanup.forEach((fn) => fn());
    preference.removeEventListener('change', reduce);
  };
});
