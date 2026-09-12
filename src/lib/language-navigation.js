// This classic head script must register pagereveal before the first render.
// Keep cross-document navigation so Astro islands and cart hydration retain their lifecycle.
(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function direction(from, to) {
    if (!from || !to) return null;
    const previous = new URL(from, location.href);
    const next = new URL(to, location.href);
    const a = previous.pathname.match(/^\/(de|en)(\/.*)$/);
    const b = next.pathname.match(/^\/(de|en)(\/.*)$/);
    if (previous.origin !== next.origin || !a || !b || a[1] === b[1] || a[2] !== b[2]) return null;
    return b[1] === 'en' ? 'forward' : 'backward';
  }
  function prepare(transition, from, to) {
    delete root.dataset.languageSwipe;
    if (!transition) return;
    const movement = direction(from, to);
    if (!movement || reduced.matches) {
      transition.skipTransition();
      return;
    }
    root.dataset.languageSwipe = movement;
    const stop = () => {
      if (reduced.matches) transition.skipTransition();
    };
    reduced.addEventListener('change', stop);
    transition.finished.then(() => {
      delete root.dataset.languageSwipe;
      reduced.removeEventListener('change', stop);
    });
  }
  window.addEventListener('pageswap', (event) => {
    prepare(event.viewTransition, event.activation?.from?.url, event.activation?.entry?.url);
  });
  window.addEventListener('pagereveal', (event) => {
    const activation = window.navigation?.activation;
    prepare(event.viewTransition, activation?.from?.url ?? document.referrer, location.href);
  });
})();
