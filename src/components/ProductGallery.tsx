import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { Locale, Product } from '../lib/types';
import { t } from '../lib/i18n';
import './product-gallery.css';

const zoomScale = 2.5;
const clamp = (value: number, minimum = 0, maximum = 100) =>
  Math.min(maximum, Math.max(minimum, value));

export default function ProductGallery({
  product,
  locale,
  ready,
}: {
  product: Product;
  locale: Locale;
  ready: boolean;
}) {
  const images = useMemo(
    () =>
      [product.image, product.lifestyle].filter(
        (image, index, all) => all.indexOf(image) === index,
      ),
    [product.image, product.lifestyle],
  );
  const [imageIndex, setImageIndex] = useState(0);
  const [slide, setSlide] = useState<{
    previous: number;
    direction: 'next' | 'previous';
    id: number;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 50, y: 50 });
  const [lens, setLens] = useState<CSSProperties | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const gesture = useRef<{
    x: number;
    y: number;
    panX: number;
    panY: number;
    zoomed: boolean;
  } | null>(null);
  const suppressNextClick = useRef(false);
  const slideId = useRef(0);
  const imageAlt =
    imageIndex === 0
      ? product.imageAlt[locale]
      : t(
          locale,
          `${product.name} im BLOCK/01 Lookbook`,
          `${product.name} in the BLOCK/01 lookbook`,
        );

  useEffect(() => {
    images.forEach((source) => {
      const image = new Image();
      image.src = source;
    });
  }, [images]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finishSlide = () => {
      if (preference.matches) setSlide(null);
    };
    preference.addEventListener('change', finishSlide);
    return () => preference.removeEventListener('change', finishSlide);
  }, []);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  function selectImage(
    next: number,
    direction: 'next' | 'previous' = next > imageIndex ? 'next' : 'previous',
  ) {
    const index = (next + images.length) % images.length;
    if (index === imageIndex) return;
    setLens(null);
    setZoomed(false);
    setPan({ x: 50, y: 50 });
    setSlide(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? null
        : { previous: imageIndex, direction, id: ++slideId.current },
    );
    setImageIndex(index);
  }

  function toggleZoom() {
    setZoomed((value) => !value);
    setPan({ x: 50, y: 50 });
  }

  function openImage() {
    setLens(null);
    dialogRef.current?.showModal();
    setOpen(true);
  }

  function pointerDown(event: React.PointerEvent<HTMLButtonElement>, enlarged = false) {
    if (event.button !== 0 || !event.isPrimary) return;
    suppressNextClick.current = false;
    if (event.pointerType === 'mouse' && !(enlarged && zoomed)) return;
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
      zoomed: enlarged && zoomed,
    };
    if (enlarged && zoomed) event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerUp(event: React.PointerEvent<HTMLButtonElement>, enlarged = false) {
    const start = gesture.current;
    gesture.current = null;
    if (!start) return;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    const distance = Math.hypot(x, y);
    // Handle touch activation as part of this gesture. Browsers may suppress a
    // compatibility click after a swipe, and a drag must never activate zoom.
    if (event.pointerType === 'touch' && distance <= 8) {
      suppressNextClick.current = true;
      event.currentTarget.focus({ preventScroll: true });
      if (enlarged) toggleZoom();
      else openImage();
      return;
    }
    if (distance > 8) suppressNextClick.current = true;
    if (start.zoomed) {
      return;
    }
    if (Math.abs(x) < 44 || Math.abs(x) < Math.abs(y) * 1.25) return;
    suppressNextClick.current = true;
    selectImage(imageIndex + (x < 0 ? 1 : -1), x < 0 ? 'next' : 'previous');
  }

  function moveMagnifier(event: React.PointerEvent<HTMLButtonElement>) {
    if (
      event.pointerType !== 'mouse' ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
      slide
    )
      return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const image = event.currentTarget.querySelector('img');
    if (!image?.naturalWidth) return;
    const radius = Math.min(90, bounds.width / 4);
    const x = clamp(event.clientX - bounds.left, 0, bounds.width);
    const y = clamp(event.clientY - bounds.top, 0, bounds.height);
    const centerX = clamp(x, radius, bounds.width - radius);
    const centerY = clamp(y, radius, bounds.height - radius);
    const ratio = image.naturalWidth / image.naturalHeight;
    const imageWidth = Math.max(bounds.width, bounds.height * ratio);
    const imageHeight = imageWidth / ratio;
    setLens({
      '--lens-left': `${centerX - radius}px`,
      width: radius * 2,
      height: radius * 2,
      left: centerX - radius,
      top: centerY - radius,
      backgroundImage: `url("${images[imageIndex]}")`,
      backgroundSize: `${imageWidth * zoomScale}px ${imageHeight * zoomScale}px`,
      backgroundPosition: `${radius - (x + (imageWidth - bounds.width) / 2) * zoomScale}px ${radius - (y + (imageHeight - bounds.height) / 2) * zoomScale}px`,
    } as CSSProperties);
  }

  function moveZoom(event: React.PointerEvent<HTMLButtonElement>) {
    const start = gesture.current;
    if (!start?.zoomed) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPan({
      x: clamp(start.panX - (((event.clientX - start.x) / bounds.width) * 100) / (zoomScale - 1)),
      y: clamp(start.panY - (((event.clientY - start.y) / bounds.height) * 100) / (zoomScale - 1)),
    });
  }

  function handleArrow(event: React.KeyboardEvent, enlarged = false) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    if (enlarged && zoomed) {
      event.preventDefault();
      setPan((value) => ({
        x: clamp(value.x + (event.key === 'ArrowRight' ? 12 : event.key === 'ArrowLeft' ? -12 : 0)),
        y: clamp(value.y + (event.key === 'ArrowDown' ? 12 : event.key === 'ArrowUp' ? -12 : 0)),
      }));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      selectImage(
        imageIndex + (event.key === 'ArrowRight' ? 1 : -1),
        event.key === 'ArrowRight' ? 'next' : 'previous',
      );
    }
  }

  function renderImage(enlarged = false) {
    return (
      <>
        {slide && (
          <span
            key={`outgoing-${slide.id}`}
            className="product-gallery-outgoing"
            style={{ backgroundImage: `url("${images[slide.previous]}")` }}
            aria-hidden="true"
          />
        )}
        <img
          key={`${imageIndex}-${slide?.id ?? 'rest'}`}
          data-gallery-current=""
          src={images[imageIndex]}
          alt={imageAlt}
          fetchPriority={enlarged ? undefined : 'high'}
          width={enlarged ? undefined : 900}
          height={enlarged ? undefined : 1125}
          style={enlarged ? { transformOrigin: `${pan.x}% ${pan.y}%` } : undefined}
          draggable={false}
          onAnimationEnd={(event) => {
            if (event.animationName.startsWith('product-image-in-')) {
              setSlide((current) => (current?.id === slide?.id ? null : current));
            }
          }}
        />
      </>
    );
  }

  return (
    <>
      <section
        className="product-gallery"
        aria-label={t(locale, 'Produktbilder', 'Product images')}
      >
        <button
          type="button"
          className="product-gallery-main"
          disabled={!ready}
          data-direction={slide?.direction}
          data-sliding={!!slide}
          onPointerDown={(event) => pointerDown(event)}
          onPointerUp={(event) => pointerUp(event)}
          onTouchEnd={(event) => event.preventDefault()}
          onPointerCancel={() => {
            gesture.current = null;
          }}
          onPointerMove={moveMagnifier}
          onPointerLeave={() => setLens(null)}
          onBlur={() => setLens(null)}
          onKeyDown={(event) => handleArrow(event)}
          onClick={(event) => {
            if (event.detail > 0 && suppressNextClick.current) {
              suppressNextClick.current = false;
              return;
            }
            openImage();
          }}
          aria-label={t(
            locale,
            'Details ansehen: Produktbild vergrößern',
            'Explore the details: Enlarge product image',
          )}
        >
          {renderImage()}
          {lens && <span className="product-magnifier" style={lens} aria-hidden="true" />}
          <span className="product-zoom-label">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              aria-hidden="true"
            >
              <circle cx="10" cy="10" r="6.5" />
              <path d="m15 15 6 6M10 7v6M7 10h6" />
            </svg>
            {t(locale, 'Details ansehen', 'Explore the details')}
          </span>
        </button>
        <div className="product-thumbnails">
          {images.map((image, index) => (
            <button
              type="button"
              key={image}
              disabled={!ready}
              className={index === imageIndex ? 'is-selected' : ''}
              aria-pressed={index === imageIndex}
              aria-label={t(locale, `Bild ${index + 1} anzeigen`, `Show image ${index + 1}`)}
              onClick={() => selectImage(index)}
            >
              <img src={image} alt="" width="90" height="112" loading="lazy" />
            </button>
          ))}
          <span aria-live="polite" aria-atomic="true">
            {String(imageIndex + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
          </span>
        </div>
      </section>
      <dialog
        ref={dialogRef}
        className="commerce-dialog product-zoom-dialog"
        aria-label={t(locale, 'Vergrößertes Produktbild', 'Enlarged product image')}
        onClose={() => {
          setOpen(false);
          setZoomed(false);
          setPan({ x: 50, y: 50 });
          gesture.current = null;
        }}
        onKeyDown={(event) => handleArrow(event, true)}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            event.currentTarget.close();
        }}
      >
        <button
          className="commerce-dialog-close"
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label={t(locale, 'Bild schließen', 'Close image')}
          autoFocus
        >
          ×
        </button>
        <button
          type="button"
          className="product-zoom-view"
          data-direction={slide?.direction}
          data-sliding={!!slide}
          data-zoomed={zoomed}
          aria-label={t(locale, 'Bilddetail', 'Image detail')}
          aria-pressed={zoomed}
          onClick={(event) => {
            if (event.detail > 0 && suppressNextClick.current) {
              suppressNextClick.current = false;
              return;
            }
            toggleZoom();
          }}
          onPointerDown={(event) => pointerDown(event, true)}
          onPointerMove={moveZoom}
          onPointerUp={(event) => pointerUp(event, true)}
          onTouchEnd={(event) => event.preventDefault()}
          onPointerCancel={() => {
            gesture.current = null;
          }}
        >
          {renderImage(true)}
        </button>
        <div className="product-zoom-toolbar">
          <button
            type="button"
            disabled={images.length < 2}
            onClick={() => selectImage(imageIndex - 1, 'previous')}
            aria-label={t(locale, 'Vorheriges Bild', 'Previous image')}
          >
            ←
          </button>
          <span aria-live="polite" aria-atomic="true">
            {imageIndex + 1} / {images.length}
          </span>
          <button
            type="button"
            className="product-zoom-toggle"
            onClick={toggleZoom}
            aria-pressed={zoomed}
            aria-label={
              zoomed
                ? t(locale, 'Vergrößerung zurücksetzen', 'Reset zoom')
                : t(locale, 'Bild vergrößern', 'Zoom in')
            }
          >
            {zoomed ? '−' : '+'} <span>2.5×</span>
          </button>
          <button
            type="button"
            disabled={images.length < 2}
            onClick={() => selectImage(imageIndex + 1, 'next')}
            aria-label={t(locale, 'Nächstes Bild', 'Next image')}
          >
            →
          </button>
        </div>
        <p className="product-zoom-help">
          {zoomed
            ? t(locale, 'Ziehen oder Pfeiltasten zum Bewegen.', 'Drag or use arrow keys to move.')
            : t(
                locale,
                'Wischen zum Wechseln · Tippen zum Vergrößern',
                'Swipe to change · Tap to zoom',
              )}
        </p>
      </dialog>
    </>
  );
}
