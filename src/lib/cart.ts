import { atom } from 'nanostores';
import { getVariant } from './catalog';
import { shippingCost, freeShippingThreshold } from './config';
import type { CartItem } from './types';
export const $cart = atom<CartItem[]>([]);
export const $cartOpen = atom(false);
export const $cartNotice = atom('');
const key = 'block01-cart-v1';
let hydrated = false;
let usingSessionStorage = false;
export function sanitizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const result = new Map<string, number>();
  for (const item of value) {
    if (
      !item ||
      typeof item.variantId !== 'string' ||
      typeof item.quantity !== 'number' ||
      !Number.isFinite(item.quantity)
    )
      continue;
    const found = getVariant(item.variantId);
    if (!found || found.variant.stock < 1) continue;
    const qty = Math.min(found.variant.stock, Math.max(0, Math.floor(item.quantity)));
    if (qty)
      result.set(
        item.variantId,
        Math.min(found.variant.stock, (result.get(item.variantId) || 0) + qty),
      );
  }
  return [...result].map(([variantId, quantity]) => ({ variantId, quantity }));
}
export function hydrateCart() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  let sessionReadable = false;
  try {
    const fallback = sessionStorage.getItem(key);
    sessionReadable = true;
    // A session copy is written only after a failed local write. It is newer
    // than local storage, including when local reads still work (e.g. quota).
    if (fallback !== null) {
      $cart.set(sanitizeCart(JSON.parse(fallback)));
      usingSessionStorage = true;
      $cartNotice.set('session-only');
    }
  } catch {
    // A blocked or malformed session copy must not prevent local recovery.
  }
  if (!usingSessionStorage) {
    try {
      $cart.set(sanitizeCart(JSON.parse(localStorage.getItem(key) || '[]')));
    } catch {
      $cartNotice.set(sessionReadable ? 'session-only' : 'storage-unavailable');
    }
  }
  window.addEventListener('storage', (e) => {
    if (e.key === key && !usingSessionStorage) {
      try {
        $cart.set(sanitizeCart(JSON.parse(e.newValue || '[]')));
      } catch {
        $cart.set([]);
      }
    }
  });
}
function save(items: CartItem[]) {
  $cart.set(sanitizeCart(items));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify($cart.get()));
      usingSessionStorage = false;
      $cartNotice.set('');
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Local persistence succeeded even if session storage is blocked.
      }
    } catch {
      try {
        sessionStorage.setItem(key, JSON.stringify($cart.get()));
        usingSessionStorage = true;
        $cartNotice.set('session-only');
      } catch {
        $cartNotice.set('storage-unavailable');
      }
    }
  }
}
export function addItem(variantId: string, qty = 1) {
  hydrateCart();
  const items = $cart.get();
  const existing = items.find((i) => i.variantId === variantId);
  save(
    existing
      ? items.map((i) => (i.variantId === variantId ? { ...i, quantity: i.quantity + qty } : i))
      : [...items, { variantId, quantity: qty }],
  );
}
export function setQuantity(variantId: string, quantity: number) {
  hydrateCart();
  save($cart.get().map((i) => (i.variantId === variantId ? { ...i, quantity } : i)));
}
export function removeItem(variantId: string) {
  hydrateCart();
  save($cart.get().filter((i) => i.variantId !== variantId));
}
export function clearCart() {
  save([]);
}
export function cartEntries(items = $cart.get()) {
  return sanitizeCart(items).flatMap((i) => {
    const found = getVariant(i.variantId);
    return found ? [{ ...found, quantity: i.quantity }] : [];
  });
}
export function cartTotals(items = $cart.get()) {
  const entries = cartEntries(items);
  const subtotal = entries.reduce((n, i) => n + i.product.price * i.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= freeShippingThreshold ? 0 : shippingCost;
  return {
    subtotal,
    shipping,
    total: subtotal + shipping,
    count: entries.reduce((n, i) => n + i.quantity, 0),
  };
}
