import { AnimatePresence } from 'motion/react';
import type { RefObject } from 'react';
import type { Filters } from '../lib/filter';
import type { Locale } from '../lib/types';
import { t } from '../lib/i18n';
import { MotionRoot, SlideItem } from './Motion';
import '../styles/filter-chips.css';
type Chip = { id: keyof Filters | 'reset'; label: string };
export default function FilterChips({
  chips,
  locale,
  onRemove,
  onReset,
  searchRef,
}: {
  chips: Chip[];
  locale: Locale;
  onRemove: (key: keyof Filters) => void;
  onReset: () => void;
  searchRef: RefObject<HTMLInputElement | null>;
}) {
  return (
    <MotionRoot>
      <div className="filter-chips">
        <AnimatePresence initial={false}>
          {chips.map((chip) => (
            <SlideItem key={chip.id} className="filter-chip-slot" data-filter={chip.id}>
              <button
                type="button"
                className={chip.id === 'reset' ? 'clear-filters' : undefined}
                onClick={() => {
                  searchRef.current?.focus({ preventScroll: true });
                  if (chip.id === 'reset') onReset();
                  else onRemove(chip.id);
                }}
              >
                {chip.label}
                {chip.id !== 'reset' && (
                  <>
                    <span aria-hidden="true">×</span>
                    <span className="sr-only">
                      {t(locale, 'Filter entfernen', 'Remove filter')}
                    </span>
                  </>
                )}
              </button>
            </SlideItem>
          ))}
        </AnimatePresence>
      </div>
    </MotionRoot>
  );
}
