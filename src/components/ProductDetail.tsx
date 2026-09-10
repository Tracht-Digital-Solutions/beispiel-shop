import { useEffect, useId, useRef, useState } from 'react';
import type { Locale, Product } from '../lib/types';
import { useStore } from '@nanostores/react';
import { money, t } from '../lib/i18n';
import { $cart, $cartOpen, addItem, hydrateCart } from '../lib/cart';
import { freeShippingThreshold, shippingCost } from '../lib/config';
import './commerce.css';
import ProductGallery from './ProductGallery';
import SwipeAccordion from './SwipeAccordion';

export function ProductDetail({ locale, product }: { locale: Locale; product: Product }) {
  const colors = [...new Map(product.variants.map((variant) => [variant.color, variant])).values()];
  const [color, setColor] = useState(colors[0]?.color ?? '');
  const [size, setSize] = useState('');
  const [feedback, setFeedback] = useState('');
  const [ready, setReady] = useState(false);
  const [activeDialog, setActiveDialog] = useState<'guide' | null>(null);
  const cart = useStore($cart, { ssr: 'initial' });
  const guideRef = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const variants = product.variants.filter((variant) => variant.color === color);
  const selectedVariant = variants.find((variant) => variant.size === size);
  const selectedColor = colors.find((variant) => variant.color === color);
  const alreadyInCart = cart.find((item) => item.variantId === selectedVariant?.id)?.quantity ?? 0;
  const stockReached = !!selectedVariant && alreadyInCart >= selectedVariant.stock;

  useEffect(() => {
    hydrateCart();
    setReady(true);
  }, []);
  useEffect(() => {
    if (!activeDialog) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [activeDialog]);

  function addToCart(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVariant || selectedVariant.stock < 1 || stockReached) return;
    addItem(selectedVariant.id, 1);
    setFeedback(t(locale, 'Zum Warenkorb hinzugefügt.', 'Added to your bag.'));
    $cartOpen.set(true);
  }

  function closeOnBackdrop(event: React.MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;
    const dialog = event.currentTarget;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      dialog.close();
    }
  }

  return (
    <div className="commerce product-detail">
      <div className="product-detail-grid">
        <ProductGallery product={product} locale={locale} ready={ready} />
        <section className="product-purchase" aria-labelledby={`${uid}-title`}>
          <p className="commerce-eyebrow">
            BLOCK/01 — {t(locale, 'Kollektion 2026', 'Collection 2026')}
          </p>
          <h1 id={`${uid}-title`}>{product.name}</h1>
          <div className="product-price-row">
            <span className="product-price">{money(product.price, locale)}</span>
            <span>{t(locale, 'Demo-Preis inkl. MwSt.', 'Demo price incl. VAT')}</span>
          </div>
          <p className="product-description">{product.description[locale]}</p>
          <form onSubmit={addToCart}>
            <fieldset className="product-choice">
              <legend>
                {t(locale, 'Farbe', 'Colour')} <span>— {selectedColor?.colorName[locale]}</span>
              </legend>
              <div className="product-colors">
                {colors.map((variant) => (
                  <button
                    type="button"
                    key={variant.color}
                    disabled={!ready}
                    className={`product-color ${color === variant.color ? 'is-selected' : ''}`}
                    aria-pressed={color === variant.color}
                    aria-label={variant.colorName[locale]}
                    onClick={() => {
                      setColor(variant.color);
                      setSize('');
                      setFeedback('');
                    }}
                  >
                    <span style={{ backgroundColor: variant.colorHex }} />
                    <span>{variant.colorName[locale]}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="product-choice">
              <legend>
                {t(locale, 'Größe', 'Size')}{' '}
                <span>— {size || t(locale, 'bitte wählen', 'please select')}</span>
              </legend>
              <button
                type="button"
                className="commerce-text-button product-guide-button"
                disabled={!ready}
                onClick={() => {
                  guideRef.current?.showModal();
                  setActiveDialog('guide');
                }}
              >
                {t(locale, 'Größentabelle', 'Size guide')} ↗
              </button>
              <div className="product-sizes">
                {variants.map((variant) => (
                  <button
                    type="button"
                    key={variant.id}
                    disabled={!ready || variant.stock === 0}
                    aria-pressed={size === variant.size}
                    aria-label={`${variant.size}${variant.stock === 0 ? t(locale, ' — ausverkauft', ' — sold out') : ''}`}
                    className={size === variant.size ? 'is-selected' : ''}
                    onClick={() => {
                      setSize(variant.size);
                      setFeedback('');
                    }}
                  >
                    {variant.size}
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="product-stock">
              {selectedVariant
                ? selectedVariant.stock < 4
                  ? t(
                      locale,
                      `Noch ${selectedVariant.stock} im Demo-Bestand`,
                      `${selectedVariant.stock} left in demo stock`,
                    )
                  : t(locale, 'Im Demo-Bestand verfügbar', 'Available in demo stock')
                : t(
                    locale,
                    'Wähle deine Größe, um den Artikel hinzuzufügen.',
                    'Choose your size to add this item.',
                  )}
            </p>
            <button
              className="commerce-button product-add"
              type="submit"
              disabled={!ready || !selectedVariant || selectedVariant.stock < 1}
              aria-disabled={stockReached || undefined}
            >
              {stockReached
                ? t(locale, 'Maximaler Bestand im Warenkorb', 'Maximum stock already in bag')
                : selectedVariant
                  ? t(locale, 'In den Warenkorb', 'Add to bag')
                  : t(locale, 'Größe auswählen', 'Select a size')}
              <span aria-hidden="true">↗</span>
            </button>
            <p className="commerce-live" role="status">
              {feedback}
            </p>
          </form>
          <div className="product-delivery">
            <span aria-hidden="true">↗</span>
            <p>
              {t(
                locale,
                `Versand ${money(shippingCost, locale)} · kostenlos ab ${money(freeShippingThreshold, locale)}`,
                `Shipping ${money(shippingCost, locale)} · free from ${money(freeShippingThreshold, locale)}`,
              )}
              <small>
                {t(
                  locale,
                  'Simulierte Lieferung in Deutschland · 2–4 Werktage',
                  'Simulated delivery in Germany · 2–4 working days',
                )}
              </small>
            </p>
          </div>
          <div className="product-accordions">
            <SwipeAccordion title={t(locale, 'Schnitt & Material', 'Fit & fabric')} defaultOpen>
              <p>{product.fit[locale]}</p>
              <p>{product.material[locale]}</p>
            </SwipeAccordion>
            <SwipeAccordion title={t(locale, 'Pflegehinweise', 'Care instructions')}>
              <p>{product.care[locale]}</p>
            </SwipeAccordion>
            <SwipeAccordion title={t(locale, 'Über diesen Demo-Shop', 'About this demo shop')}>
              <p>
                {t(
                  locale,
                  'BLOCK/01 ist eine fiktive Marke. Alle Produkte, Preise und Bestände dienen als Arbeitsprobe. Es werden keine echten Bestellungen, Zahlungen oder Lieferungen ausgelöst.',
                  'BLOCK/01 is a fictional brand. All products, prices and stock are part of a portfolio demonstration. No real orders, payments or deliveries are made.',
                )}
              </p>
            </SwipeAccordion>
          </div>
        </section>
      </div>
      <dialog
        ref={guideRef}
        className="commerce-dialog product-guide-dialog"
        aria-labelledby={`${uid}-guide`}
        onClose={() => setActiveDialog(null)}
        onClick={closeOnBackdrop}
      >
        <button
          className="commerce-dialog-close"
          type="button"
          onClick={() => guideRef.current?.close()}
          aria-label={t(locale, 'Größentabelle schließen', 'Close size guide')}
          autoFocus
        >
          ×
        </button>
        <p className="commerce-eyebrow">{t(locale, 'Finde deinen Fit', 'Find your fit')}</p>
        <h2 id={`${uid}-guide`}>{t(locale, 'Größentabelle', 'Size guide')}</h2>
        <p>{product.fit[locale]}</p>
        {product.category === 'accessories' ? (
          product.slug === 'crew-socks' ? (
            <p>
              {t(
                locale,
                'Wähle deine EU-Schuhgröße: 36–40 oder 41–46. Die elastische Rippstruktur passt sich an deinen Fuß an.',
                'Choose your EU shoe size: 36–40 or 41–46. The stretchy rib knit adapts to your foot.',
              )}
            </p>
          ) : (
            <p>
              {t(
                locale,
                'One Size: eine universelle Größe. Caps sind am Hinterkopf verstellbar; Beanies sind elastisch. Taschen und andere Accessoires benötigen keine Körpermaße.',
                'One size: a universal size. Caps have an adjustable back; beanies stretch to fit. Bags and other accessories do not require body measurements.',
              )}
            </p>
          )
        ) : (
          <>
            <p>
              {t(
                locale,
                'Körpermaße in cm. Miss ohne zusätzliche Kleidung; bei zwei passenden Größen wähle für einen lockeren Sitz die größere.',
                'Body measurements in cm. Measure without extra layers; if between sizes, choose the larger size for a relaxed fit.',
              )}
            </p>
            <div className="commerce-table-wrap">
              <table>
                <caption>
                  {t(
                    locale,
                    'Beispielmaße für die BLOCK/01 Demo-Kollektion',
                    'Example measurements for the BLOCK/01 demo collection',
                  )}
                </caption>
                <thead>
                  <tr>
                    <th>{t(locale, 'Größe', 'Size')}</th>
                    <th>
                      {product.category === 'pants'
                        ? t(locale, 'Taille', 'Waist')
                        : t(locale, 'Brust', 'Chest')}
                    </th>
                    <th>
                      {product.category === 'pants'
                        ? t(locale, 'Hüfte', 'Hip')
                        : t(locale, 'Taille', 'Waist')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['XS', '82–88', '66–72', '84–90'],
                    ['S', '88–94', '72–78', '90–96'],
                    ['M', '94–100', '78–84', '96–102'],
                    ['L', '100–106', '84–90', '102–108'],
                    ['XL', '106–112', '90–96', '108–114'],
                  ].map(([label, chest, waist, hip]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{product.category === 'pants' ? waist : chest}</td>
                      <td>{product.category === 'pants' ? hip : waist}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}

export default ProductDetail;
