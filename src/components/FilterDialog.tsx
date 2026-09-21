import { type ReactNode, type RefObject } from 'react';
import { useSlideDialog } from './useSlideDialog';
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
  useSlideDialog(dialogRef, 'bottom');
  const close = () => dialogRef.current?.close();

  return (
    <dialog
      className="filter-dialog"
      ref={dialogRef}
      aria-label={t(locale, 'Produktfilter', 'Product filters')}
      onCancel={(event) => {
        event.preventDefault();
        close();
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
