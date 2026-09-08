import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { products, getProduct, getVariant } from '../src/lib/catalog';
import { cartEntries, cartTotals, sanitizeCart } from '../src/lib/cart';
import { defaultFilters, filterProducts, filtersFromSearch } from '../src/lib/filter';
import type { CartItem, Locale, Product, Variant } from '../src/lib/types';

function product(slug: string): Product {
  const result = getProduct(slug);
  if (!result) throw new Error(`Missing test product: ${slug}`);
  return result;
}

function availableVariant(slug: string): Variant {
  const result = product(slug).variants.find((variant) => variant.stock > 0);
  if (!result) throw new Error(`No available test variant: ${slug}`);
  return result;
}

function item(slug: string, quantity = 1): CartItem {
  return { variantId: availableVariant(slug).id, quantity };
}

const slugs = (items: Product[]) => items.map((entry) => entry.slug);

describe('demo catalog', () => {
  it('contains 16 independently addressable products in four balanced categories', () => {
    expect(products).toHaveLength(16);
    expect(new Set(products.map((entry) => entry.id)).size).toBe(16);
    expect(new Set(products.map((entry) => entry.slug)).size).toBe(16);
    const counts = products.reduce<Record<string, number>>((result, entry) => {
      result[entry.category] = (result[entry.category] || 0) + 1;
      return result;
    }, {});
    expect(counts).toEqual({ tees: 4, hoodies: 4, pants: 4, accessories: 4 });
    for (const entry of products) {
      expect(entry.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(getProduct(entry.slug)).toBe(entry);
      expect(Number.isInteger(entry.price)).toBe(true);
      expect(entry.price).toBeGreaterThan(0);
    }
  });

  it('supplies German and English product information and variant labels', () => {
    for (const entry of products) {
      for (const locale of ['de', 'en'] as Locale[]) {
        for (const field of ['description', 'material', 'care', 'fit', 'imageAlt'] as const) {
          expect(entry[field][locale].trim(), `${entry.slug}.${field}.${locale}`).not.toBe('');
        }
        for (const variant of entry.variants) {
          expect(variant.colorName[locale].trim(), `${variant.id}.colorName.${locale}`).not.toBe(
            '',
          );
        }
      }
      expect(entry.description.de).not.toBe(entry.description.en);
    }
  });

  it('uses unique variant IDs that resolve back to the correct product', () => {
    const variants = products.flatMap((entry) => entry.variants);
    expect(new Set(variants.map((variant) => variant.id)).size).toBe(variants.length);
    for (const entry of products) {
      expect(entry.variants.length).toBeGreaterThan(0);
      for (const variant of entry.variants) {
        expect(getVariant(variant.id)).toEqual({ product: entry, variant });
        expect(Number.isInteger(variant.stock)).toBe(true);
        expect(variant.stock).toBeGreaterThanOrEqual(0);
      }
    }
    expect(getProduct('not-a-product')).toBeUndefined();
    expect(getVariant('not-a-variant')).toBeUndefined();
  });

  it('references shipped local product and lifestyle images', () => {
    const paths = [
      ...new Set([
        '/images/hero.webp',
        '/images/hero-960.webp',
        ...products.flatMap((entry) => [
          entry.image,
          entry.image.replace('.webp', '-480.webp'),
          entry.image.replace('.webp', '-800.webp'),
          entry.lifestyle,
          entry.lifestyle.replace('.webp', '-600.webp'),
        ]),
      ]),
    ];
    for (const path of paths) expect(path).toMatch(/^\/images\/[a-z0-9-]+\.webp$/);
    const missing = paths.filter(
      (path) => !existsSync(new URL(`../public${path}`, import.meta.url)),
    );
    expect(missing, 'Every catalog image must exist in public/').toEqual([]);
  });
});

describe('catalog filtering', () => {
  it('returns the full catalog without filters and restores filters from a shareable URL', () => {
    expect(slugs(filterProducts(products, defaultFilters, 'de'))).toEqual(slugs(products));
    expect(filtersFromSearch('')).toEqual({
      q: '',
      category: '',
      size: '',
      color: '',
      price: '',
      sort: 'featured',
    });
    expect(
      filtersFromSearch(
        '?q=cotton+tee&category=accessories&size=One+size&color=black&price=4900&sort=price-asc&ignored=value',
      ),
    ).toEqual({
      q: 'cotton tee',
      category: 'accessories',
      size: 'One size',
      color: 'black',
      price: '4900',
      sort: 'price-asc',
    });
  });

  it('matches size and color on the same available variant', () => {
    const base = availableVariant('heavy-tee');
    const fixture: Product = {
      ...product('heavy-tee'),
      id: 'variant-filter-fixture',
      slug: 'variant-filter-fixture',
      variants: [
        { ...base, id: 'red-m-unavailable', color: 'red', size: 'M', stock: 0 },
        { ...base, id: 'red-s-available', color: 'red', size: 'S', stock: 5 },
        { ...base, id: 'black-m-available', color: 'black', size: 'M', stock: 5 },
      ],
    };
    const selection = { ...defaultFilters, color: 'red', size: 'M' };
    expect(filterProducts([fixture], selection, 'en')).toEqual([]);
    expect(filterProducts([fixture], { ...selection, size: 'S' }, 'en')).toEqual([fixture]);
    const stocked = {
      ...fixture,
      variants: [
        ...fixture.variants,
        { ...base, id: 'red-m-available', color: 'red', size: 'M', stock: 2 },
      ],
    };
    expect(filterProducts([stocked], selection, 'en')).toEqual([stocked]);
  });

  it('combines category, inclusive price ceiling and available size', () => {
    const result = filterProducts(
      products,
      {
        ...defaultFilters,
        category: 'tees',
        price: '4900',
        size: 'M',
        sort: 'price-asc',
      },
      'de',
    );
    expect(slugs(result)).toEqual(['faded-tee', 'studio-tee', 'heavy-tee']);
    expect(slugs(filterProducts(products, { ...defaultFilters, size: 'XS' }, 'de'))).not.toContain(
      'heavy-tee',
    );
  });

  it.each([
    ['de', '  DOPPELLAGIGER KAPUZE  ', 'concrete-hoodie'],
    ['en', '  DOUBLE-LAYER HOOD  ', 'concrete-hoodie'],
    ['de', '13 oz', 'wide-denim'],
    ['en', '13 oz', 'wide-denim'],
  ] as const)('searches localized descriptions and materials (%s: %s)', (locale, q, expected) => {
    expect(slugs(filterProducts(products, { ...defaultFilters, q }, locale))).toEqual([expected]);
  });

  it('returns an empty result for an unmatched search', () => {
    expect(filterProducts(products, { ...defaultFilters, q: 'unicorn airship' }, 'en')).toEqual([]);
  });

  it.each([
    ['featured', ['heavy-tee', 'faded-tee', 'concrete-hoodie']],
    ['price-asc', ['faded-tee', 'heavy-tee', 'concrete-hoodie']],
    ['price-desc', ['concrete-hoodie', 'heavy-tee', 'faded-tee']],
    ['name', ['concrete-hoodie', 'faded-tee', 'heavy-tee']],
    ['new', ['heavy-tee', 'concrete-hoodie', 'faded-tee']],
  ])('sorts by %s without changing the source catalog', (sort, expected) => {
    const subset = [product('heavy-tee'), product('faded-tee'), product('concrete-hoodie')];
    expect(slugs(filterProducts(subset, { ...defaultFilters, sort }, 'en'))).toEqual(expected);
    expect(slugs(subset)).toEqual(['heavy-tee', 'faded-tee', 'concrete-hoodie']);
  });
});

describe('stored cart validation', () => {
  it.each([null, undefined, true, 42, 'invalid json', {}, { items: [] }])(
    'ignores a non-array value: %j',
    (value) => {
      expect(sanitizeCart(value)).toEqual([]);
    },
  );

  it('ignores malformed entries and non-finite or non-numeric quantities', () => {
    const { id } = availableVariant('heavy-tee');
    expect(
      sanitizeCart([
        null,
        undefined,
        'item',
        42,
        true,
        [],
        {},
        { variantId: id },
        { quantity: 1 },
        { variantId: 123, quantity: 1 },
        { variantId: id, quantity: '2' },
        { variantId: id, quantity: NaN },
        { variantId: id, quantity: Infinity },
        { variantId: id, quantity: -Infinity },
      ]),
    ).toEqual([]);
  });

  it('removes unknown and sold-out variants while preserving a valid entry', () => {
    const soldOut = product('heavy-tee').variants.find((variant) => variant.stock === 0);
    expect(soldOut).toBeDefined();
    const valid = item('heavy-tee', 2);
    expect(
      sanitizeCart([
        { variantId: 'removed-product', quantity: 1 },
        { variantId: soldOut!.id, quantity: 1 },
        valid,
      ]),
    ).toEqual([valid]);
  });

  it('merges duplicate entries and caps their combined quantity at stock', () => {
    const variant = availableVariant('heavy-tee');
    expect(
      sanitizeCart([
        { variantId: variant.id, quantity: 2 },
        { variantId: variant.id, quantity: 3 },
      ]),
    ).toEqual([{ variantId: variant.id, quantity: 5 }]);
    expect(
      sanitizeCart([
        { variantId: variant.id, quantity: variant.stock - 1 },
        { variantId: variant.id, quantity: 3 },
      ]),
    ).toEqual([{ variantId: variant.id, quantity: variant.stock }]);
  });

  it('rounds down fractions, removes nonpositive quantities and enforces single-entry stock limits', () => {
    const variant = availableVariant('heavy-tee');
    expect(sanitizeCart([{ variantId: variant.id, quantity: 2.9 }])).toEqual([
      { variantId: variant.id, quantity: 2 },
    ]);
    for (const quantity of [-8, -0.5, 0, 0.9]) {
      expect(sanitizeCart([{ variantId: variant.id, quantity }])).toEqual([]);
    }
    expect(sanitizeCart([{ variantId: variant.id, quantity: 9999 }])).toEqual([
      { variantId: variant.id, quantity: variant.stock },
    ]);
  });

  it('does not mutate the stored payload and resolves only validated cart entries', () => {
    const variant = availableVariant('heavy-tee');
    const input = [{ variantId: variant.id, quantity: 2.9 }];
    const snapshot = structuredClone(input);
    expect(cartEntries(input)).toMatchObject([
      { product: { slug: 'heavy-tee' }, variant: { id: variant.id }, quantity: 2 },
    ]);
    expect(input).toEqual(snapshot);
  });
});

describe('cart totals in integer cents', () => {
  it('charges nothing for an empty cart', () => {
    expect(cartTotals([])).toEqual({ subtotal: 0, shipping: 0, total: 0, count: 0 });
  });

  it('adds 490 cents shipping below the 10000-cent threshold', () => {
    expect(cartTotals([item('heavy-tee')])).toEqual({
      subtotal: 4900,
      shipping: 490,
      total: 5390,
      count: 1,
    });
    expect(cartTotals([item('concrete-hoodie')])).toEqual({
      subtotal: 9900,
      shipping: 490,
      total: 10390,
      count: 1,
    });
  });

  it('offers free shipping exactly at 10000 cents', () => {
    // 19 EUR socks + 29 EUR beanie + 52 EUR tee = exactly 100 EUR.
    const result = cartTotals([item('crew-socks'), item('rib-beanie'), item('line-tee')]);
    expect(result).toEqual({ subtotal: 10000, shipping: 0, total: 10000, count: 3 });
    expect(Object.values(result).every(Number.isInteger)).toBe(true);
  });

  it('offers free shipping above the threshold and counts quantities', () => {
    expect(cartTotals([item('crossbody-bag', 2)])).toEqual({
      subtotal: 11800,
      shipping: 0,
      total: 11800,
      count: 2,
    });
  });

  it('calculates totals from stock-clamped quantities rather than untrusted stored quantities', () => {
    const variant = availableVariant('crew-socks');
    const result = cartTotals([
      { variantId: variant.id, quantity: 9999 },
      { variantId: 'unknown', quantity: 9999 },
    ]);
    expect(result.count).toBe(variant.stock);
    expect(result.subtotal).toBe(1900 * variant.stock);
    expect(result.shipping).toBe(0);
    expect(result.total).toBe(result.subtotal);
  });
});
