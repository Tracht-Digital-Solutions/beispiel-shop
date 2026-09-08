import { money, path, t } from '../lib/i18n';
import type { Product, Locale } from '../lib/types';
export default function ProductCard({
  product: p,
  locale,
  priority = false,
}: {
  product: Product;
  locale: Locale;
  priority?: boolean;
}) {
  return (
    <article className="product-card">
      <a
        className="product-image-link"
        href={path(locale, `product/${p.slug}`)}
        aria-label={`${p.badge ? (p.badge === 'new' ? t(locale, 'NEU', 'NEW') : 'ESSENTIAL') + ': ' : ''}${p.name}`}
      >
        <img
          src={p.image}
          srcSet={`${p.image.replace('.webp', '-480.webp')} 480w, ${p.image.replace('.webp', '-800.webp')} 800w, ${p.image} 1122w`}
          sizes="(max-width: 640px) 48vw, (max-width: 1000px) 31vw, 24vw"
          width="900"
          height="1125"
          alt={p.imageAlt[locale]}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
        {p.badge && (
          <span className={`product-badge ${p.badge === 'new' ? 'new' : ''}`}>
            {p.badge === 'new' ? t(locale, 'NEU', 'NEW') : 'ESSENTIAL'}
          </span>
        )}
        <span className="card-arrow" aria-hidden="true">
          ↗
        </span>
      </a>
      <div className="product-card-info">
        <div>
          <a href={path(locale, `product/${p.slug}`)}>{p.name}</a>
          <p>{p.variants[0].colorName[locale]}</p>
        </div>
        <span>{money(p.price, locale)}</span>
      </div>
      <div className="product-card-bottom">
        <span className="swatch-dot" style={{ backgroundColor: p.variants[0].colorHex }} />
        <span>{p.category === 'accessories' ? p.variants[0].size : 'XS — XL'}</span>
      </div>
    </article>
  );
}
