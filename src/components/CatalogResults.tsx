import { useRef } from 'react';
import type { RefObject } from 'react';
import { AnimatePresence } from 'motion/react';
import { categoryNames, t } from '../lib/i18n';
import type { Locale, Product } from '../lib/types';
import ProductCard from './ProductCard';
import { MotionRoot, SlideItem } from './Motion';
import '../styles/catalog-results.css';
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
  const previous = useRef(category);
  const order = ['', ...Object.keys(categoryNames)];
  const movement = useRef(1);
  if (category !== previous.current) {
    movement.current = order.indexOf(category) < order.indexOf(previous.current) ? -1 : 1;
    previous.current = category;
  }
  const direction = movement.current;
  return (
    <MotionRoot>
      <div
        className="catalog-results"
        data-phase="idle"
        onBlur={() => {
          if (document.activeElement?.closest('[inert]'))
            searchRef.current?.focus({ preventScroll: true });
        }}
      >
        <div className="catalog-results-content">
          <div className="product-grid">
            <AnimatePresence initial={false} custom={direction}>
              {products.length ? (
                products.map((product, index) => (
                  <SlideItem
                    key={category + ':' + product.id}
                    className="catalog-result-card"
                    data-product-id={product.id}
                    direction={ready ? direction : 0}
                  >
                    <ProductCard product={product} locale={locale} priority={index < 4} />
                  </SlideItem>
                ))
              ) : (
                <SlideItem key="empty" className="catalog-empty">
                  {' '}
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
                    <button
                      className="btn"
                      onClick={() => {
                        searchRef.current?.focus({ preventScroll: true });
                        onReset();
                      }}
                    >
                      {t(locale, 'Alle Produkte zeigen', 'View all products')} ↗
                    </button>
                  </div>
                </SlideItem>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MotionRoot>
  );
}
