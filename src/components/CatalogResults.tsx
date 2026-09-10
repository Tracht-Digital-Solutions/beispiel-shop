import { useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { RefObject } from 'react';
import { categoryNames, t } from '../lib/i18n';
import type { Locale, Product } from '../lib/types';
import ProductCard from './ProductCard';
import '../styles/catalog-results.css';

const motionQuery = '(prefers-reduced-motion: reduce)';
const reducedSnapshot = () => window.matchMedia(motionQuery).matches;
const serverSnapshot = () => true;
function subscribeMotion(notify: () => void) {
  const media = window.matchMedia(motionQuery);
  media.addEventListener('change', notify);
  return () => media.removeEventListener('change', notify);
}
type Movement = { whole: boolean; direction: number };

export default function CatalogResults({
  products,
  category,
  locale,
  ready,
  onReset,
  searchRef,
}: {
  products: Product[];
  category: string;
  locale: Locale;
  ready: boolean;
  onReset: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  const request = useMemo(() => ({ products, category }), [products, category]);
  // Retain outgoing cards only for their visual departure. Controls and URL use live filters.
  const [view, setView] = useState(request);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const contentRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const incoming = useRef<Movement | null>(null);
  const interrupted = useRef(new WeakMap<HTMLElement, string>());
  const reduced = useSyncExternalStore(subscribeMotion, reducedSnapshot, serverSnapshot);

  useLayoutEffect(() => {
    if (!ready || !contentRef.current) return;
    const content = contentRef.current;
    const focusOutside = () => {
      if (content.contains(document.activeElement))
        searchRef.current?.focus({ preventScroll: true });
    };
    if (!initialized.current || reduced || !content.animate) {
      initialized.current = true;
      if (view !== request) focusOutside();
      incoming.current = null;
      interrupted.current = new WeakMap();
      setView(request);
      setPhase('idle');
      return;
    }

    function animate(
      frames: { node: HTMLElement; from: string; to: string }[],
      duration: number,
      complete: () => void,
    ) {
      let cancelled = false;
      let finished = false;
      const animations = frames.map(({ node, from, to }) =>
        node.animate([{ transform: interrupted.current.get(node) ?? from }, { transform: to }], {
          duration,
          easing: 'cubic-bezier(0.22, 0.7, 0.25, 1)',
          fill: 'both',
        }),
      );
      frames.forEach(({ node }) => interrupted.current.delete(node));
      Promise.all(animations.map((animation) => animation.finished))
        .then(() => {
          if (cancelled) return;
          finished = true;
          complete();
        })
        .catch(() => {
          // A newer query owns the result set; a cancelled departure must never commit it.
        });
      return () => {
        cancelled = true;
        if (!finished) {
          frames.forEach(({ node }) =>
            interrupted.current.set(node, getComputedStyle(node).transform),
          );
        }
        animations.forEach((animation) => animation.cancel());
      };
    }

    if (view === request) {
      const movement = incoming.current;
      if (!movement) return;
      incoming.current = null;
      const nodes = movement.whole
        ? [content]
        : Array.from(content.querySelectorAll<HTMLElement>('.product-card'));
      return animate(
        nodes.map((node) => ({
          node,
          from: `translateX(${movement.direction * 110}%)`,
          to: 'none',
        })),
        340,
        () => {
          setPhase('idle');
          // Release finished fill effects, so idle cards carry no compositing layers.
          nodes.forEach((node) => node.getAnimations().forEach((animation) => animation.cancel()));
        },
      );
    }

    const previousIds = view.products.map((product) => product.id).join('|');
    const nextIds = products.map((product) => product.id).join('|');
    const categoryChanged = view.category !== category;
    if (previousIds === nextIds && !categoryChanged) {
      incoming.current = null;
      interrupted.current = new WeakMap();
      setView(request);
      setPhase('idle');
      return;
    }

    focusOutside();
    const order = ['', ...Object.keys(categoryNames)];
    const direction =
      categoryChanged && order.indexOf(category) < order.indexOf(view.category) ? -1 : 1;
    const nextIdsSet = new Set(products.map((product) => product.id));
    const reordered =
      view.products.length === products.length &&
      view.products.every((product) => nextIdsSet.has(product.id));
    const whole =
      categoryChanged ||
      reordered ||
      !view.products.length ||
      !products.length ||
      interrupted.current.has(content);
    incoming.current = { whole, direction };
    setPhase('exit');
    const frames = whole
      ? [{ node: content, from: 'none', to: `translateX(${-direction * 110}%)` }]
      : Array.from(content.querySelectorAll<HTMLElement>('.catalog-result-card')).map((slot) => ({
          node: slot.querySelector<HTMLElement>('.product-card')!,
          from: 'none',
          // Matches move towards their incoming edge; excluded cards leave the opposite way.
          // Every old card clears its slot before the new grid takes its place.
          to: `translateX(${nextIdsSet.has(slot.dataset.productId!) ? 110 : -110}%)`,
        }));
    return animate(frames, 220, () => {
      setView(request);
      setPhase('enter');
    });
  }, [request, view, products, category, ready, reduced, searchRef]);

  return (
    <div className="catalog-results" data-phase={phase}>
      <div
        key={`${view.category}:${view.products.map((product) => product.id).join('|')}`}
        ref={contentRef}
        className="catalog-results-content"
        inert={phase === 'exit'}
        aria-hidden={phase === 'exit' ? true : undefined}
      >
        {view.products.length ? (
          <div className="product-grid">
            {view.products.map((product, index) => (
              <div className="catalog-result-card" data-product-id={product.id} key={product.id}>
                <ProductCard product={product} locale={locale} priority={index < 4} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="eyebrow">NO MATCH / 00</span>
            <h2>{t(locale, 'Noch nicht dein Match.', 'No match. Yet.')}</h2>
            <p>
              {t(
                locale,
                'Probiere einen anderen Suchbegriff oder entferne einen Filter.',
                'Try a different search or remove a filter.',
              )}
            </p>
            <button className="btn" onClick={onReset}>
              {t(locale, 'Alle Produkte zeigen', 'View all products')} ↗
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
