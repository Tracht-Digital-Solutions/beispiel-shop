import type { Locale } from './types';
export const locales: Locale[] = ['de', 'en'];
export const t = (locale: Locale, de: string, en: string) => (locale === 'de' ? de : en);
export const money = (cents: number, locale: Locale) =>
  new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
export const path = (locale: Locale, route = '') =>
  `/${locale}/${route ? route.replace(/^\/+|\/+$/g, '') + '/' : ''}`;
export const categoryNames = {
  tees: { de: 'T-Shirts', en: 'T-shirts' },
  hoodies: { de: 'Hoodies & Sweats', en: 'Hoodies & sweats' },
  pants: { de: 'Hosen', en: 'Pants' },
  accessories: { de: 'Accessoires', en: 'Accessories' },
};
