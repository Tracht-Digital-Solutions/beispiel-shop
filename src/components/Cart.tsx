import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '@nanostores/react';
import type { Locale } from '../lib/types';
import {
  $cart,
  $cartNotice,
  $cartOpen,
  cartTotals,
  hydrateCart,
  removeItem,
  setQuantity,
} from '../lib/cart';
import { freeShippingThreshold } from '../lib/config';
import { money, path, t } from '../lib/i18n';
import { slide, useCartRows, type CartRow } from './cart-motion';
import './commerce.css';

export function StorageNotice({ locale }: { locale: Locale }) {
  const notice = useStore($cartNotice, { ssr: 'initial' });
  return notice ? (
    <p className="commerce-notice" role="status">
      {notice === 'session-only'
        ? t(
            locale,
            'Dein Browser kann den Warenkorb gerade nicht dauerhaft speichern. Er bleibt bis zum Schließen dieses Tabs erhalten.',
            'Your browser cannot save your bag permanently right now. It stays available until you close this tab.',
          )
        : t(
            locale,
            'Dein Browser blockiert den Warenkorbspeicher. Deine Auswahl bleibt nur auf dieser Seite erhalten und geht beim Neuladen oder Seitenwechsel verloren.',
            'Your browser blocks bag storage. Your selection stays on this page only and is lost when you reload or change pages.',
          )}
    </p>
  ) : null;
}

function AnimatedCartRow({
  row,
  finish,
  children,
}: {
  row: CartRow;
  finish: (id: string, version: number) => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const interruptedTransform = useRef<string | null>(null);
  const { phase, version, variant } = row;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || phase === 'idle') {
      interruptedTransform.current = null;
      return;
    }
    const from = interruptedTransform.current ?? (phase === 'enter' ? 'translateX(-110%)' : 'none');
    interruptedTransform.current = null;
    let completed = false;
    const cancel = slide(
      element,
      from,
      phase === 'exit' ? 'translateX(110%)' : 'none',
      phase === 'exit' ? 280 : 360,
      () => {
        completed = true;
        finish(variant.id, version);
      },
    );
    return () => {
      if (!completed) interruptedTransform.current = getComputedStyle(element).transform;
      cancel?.();
    };
  }, [phase, version, variant.id, finish]);
  return (
    <li
      ref={ref}
      className="commerce-cart-item"
      data-state={phase}
      data-variant-id={variant.id}
      inert={phase === 'exit'}
      aria-hidden={phase === 'exit' || undefined}
    >
      {children}
    </li>
  );
}

function CartItems({ locale, close }: { locale: Locale; close?: () => void }) {
  const { rows, finish } = useCartRows();
  const listRef = useRef<HTMLUListElement>(null);
  const emptyRef = useRef<HTMLDivElement>(null);
  const uid = useId();
  useEffect(() => {
    if (!rows.length && document.activeElement === listRef.current) {
      emptyRef.current?.querySelector('a')?.focus();
    }
  }, [rows.length]);
  function remove(id: string) {
    const list = listRef.current;
    if (list?.contains(document.activeElement)) {
      const current = rows.findIndex((row) => row.variant.id === id);
      const next = rows
        .slice(current + 1)
        .concat(rows.slice(0, current))
        .find((row) => row.phase !== 'exit');
      const target =
        next &&
        list.querySelector<HTMLButtonElement>(
          `[data-variant-id="${next.variant.id}"] .commerce-text-button`,
        );
      (target || list).focus();
    }
    removeItem(id);
  }
  return (
    <div className="commerce-cart-content">
      <ul
        className="commerce-cart-items"
        ref={listRef}
        tabIndex={-1}
        aria-label={t(locale, 'Artikel im Warenkorb', 'Bag items')}
      >
        {rows.map((row) => {
          const { product, variant, quantity } = row;
          return (
            <AnimatedCartRow key={variant.id} row={row} finish={finish}>
              <a className="commerce-cart-image" href={path(locale, `product/${product.slug}`)}>
                <img src={product.image} alt={product.imageAlt[locale]} width="160" height="200" />
              </a>
              <div className="commerce-cart-item-info">
                <div className="commerce-cart-item-top">
                  <a href={path(locale, `product/${product.slug}`)}>{product.name}</a>
                  <span>{money(product.price * quantity, locale)}</span>
                </div>
                <p>
                  {variant.colorName[locale]} / {variant.size}
                </p>
                <div className="commerce-cart-item-bottom">
                  <div className="commerce-quantity">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      aria-label={t(
                        locale,
                        `Menge von ${product.name} verringern`,
                        `Decrease quantity of ${product.name}`,
                      )}
                      onClick={() => setQuantity(variant.id, quantity - 1)}
                    >
                      −
                    </button>
                    <label className="commerce-sr-only" htmlFor={`${uid}-${variant.id}`}>
                      {t(locale, `Menge für ${product.name}`, `Quantity for ${product.name}`)}
                    </label>
                    <input
                      id={`${uid}-${variant.id}`}
                      type="number"
                      min="1"
                      max={variant.stock}
                      value={quantity}
                      inputMode="numeric"
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value) && value >= 1)
                          setQuantity(variant.id, Math.min(variant.stock, Math.floor(value)));
                      }}
                    />
                    <button
                      type="button"
                      disabled={quantity >= variant.stock}
                      aria-label={t(
                        locale,
                        `Menge von ${product.name} erhöhen`,
                        `Increase quantity of ${product.name}`,
                      )}
                      onClick={() => setQuantity(variant.id, quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="commerce-text-button"
                    aria-label={t(locale, `${product.name} entfernen`, `Remove ${product.name}`)}
                    onClick={() => remove(variant.id)}
                  >
                    {t(locale, 'Entfernen', 'Remove')}
                  </button>
                </div>
                {quantity >= variant.stock && (
                  <small className="commerce-stock-limit">
                    {t(locale, 'Maximaler Demo-Bestand erreicht', 'Maximum demo stock reached')}
                  </small>
                )}
              </div>
            </AnimatedCartRow>
          );
        })}
      </ul>
      {!rows.length && (
        <div ref={emptyRef}>
          <EmptyCart locale={locale} close={close} />
        </div>
      )}
    </div>
  );
}

export function OrderTotals({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  const items = useStore($cart, { ssr: 'initial' });
  const totals = cartTotals(items);
  const remaining = Math.max(0, freeShippingThreshold - totals.subtotal);
  return (
    <div className={`commerce-order-totals ${compact ? 'is-compact' : ''}`}>
      {totals.count > 0 && (
        <div className="commerce-free-shipping">
          <p>
            {remaining > 0
              ? t(
                  locale,
                  `Noch ${money(remaining, locale)} bis zum kostenlosen Versand.`,
                  `${money(remaining, locale)} away from free shipping.`,
                )
              : t(locale, 'Dein Versand ist kostenlos.', 'Your shipping is on us.')}
            <span aria-hidden="true">↗</span>
          </p>
          <progress
            max={freeShippingThreshold}
            value={Math.min(totals.subtotal, freeShippingThreshold)}
            aria-label={t(
              locale,
              'Fortschritt zum kostenlosen Versand',
              'Progress towards free shipping',
            )}
          />
        </div>
      )}
      <dl>
        <div>
          <dt>{t(locale, 'Zwischensumme', 'Subtotal')}</dt>
          <dd>{money(totals.subtotal, locale)}</dd>
        </div>
        <div>
          <dt>{t(locale, 'Versand nach Deutschland', 'Shipping to Germany')}</dt>
          <dd>
            {totals.shipping === 0
              ? t(locale, 'Kostenlos', 'Free')
              : money(totals.shipping, locale)}
          </dd>
        </div>
        <div className="commerce-total">
          <dt>{t(locale, 'Gesamt', 'Total')}</dt>
          <dd>{money(totals.total, locale)}</dd>
        </div>
      </dl>
      <p className="commerce-tax-note">
        {t(
          locale,
          'Demo-Preise inkl. MwSt. · Keine echte Zahlung',
          'Demo prices incl. VAT · No real payment',
        )}
      </p>
    </div>
  );
}

function EmptyCart({ locale, close }: { locale: Locale; close?: () => void }) {
  return (
    <div className="commerce-empty">
      <span className="commerce-empty-icon" aria-hidden="true">
        [ 0 ]
      </span>
      <h2>{t(locale, 'Platz für deinen nächsten Fit.', 'Room for your next fit.')}</h2>
      <p>
        {t(
          locale,
          'Dein Warenkorb ist noch leer. Entdecke Essentials für jeden Tag.',
          'Your bag is still empty. Explore everyday essentials.',
        )}
      </p>
      <a className="commerce-button" href={path(locale, 'shop')} onClick={close}>
        {t(locale, 'Kollektion entdecken', 'Explore the collection')}
        <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}

export function CartPage({ locale }: { locale: Locale }) {
  const items = useStore($cart, { ssr: 'initial' });
  const totals = cartTotals(items);
  useEffect(() => {
    hydrateCart();
  }, []);
  return (
    <section className="commerce commerce-cart-page">
      <p className="commerce-eyebrow">{t(locale, 'Deine Auswahl', 'Your edit')}</p>
      <div className="commerce-page-title">
        <h1>
          {t(locale, 'Warenkorb', 'Your bag')}
          <sup>({totals.count})</sup>
        </h1>
        <a className="commerce-text-link" href={path(locale, 'shop')}>
          {t(locale, 'Weiter einkaufen', 'Continue shopping')} ↗
        </a>
      </div>
      <StorageNotice locale={locale} />
      <div className="commerce-cart-grid">
        <CartItems locale={locale} />
        {totals.count > 0 && (
          <aside className="commerce-cart-summary">
            <h2>{t(locale, 'Deine Übersicht', 'Order summary')}</h2>
            <OrderTotals locale={locale} />
            <a className="commerce-button" href={path(locale, 'checkout')}>
              {t(locale, 'Zum Demo-Checkout', 'Go to demo checkout')}
              <span aria-hidden="true">↗</span>
            </a>
            <p className="commerce-checkout-note">
              {t(
                locale,
                'Ein kompletter Kaufablauf zum Ausprobieren. Ohne Konto, ohne Zahlung.',
                'A complete shopping experience to try. No account, no payment.',
              )}
            </p>
          </aside>
        )}
      </div>
    </section>
  );
}

export function CartDrawer({ locale }: { locale: Locale }) {
  const open = useStore($cartOpen, { ssr: 'initial' });
  const items = useStore($cart, { ssr: 'initial' });
  const totals = cartTotals(items);
  const ref = useRef<HTMLDialogElement>(null);
  const interruptedTransform = useRef<string | null>(null);
  const [visible, setVisible] = useState(false);
  const uid = useId();
  useEffect(() => {
    hydrateCart();
  }, []);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      setVisible(true);
      if (!dialog.open) {
        interruptedTransform.current = null;
        dialog.showModal();
      } else if (interruptedTransform.current) {
        const from = interruptedTransform.current;
        interruptedTransform.current = null;
        return slide(dialog, from, 'none', 280, () => {});
      }
      return;
    }
    if (dialog.open) {
      const cancel = slide(
        dialog,
        getComputedStyle(dialog).transform,
        'translateX(100%)',
        380,
        () => {
          if (!$cartOpen.get()) {
            dialog.close();
            setVisible(false);
          }
        },
      );
      return () => {
        if (dialog.open) interruptedTransform.current = getComputedStyle(dialog).transform;
        cancel?.();
      };
    }
  }, [open]);
  useEffect(() => {
    if (!visible) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [visible]);
  const close = () => $cartOpen.set(false);
  return (
    <dialog
      ref={ref}
      className="commerce commerce-dialog commerce-cart-drawer"
      data-state={open ? 'open' : visible ? 'closing' : 'closed'}
      aria-labelledby={`${uid}-title`}
      onClose={() => {
        setVisible(false);
        close();
      }}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="commerce-drawer-shell">
        <div className="commerce-drawer-header">
          <h2 id={`${uid}-title`}>
            {t(locale, 'Dein Warenkorb', 'Your bag')} <span>({totals.count})</span>
          </h2>
          <button
            type="button"
            className="commerce-close"
            onClick={close}
            aria-label={t(locale, 'Warenkorb schließen', 'Close bag')}
            autoFocus
          >
            ×
          </button>
        </div>
        <div className="commerce-drawer-body">
          {visible && (
            <>
              <StorageNotice locale={locale} />
              <CartItems locale={locale} close={close} />
            </>
          )}
        </div>
        {visible && totals.count > 0 && (
          <div className="commerce-drawer-footer">
            <OrderTotals locale={locale} compact />
            <a className="commerce-button" href={path(locale, 'checkout')} onClick={close}>
              {t(locale, 'Zum Demo-Checkout', 'Go to demo checkout')}
              <span aria-hidden="true">↗</span>
            </a>
            <a className="commerce-drawer-cart-link" href={path(locale, 'cart')} onClick={close}>
              {t(locale, 'Warenkorb ansehen', 'View bag')}
            </a>
          </div>
        )}
      </div>
    </dialog>
  );
}
