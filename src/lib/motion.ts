import { animate } from 'motion/mini';

export const ease = [0.22, 0.7, 0.25, 1] as const;
export const timing = { small: 0.28, content: 0.36, panel: 0.42, page: 0.24 };
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** One owner per element; interruption keeps the visible frame. */
export function slideElement(
  element: HTMLElement,
  from: string,
  to: string,
  seconds = timing.content,
  complete = () => {},
) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (media.matches || seconds === 0) {
    element.style.transform = to;
    complete();
    return () => {};
  }
  const controls = animate(element, { transform: [from, to] }, { duration: seconds, ease });
  let cancelled = false;
  const reduce = () => {
    if (media.matches) controls.complete();
  };
  media.addEventListener('change', reduce);
  controls.then(() => {
    media.removeEventListener('change', reduce);
    if (!cancelled) {
      controls.cancel();
      element.style.transform = to;
      complete();
    }
  });
  return () => {
    cancelled = true;
    media.removeEventListener('change', reduce);
    try {
      if (element.isConnected && element.getClientRects().length) controls.stop();
      else controls.cancel();
    } catch {
      controls.cancel();
    }
  };
}
