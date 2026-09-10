import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { Filters } from '../lib/filter';
import type { Locale } from '../lib/types';
import { t } from '../lib/i18n';
import '../styles/filter-chips.css';

type Chip = { id: keyof Filters | 'reset'; label: string };
type VisibleChip = Chip & { exiting: boolean; version: number };

function ChipButton({
  chip,
  locale,
  onClick,
  onExit,
}: {
  chip: VisibleChip;
  locale: Locale;
  onClick: () => void;
  onExit: (id: Chip['id'], version: number) => void;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const { id, exiting, version } = chip;
  useLayoutEffect(() => {
    if (!exiting || !button.current) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches || !button.current.animate) {
      onExit(id, version);
      return;
    }
    const animation = button.current.animate(
      [{ transform: 'none' }, { transform: 'translateX(-110%)' }],
      { duration: 260, easing: 'cubic-bezier(0.22, 0.7, 0.25, 1)', fill: 'forwards' },
    );
    let cancelled = false;
    const reduce = () => {
      if (preference.matches) animation.finish();
    };
    preference.addEventListener('change', reduce);
    animation.finished
      .then(() => {
        if (!cancelled) onExit(id, version);
      })
      .catch(() => {
        /* Re-adding a filter cancels its old departure. */
      });
    return () => {
      cancelled = true;
      preference.removeEventListener('change', reduce);
      animation.cancel();
    };
  }, [id, exiting, version, onExit]);
  return (
    <span
      className="filter-chip-slot"
      data-filter={id}
      data-state={exiting ? 'exit' : 'idle'}
      inert={exiting}
      aria-hidden={exiting ? true : undefined}
    >
      <button
        ref={button}
        type="button"
        className={id === 'reset' ? 'clear-filters' : undefined}
        onClick={onClick}
      >
        {chip.label}
        {id !== 'reset' && (
          <>
            <span aria-hidden="true">×</span>
            <span className="sr-only">{t(locale, 'Filter entfernen', 'Remove filter')}</span>
          </>
        )}
      </button>
    </span>
  );
}

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
  const [source, setSource] = useState(chips);
  const [visible, setVisible] = useState<VisibleChip[]>(() =>
    chips.map((chip) => ({ ...chip, exiting: false, version: 0 })),
  );
  // Keep only visual snapshots. Removed filters stop affecting the catalogue immediately.
  if (source !== chips) {
    const next = chips.map((chip) => {
      const old = visible.find((item) => item.id === chip.id);
      return { ...chip, exiting: false, version: (old?.version ?? 0) + (old?.exiting ? 1 : 0) };
    });
    visible.forEach((chip, index) => {
      if (!chips.some((item) => item.id === chip.id)) {
        next.splice(Math.min(index, next.length), 0, {
          ...chip,
          exiting: true,
          version: chip.exiting ? chip.version : chip.version + 1,
        });
      }
    });
    setSource(chips);
    setVisible(next);
  }
  const finish = useCallback((id: Chip['id'], version: number) => {
    setVisible((items) =>
      items.filter((item) => !(item.id === id && item.version === version && item.exiting)),
    );
  }, []);
  return (
    <div className="filter-chips">
      {visible.map((chip) => (
        <ChipButton
          key={chip.id}
          chip={chip}
          locale={locale}
          onExit={finish}
          onClick={() => {
            searchRef.current?.focus({ preventScroll: true });
            if (chip.id === 'reset') onReset();
            else onRemove(chip.id);
          }}
        />
      ))}
    </div>
  );
}
