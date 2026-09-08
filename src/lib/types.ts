export type Locale = 'de' | 'en';
export type Localized = Record<Locale, string>;
export type Category = 'tees' | 'hoodies' | 'pants' | 'accessories';
export interface Variant {
  id: string;
  color: string;
  colorHex: string;
  colorName: Localized;
  size: string;
  stock: number;
}
export interface Product {
  id: string;
  slug: string;
  name: string;
  category: Category;
  price: number;
  description: Localized;
  material: Localized;
  care: Localized;
  fit: Localized;
  image: string;
  imageAlt: Localized;
  lifestyle: string;
  variants: Variant[];
  badge?: 'new' | 'essential';
  look: number;
}
export interface CartItem {
  variantId: string;
  quantity: number;
}
