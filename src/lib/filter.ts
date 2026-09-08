import type { Product, Locale } from './types';
export interface Filters {
  q: string;
  category: string;
  size: string;
  color: string;
  price: string;
  sort: string;
}
export const defaultFilters: Filters = {
  q: '',
  category: '',
  size: '',
  color: '',
  price: '',
  sort: 'featured',
};
export function filtersFromSearch(search: string): Filters {
  const params = new URLSearchParams(search);
  return Object.fromEntries(
    Object.entries(defaultFilters).map(([key, value]) => [key, params.get(key) || value]),
  ) as unknown as Filters;
}
export function filterProducts(products: Product[], filters: Filters, locale: Locale) {
  const q = filters.q.toLocaleLowerCase(locale).trim();
  let result = products.filter(
    (p) =>
      (!q ||
        `${p.name} ${p.description[locale]} ${p.material[locale]}`
          .toLocaleLowerCase(locale)
          .includes(q)) &&
      (!filters.category || p.category === filters.category) &&
      (!filters.price || p.price <= Number(filters.price)) &&
      p.variants.some(
        (v) =>
          (!filters.size || v.size === filters.size) &&
          (!filters.color || v.color === filters.color) &&
          (!filters.size || v.stock > 0),
      ),
  );
  if (filters.sort === 'price-asc') result = result.sort((a, b) => a.price - b.price);
  if (filters.sort === 'price-desc') result = result.sort((a, b) => b.price - a.price);
  if (filters.sort === 'name') result = result.sort((a, b) => a.name.localeCompare(b.name));
  if (filters.sort === 'new')
    result = result.sort((a, b) => Number(b.badge === 'new') - Number(a.badge === 'new'));
  return result;
}
