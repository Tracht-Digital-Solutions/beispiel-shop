import { useEffect, useMemo, useRef, useState } from 'react';
import { products } from '../lib/catalog';
import { categoryNames, t, money } from '../lib/i18n';
import { defaultFilters, filtersFromSearch, filterProducts, type Filters } from '../lib/filter';
import type { Locale, Category } from '../lib/types';
import CatalogResults from './CatalogResults';
export default function Catalog({ locale }: { locale: Locale }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [ready, setReady] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setFilters(filtersFromSearch(location.search));
    setReady(true);
    const pop = () => setFilters(filtersFromSearch(location.search));
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  function update(key: keyof Filters, value: string) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v && v !== defaultFilters[k as keyof Filters]) params.set(k, v);
    });
    history.replaceState(null, '', `${location.pathname}${params.size ? '?' + params : ''}`);
  }
  function reset() {
    setFilters(defaultFilters);
    history.replaceState(null, '', location.pathname);
  }
  const results = useMemo(() => filterProducts(products, filters, locale), [filters, locale]);
  const colors = Array.from(
    new Map(products.flatMap((p) => p.variants.map((v) => [v.color, v] as const))).values(),
  );
  const filterFields = (prefix: string) => (
    <>
      <label htmlFor={`${prefix}-size`}>
        {t(locale, 'Größe', 'Size')}
        <select
          id={`${prefix}-size`}
          value={filters.size}
          onChange={(e) => update('size', e.target.value)}
        >
          <option value="">{t(locale, 'Alle Größen', 'All sizes')}</option>
          {['XS', 'S', 'M', 'L', 'XL', 'One size', '36–40', '41–46'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label htmlFor={`${prefix}-color`}>
        {t(locale, 'Farbe', 'Colour')}
        <select
          id={`${prefix}-color`}
          value={filters.color}
          onChange={(e) => update('color', e.target.value)}
        >
          <option value="">{t(locale, 'Alle Farben', 'All colours')}</option>
          {colors.map((c) => (
            <option key={c.color} value={c.color}>
              {c.colorName[locale]}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={`${prefix}-price`}>
        {t(locale, 'Preis', 'Price')}
        <select
          id={`${prefix}-price`}
          value={filters.price}
          onChange={(e) => update('price', e.target.value)}
        >
          <option value="">{t(locale, 'Alle Preise', 'All prices')}</option>
          {[5000, 10000, 15000].map((p) => (
            <option key={p} value={p}>
              {t(locale, 'Bis', 'Up to')} {money(p, locale)}
            </option>
          ))}
        </select>
      </label>
    </>
  );
  return (
    <section
      className="catalog"
      aria-label={t(locale, 'Produktkatalog', 'Product catalogue')}
      data-ready={ready}
    >
      <div className="category-tabs">
        <button
          className={!filters.category ? 'active' : ''}
          aria-pressed={!filters.category}
          onClick={() => update('category', '')}
        >
          {t(locale, 'Alles', 'All')} <span>16</span>
        </button>
        {Object.entries(categoryNames).map(([key, name]) => (
          <button
            key={key}
            className={filters.category === key ? 'active' : ''}
            aria-pressed={filters.category === key}
            onClick={() => update('category', key)}
          >
            {name[locale]} <span>04</span>
          </button>
        ))}
      </div>
      <div className="catalog-toolbar">
        <label className="search-field">
          <span className="sr-only">{t(locale, 'Produkte suchen', 'Search products')}</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="m16 16 5 5" />
          </svg>
          <input
            ref={search}
            type="search"
            placeholder={t(locale, 'Finde dein nächstes Essential', 'Find your next essential')}
            value={filters.q}
            onChange={(e) => update('q', e.target.value)}
          />
        </label>
        <div className="desktop-filters">{filterFields('desktop')}</div>
        <button
          className="mobile-filter-button btn-outline"
          onClick={() => dialog.current?.showModal()}
        >
          {t(locale, 'Filter', 'Filters')} +
        </button>
        <label className="sort-field">
          <span className="sr-only">{t(locale, 'Sortierung', 'Sort by')}</span>
          <select
            aria-label={t(locale, 'Sortierung', 'Sort by')}
            value={filters.sort}
            onChange={(e) => update('sort', e.target.value)}
          >
            <option value="featured">{t(locale, 'Unsere Auswahl', 'Featured')}</option>
            <option value="new">{t(locale, 'Neuheiten', 'New arrivals')}</option>
            <option value="price-asc">
              {t(locale, 'Preis aufsteigend', 'Price: low to high')}
            </option>
            <option value="price-desc">
              {t(locale, 'Preis absteigend', 'Price: high to low')}
            </option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>
      <div className="catalog-status">
        <p role="status">
          {results.length} {t(locale, 'Produkte', 'products')}
        </p>
        <div className="filter-chips">
          {(Object.entries(filters) as [keyof Filters, string][])
            .filter(([k, v]) => v && k !== 'sort')
            .map(([key, value]) => (
              <button key={key} onClick={() => update(key, '')}>
                {key === 'category'
                  ? categoryNames[value as Category]?.[locale] || value
                  : key === 'color'
                    ? colors.find((c) => c.color === value)?.colorName[locale] || value
                    : key === 'price'
                      ? `${t(locale, 'Bis', 'Up to')} ${money(Number(value), locale)}`
                      : value}
                <span aria-hidden="true">×</span>
                <span className="sr-only">{t(locale, 'Filter entfernen', 'Remove filter')}</span>
              </button>
            ))}
          {Object.keys(filters).some((k) => k !== 'sort' && filters[k as keyof Filters]) && (
            <button className="clear-filters" onClick={reset}>
              {t(locale, 'Zurücksetzen', 'Reset all')}
            </button>
          )}
        </div>
      </div>
      <CatalogResults
        products={results}
        category={filters.category}
        locale={locale}
        ready={ready}
        onReset={reset}
        searchRef={search}
      />
      <dialog
        className="filter-dialog"
        ref={dialog}
        aria-label={t(locale, 'Produktfilter', 'Product filters')}
      >
        <div className="dialog-top">
          <h2>{t(locale, 'Deine Filter', 'Your filters')}</h2>
          <button
            className="icon-button"
            onClick={() => dialog.current?.close()}
            aria-label={t(locale, 'Filter schließen', 'Close filters')}
          >
            ×
          </button>
        </div>
        {filterFields('mobile')}
        <button className="btn" onClick={() => dialog.current?.close()}>
          {results.length} {t(locale, 'Produkte anzeigen', 'products — show results')} ↗
        </button>
        <button className="text-button" onClick={reset}>
          {t(locale, 'Zurücksetzen', 'Reset all')}
        </button>
      </dialog>
    </section>
  );
}
