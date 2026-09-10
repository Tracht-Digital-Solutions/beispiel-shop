import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { t } from '../lib/i18n';
import type { Locale } from '../lib/types';

interface FilterDialogProps {
  locale: Locale;
  dialogRef: RefObject<HTMLDialogElement | null>;
  count: number;
  onReset: () => void;
  children: ReactNode;
}

export default function FilterDialog({
  locale,
  dialogRef,
  count,
  onReset,
  children,
}: FilterDialogProps) {
  const pendingClose = useRef<{ animation: Animation; cancel: () => void } | null>(null);

  useEffect(() => () => pendingClose.current?.cancel(), []);

  function close() {
    const dialog = dialogRef.current;
    if (!dialog?.open || pendingClose.current) return;

    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches || typeof dialog.animate !== 'function') {
      dialog.close();
      return;
    }

    // Start from the displayed frame if the entrance is still in progress.
    const animation = dialog.animate(
      [{ transform: getComputedStyle(dialog).transform }, { transform: 'translateY(100%)' }],
      {
        duration: 380,
        easing: 'cubic-bezier(0.22, 0.7, 0.25, 1)',
        fill: 'forwards',
      },
    );
    function cancel() {
      if (pendingClose.current?.animation !== animation) return;
      pendingClose.current = null;
      preference.removeEventListener('change', reduce);
      animation.onfinish = null;
      animation.oncancel = null;
      animation.cancel();
      delete dialog!.dataset.state;
    }
    function finish() {
      if (pendingClose.current?.animation !== animation) return;
      // Native close restores focus after the complete panel has left the viewport.
      dialog!.close();
      cancel();
    }
    function reduce() {
      if (preference.matches) finish();
    }
    pendingClose.current = { animation, cancel };
    dialog.dataset.state = 'closing';
    animation.onfinish = finish;
    animation.oncancel = finish;
    preference.addEventListener('change', reduce);
  }

  return (
    <dialog
      className="filter-dialog"
      ref={dialogRef}
      aria-label={t(locale, 'Produktfilter', 'Product filters')}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={(event) => {
        if (!event.currentTarget.open) pendingClose.current?.cancel();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          close();
      }}
    >
      <div className="dialog-top">
        <h2>{t(locale, 'Deine Filter', 'Your filters')}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={close}
          aria-label={t(locale, 'Filter schließen', 'Close filters')}
        >
          ×
        </button>
      </div>
      {children}
      <button type="button" className="btn" onClick={close}>
        {count} {t(locale, 'Produkte anzeigen', 'products — show results')} ↗
      </button>
      <button type="button" className="text-button" onClick={onReset}>
        {t(locale, 'Zurücksetzen', 'Reset all')}
      </button>
    </dialog>
  );
}
