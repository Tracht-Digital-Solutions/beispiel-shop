import { inView } from 'motion';
import type {
  TransitionBeforePreparationEvent,
  TransitionBeforeSwapEvent,
} from 'astro:transitions/client';
import { ease, reducedMotion, slideElement, timing } from './motion';
import { $cartOpen } from './cart';

// Safari does not focus pointer-activated buttons by default. Keep dialog return
// targets and keyboard continuation consistent with the other browser engines.
document.addEventListener(
  'click',
  (event) => {
    if (event.button !== 0) return;
    const button = (event.target as Element)?.closest<HTMLButtonElement>('button');
    if (
      button &&
      !button.disabled &&
      !button.closest('[inert], .filter-chip-slot, .slide-select-trigger')
    )
      button.focus({ preventScroll: true });
  },
  true,
);

let activeTransition: TransitionBeforeSwapEvent['viewTransition'] | undefined;
let cleanupReveals = () => {};

document.addEventListener('astro:before-preparation', (event) => {
  const navigation = event as TransitionBeforePreparationEvent;
  const loader = navigation.loader;
  activeTransition?.skipTransition();
  // Keep the current page visible while the destination is prepared.
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
    await Promise.all([loader(), dialogsClosed]);
  };
});

document.addEventListener('astro:before-swap', (event) => {
  const navigation = event as TransitionBeforeSwapEvent;
  const transition = navigation.viewTransition;
  activeTransition = transition;
  // Skipping or superseding a transition can reject ready in WebKit.
  transition.ready.catch(() => {});
  cleanupReveals();
  $cartOpen.set(false);
  let direction = navigation.direction === 'back' ? -1 : 1;
  const fromLocale = navigation.from.pathname.split('/')[1];
  const toLocale = navigation.to.pathname.split('/')[1];
  if (fromLocale !== toLocale) direction = toLocale === 'en' ? 1 : -1;
  const root = navigation.newDocument.documentElement;
  root.style.setProperty('--page-slide-direction', String(direction));
  root.style.setProperty('--page-slide-duration', timing.page + 's');
  root.style.setProperty('--page-slide-ease', 'cubic-bezier(' + ease.join(',') + ')');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const reduce = () => {
    if (preference.matches) transition.skipTransition();
  };
  preference.addEventListener('change', reduce);
  reduce();
  const done = () => {
    preference.removeEventListener('change', reduce);
    if (activeTransition === transition) activeTransition = undefined;
  };
  transition.finished.then(done, done);
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
