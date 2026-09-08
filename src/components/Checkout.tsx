import { useEffect, useId, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import type { Locale } from '../lib/types';
import { $cart, cartEntries, cartTotals, clearCart, hydrateCart } from '../lib/cart';
import { money, path, t } from '../lib/i18n';
import { OrderTotals, StorageNotice } from './Cart';
import './commerce.css';

type Address = {
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  postalCode: string;
  city: string;
};
type Receipt = { id: string; count: number; total: number };
const emptyAddress: Address = {
  firstName: '',
  lastName: '',
  email: '',
  street: '',
  postalCode: '',
  city: '',
};

export function Checkout({ locale }: { locale: Locale }) {
  const items = useStore($cart, { ssr: 'initial' });
  const totals = cartTotals(items);
  const entries = cartEntries(items);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [address, setAddress] = useState<Address>(emptyAddress);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const ordered = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const uid = useId();
  useEffect(() => {
    hydrateCart();
  }, []);
  useEffect(() => {
    if (previousStep.current !== step) {
      headingRef.current?.focus();
      headingRef.current?.scrollIntoView({ block: 'start' });
      previousStep.current = step;
    }
  }, [step]);

  function field(
    name: keyof Address,
    label: string,
    options: {
      autoComplete: string;
      type?: string;
      pattern?: string;
      maxLength?: number;
      inputMode?: 'numeric';
      placeholder?: string;
    },
  ) {
    return (
      <div
        className={`commerce-field ${name === 'email' || name === 'street' ? 'commerce-field-wide' : ''}`}
      >
        <label htmlFor={`${uid}-${name}`}>{label}</label>
        <input
          id={`${uid}-${name}`}
          name={name}
          value={address[name]}
          onChange={(event) =>
            setAddress((previous) => ({ ...previous, [name]: event.target.value }))
          }
          required
          {...options}
        />
      </div>
    );
  }

  function confirmOrder(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ordered.current || totals.count === 0) return;
    ordered.current = true;
    setReceipt({
      id: `DEMO-${Date.now().toString(36).toUpperCase()}`,
      count: totals.count,
      total: totals.total,
    });
    setStep(3);
    clearCart();
    setAddress(emptyAddress);
  }

  return (
    <section className="commerce commerce-checkout-page">
      <p className="commerce-eyebrow">{t(locale, 'Dein nächster Move', 'Your next move')}</p>
      <div className="commerce-page-title">
        <h1>{t(locale, 'Demo-Checkout', 'Demo checkout')}</h1>
        <a className="commerce-text-link" href={path(locale, 'cart')}>
          {t(locale, 'Zum Warenkorb', 'Back to bag')} ↗
        </a>
      </div>
      <div className="commerce-demo-banner">
        <span aria-hidden="true">↗</span>
        <p>
          {t(
            locale,
            'Nur zum Ausprobieren. Keine echte Bestellung, keine Zahlung, keine Datenübermittlung. Nutze gerne die Beispieldaten.',
            'Just for trying things out. No real order, no payment, no data submission. Feel free to use the sample details.',
          )}
        </p>
      </div>
      <ol
        className="commerce-checkout-steps"
        aria-label={t(locale, 'Checkout-Fortschritt', 'Checkout progress')}
      >
        {[
          t(locale, 'Adresse', 'Address'),
          t(locale, 'Versand & Prüfung', 'Shipping & review'),
          t(locale, 'Bestätigung', 'Confirmation'),
        ].map((label, index) => (
          <li
            key={label}
            className={step === index + 1 ? 'is-active' : step > index + 1 ? 'is-complete' : ''}
            aria-current={step === index + 1 ? 'step' : undefined}
          >
            <span aria-hidden="true">{step > index + 1 ? '✓' : `0${index + 1}`}</span>
            {label}
          </li>
        ))}
      </ol>
      {step === 3 && receipt ? (
        <div className="commerce-confirmation">
          <span className="commerce-confirmation-mark" aria-hidden="true">
            ✓
          </span>
          <p className="commerce-eyebrow">{receipt.id}</p>
          <h2 ref={headingRef} tabIndex={-1}>
            {t(locale, 'Guter Fit. Gute Wahl.', 'Good fit. Good choice.')}
          </h2>
          <p>
            {t(
              locale,
              'Deine Demo-Bestellung ist abgeschlossen. So könnte sich der Kauf in deinem eigenen Online-Shop anfühlen.',
              'Your demo order is complete. This is how shopping in your own online store could feel.',
            )}
          </p>
          <dl>
            <div>
              <dt>{t(locale, 'Artikel', 'Items')}</dt>
              <dd>{receipt.count}</dd>
            </div>
            <div>
              <dt>{t(locale, 'Simulierter Gesamtbetrag', 'Simulated total')}</dt>
              <dd>{money(receipt.total, locale)}</dd>
            </div>
          </dl>
          <p className="commerce-confirmation-note">
            {t(
              locale,
              'Es wurde nichts bestellt oder abgebucht. Du erhältst keine E-Mail und keine Lieferung. Deine eingegebenen Adressdaten wurden verworfen.',
              'Nothing was ordered or charged. No email or delivery will follow. Your entered address details have been discarded.',
            )}
          </p>
          <a className="commerce-button" href={path(locale, 'shop')}>
            {t(locale, 'Weiter entdecken', 'Keep exploring')}
            <span aria-hidden="true">↗</span>
          </a>
          <a className="commerce-text-link" href={path(locale, 'about')}>
            {t(locale, 'Mehr über die Arbeitsprobe', 'About this portfolio project')} ↗
          </a>
        </div>
      ) : totals.count === 0 ? (
        <div className="commerce-empty">
          <span className="commerce-empty-icon" aria-hidden="true">
            [ 0 ]
          </span>
          <h2>{t(locale, 'Hier fehlt noch dein Fit.', 'Your fit is missing.')}</h2>
          <p>
            {t(
              locale,
              'Lege zuerst einen Artikel in den Warenkorb.',
              'Add an item to your bag to get started.',
            )}
          </p>
          <a className="commerce-button" href={path(locale, 'shop')}>
            {t(locale, 'Kollektion entdecken', 'Explore the collection')} ↗
          </a>
        </div>
      ) : (
        <div className="commerce-checkout-grid">
          <div className="commerce-checkout-main">
            <StorageNotice locale={locale} />
            {step === 1 ? (
              <form
                className="commerce-address-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setStep(2);
                }}
              >
                <div className="commerce-form-heading">
                  <h2 ref={headingRef} tabIndex={-1}>
                    {t(locale, 'Wohin geht dein Fit?', 'Where is your fit headed?')}
                  </h2>
                  <button
                    className="commerce-text-button"
                    type="button"
                    onClick={() =>
                      setAddress({
                        firstName: 'Alex',
                        lastName: 'Beispiel',
                        email: 'alex@example.com',
                        street: 'Musterstraße 12',
                        postalCode: '10115',
                        city: 'Berlin',
                      })
                    }
                  >
                    {t(locale, 'Beispieldaten einsetzen', 'Use sample details')} ↗
                  </button>
                </div>
                <p className="commerce-form-description">
                  {t(
                    locale,
                    'Alle Felder sind Pflichtfelder. Deine Angaben bleiben nur bis zum Abschluss oder Verlassen dieser Seite im Arbeitsspeicher.',
                    'All fields are required. Your details stay in memory only until completion or until you leave this page.',
                  )}
                </p>
                <div className="commerce-fields">
                  {field('firstName', t(locale, 'Vorname', 'First name'), {
                    autoComplete: 'given-name',
                    pattern: '.*\\S.*',
                    maxLength: 80,
                  })}
                  {field('lastName', t(locale, 'Nachname', 'Last name'), {
                    autoComplete: 'family-name',
                    pattern: '.*\\S.*',
                    maxLength: 80,
                  })}
                  {field('email', t(locale, 'E-Mail-Adresse', 'Email address'), {
                    autoComplete: 'email',
                    type: 'email',
                    maxLength: 254,
                  })}
                  {field('street', t(locale, 'Straße und Hausnummer', 'Street and house number'), {
                    autoComplete: 'address-line1',
                    pattern: '.*\\S.*',
                    maxLength: 160,
                  })}
                  {field('postalCode', t(locale, 'Postleitzahl', 'Postal code'), {
                    autoComplete: 'postal-code',
                    pattern: '[0-9]{5}',
                    inputMode: 'numeric',
                    maxLength: 5,
                    placeholder: '10115',
                  })}
                  {field('city', t(locale, 'Stadt', 'City'), {
                    autoComplete: 'address-level2',
                    pattern: '.*\\S.*',
                    maxLength: 100,
                  })}
                  <div className="commerce-field commerce-field-wide">
                    <label htmlFor={`${uid}-country`}>{t(locale, 'Land', 'Country')}</label>
                    <select
                      id={`${uid}-country`}
                      name="country"
                      defaultValue="DE"
                      autoComplete="country"
                    >
                      <option value="DE">{t(locale, 'Deutschland', 'Germany')}</option>
                    </select>
                    <small>
                      {t(
                        locale,
                        'Die Demo unterstützt Versand innerhalb Deutschlands.',
                        'This demo supports shipping within Germany.',
                      )}
                    </small>
                  </div>
                </div>
                <button type="submit" className="commerce-button">
                  {t(locale, 'Weiter zu Versand & Prüfung', 'Continue to shipping & review')}
                  <span aria-hidden="true">↗</span>
                </button>
              </form>
            ) : (
              <form className="commerce-review-form" onSubmit={confirmOrder}>
                <h2 ref={headingRef} tabIndex={-1}>
                  {t(locale, 'Alles bereit für deinen Move?', 'Ready for your next move?')}
                </h2>
                <section className="commerce-review-address">
                  <div>
                    <h3>{t(locale, 'Deine Lieferadresse', 'Your delivery address')}</h3>
                    <button
                      className="commerce-text-button"
                      type="button"
                      onClick={() => setStep(1)}
                    >
                      {t(locale, 'Bearbeiten', 'Edit')}
                    </button>
                  </div>
                  <address>
                    {address.firstName} {address.lastName}
                    <br />
                    {address.street}
                    <br />
                    {address.postalCode} {address.city}
                    <br />
                    {t(locale, 'Deutschland', 'Germany')}
                  </address>
                  <p>{address.email}</p>
                </section>
                <fieldset className="commerce-shipping-choice">
                  <legend>{t(locale, 'Versandart', 'Shipping method')}</legend>
                  <label htmlFor={`${uid}-shipping`}>
                    <input
                      id={`${uid}-shipping`}
                      name="shipping"
                      type="radio"
                      value="standard"
                      defaultChecked
                    />
                    <span>
                      <strong>{t(locale, 'Standardversand', 'Standard shipping')}</strong>
                      <small>
                        {t(locale, '2–4 Werktage · simuliert', '2–4 working days · simulated')}
                      </small>
                    </span>
                    <strong>
                      {totals.shipping === 0
                        ? t(locale, 'Kostenlos', 'Free')
                        : money(totals.shipping, locale)}
                    </strong>
                  </label>
                </fieldset>
                <section className="commerce-demo-payment">
                  <h3>{t(locale, 'Zahlung: reine Simulation', 'Payment: simulation only')}</h3>
                  <p>
                    {t(
                      locale,
                      'Es werden keine Zahlungsdaten benötigt. Mit dem nächsten Klick siehst du eine Beispiel-Bestätigung; es entsteht kein Kaufvertrag.',
                      'No payment details are needed. The next click shows an example confirmation; no purchase contract is created.',
                    )}
                  </p>
                </section>
                <button type="submit" className="commerce-button">
                  {t(locale, 'Demo-Bestellung abschließen', 'Complete demo order')}
                  <span aria-hidden="true">↗</span>
                </button>
                <button
                  className="commerce-back-button commerce-text-button"
                  type="button"
                  onClick={() => setStep(1)}
                >
                  ← {t(locale, 'Zurück zur Adresse', 'Back to address')}
                </button>
              </form>
            )}
          </div>
          <aside className="commerce-checkout-summary">
            <h2>
              {t(locale, 'Deine Auswahl', 'Your edit')} <span>({totals.count})</span>
            </h2>
            <ul className="commerce-checkout-items">
              {entries.map(({ product, variant, quantity }) => (
                <li key={variant.id}>
                  <img
                    src={product.image}
                    alt={product.imageAlt[locale]}
                    width="100"
                    height="125"
                  />
                  <div>
                    <strong>{product.name}</strong>
                    <p>
                      {variant.colorName[locale]} / {variant.size}
                    </p>
                    <p>
                      {t(locale, 'Menge', 'Qty')} {quantity}
                    </p>
                  </div>
                  <span>{money(product.price * quantity, locale)}</span>
                </li>
              ))}
            </ul>
            <OrderTotals locale={locale} />
            <a className="commerce-text-link" href={path(locale, 'cart')}>
              {t(locale, 'Auswahl bearbeiten', 'Edit your bag')} ↗
            </a>
          </aside>
        </div>
      )}
    </section>
  );
}

export default Checkout;
