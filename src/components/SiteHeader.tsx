import { useEffect, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { $cart, $cartOpen, hydrateCart, cartTotals } from '../lib/cart';
import { path, t } from '../lib/i18n';
import type { Locale } from '../lib/types';
export default function SiteHeader({ locale, route = '' }: { locale: Locale; route?: string }) {
  const items = useStore($cart, { ssr: 'initial' });
  const count = cartTotals(items).count;
  const mobile = useRef<HTMLDialogElement>(null);
  useEffect(hydrateCart, []);
  const other = locale === 'de' ? 'en' : 'de';
  const changeLanguage = (event: React.SyntheticEvent<HTMLAnchorElement>) => {
    // Keep native navigation, including modified clicks and opening another tab.
    event.currentTarget.href = path(other, route) + location.search + location.hash;
  };
  const openSearch = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (route !== 'shop') return;
    event.currentTarget.href = path(locale, 'shop') + location.search + '#catalog-search';
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const input = document.getElementById('catalog-search');
    if (!(input instanceof HTMLInputElement)) return;
    event.preventDefault();
    input.focus({ preventScroll: true });
    input.scrollIntoView({ block: 'center', behavior: 'instant' });
  };
  const nav = (
    <>
      <a className={route === 'shop' ? 'current' : ''} href={path(locale, 'shop')}>
        Shop
      </a>
      <a className={route === 'lookbook' ? 'current' : ''} href={path(locale, 'lookbook')}>
        Lookbook <span className="nav-dot" />
      </a>
      <a className={route === 'about' ? 'current' : ''} href={path(locale, 'about')}>
        {t(locale, 'Die Marke', 'Our story')}
      </a>
    </>
  );
  return (
    <>
      <div className="announcement">
        <span>INDEPENDENT SPIRIT. EVERYDAY UNIFORM.</span>
        <span className="announcement-demo">
          {t(locale, 'Demo-Shop · Keine echten Bestellungen', 'Demo store · No real orders')}
        </span>
      </div>
      <header className="site-header">
        <a className="wordmark" href={path(locale)} aria-label="BLOCK/01 Home">
          BLOCK<span>/</span>01
        </a>
        <nav className="desktop-nav" aria-label={t(locale, 'Hauptnavigation', 'Main navigation')}>
          {nav}
        </nav>
        <div className="header-actions">
          <a
            className="language-link"
            href={path(other, route)}
            onClick={changeLanguage}
            onPointerDown={changeLanguage}
            onFocus={changeLanguage}
            hrefLang={other}
            aria-label={`${locale.toUpperCase()} / ${other.toUpperCase()}: ${t(locale, 'Switch to English', 'Auf Deutsch wechseln')}`}
          >
            {locale.toUpperCase()} <span>/ {other.toUpperCase()}</span>
          </a>
          <a
            className="search-link icon-button"
            href={path(locale, 'shop') + '#catalog-search'}
            onClick={openSearch}
            aria-label={t(locale, 'Suchen', 'Search')}
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>
          </a>
          <button
            className="cart-button"
            onClick={() => {
              hydrateCart();
              $cartOpen.set(true);
            }}
            aria-label={`${t(locale, 'Warenkorb öffnen', 'Open bag')}, ${String(count).padStart(2, '0')}`}
          >
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M5 7h14l1 14H4L5 7Z" />
              <path d="M8 8V6a4 4 0 0 1 8 0v2" />
            </svg>
            <span className="cart-number">{String(count).padStart(2, '0')}</span>
          </button>
          <button
            className="mobile-menu-button icon-button"
            onClick={() => mobile.current?.showModal()}
            aria-label={t(locale, 'Menü öffnen', 'Open menu')}
          >
            <svg
              width="23"
              height="20"
              viewBox="0 0 23 20"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M1 5h21M1 14h21" />
            </svg>
          </button>
        </div>
      </header>
      <dialog className="menu-dialog" ref={mobile} aria-label={t(locale, 'Hauptmenü', 'Main menu')}>
        <div className="dialog-top">
          <span className="wordmark">BLOCK/01</span>
          <button
            className="icon-button"
            onClick={() => mobile.current?.close()}
            aria-label={t(locale, 'Menü schließen', 'Close menu')}
          >
            ×
          </button>
        </div>
        <nav aria-label={t(locale, 'Mobile Navigation', 'Mobile navigation')}>{nav}</nav>
        <a className="btn" href={path(locale, 'shop')}>
          {t(locale, 'Kollektion entdecken', 'Explore the collection')} ↗
        </a>
        <p className="eyebrow">A DIFFERENT KIND OF EVERYDAY.</p>
      </dialog>
    </>
  );
}
