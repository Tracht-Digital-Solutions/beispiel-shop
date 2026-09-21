import { slideElement } from '../lib/motion';
import { useCallback, useState } from 'react';
import { useStore } from '@nanostores/react';
import { $cart, cartEntries } from '../lib/cart';

export type CartRow = ReturnType<typeof cartEntries>[number] & {
  phase: 'enter' | 'idle' | 'exit';
  version: number;
};

// Keep only a visual snapshot of removed rows. Persistence changes immediately.
export function useCartRows() {
  const items = useStore($cart, { ssr: 'initial' });
  const [source, setSource] = useState(items);
  const [rows, setRows] = useState<CartRow[]>(() =>
    cartEntries(items).map((entry) => ({ ...entry, phase: 'enter', version: 1 })),
  );
  if (source !== items) {
    const entries = cartEntries(items);
    const next: CartRow[] = entries.map((entry) => {
      const previous = rows.find((row) => row.variant.id === entry.variant.id);
      const entering = !previous || previous.phase === 'exit';
      return {
        ...entry,
        phase: entering ? 'enter' : previous.phase,
        version: entering ? (previous?.version ?? 0) + 1 : previous.version,
      };
    });
    for (const [index, previous] of rows.entries()) {
      if (entries.some((entry) => entry.variant.id === previous.variant.id)) continue;
      next.splice(Math.min(index, next.length), 0, {
        ...previous,
        phase: 'exit',
        version: previous.phase === 'exit' ? previous.version : previous.version + 1,
      });
    }
    setSource(items);
    setRows(next);
  }
  const finish = useCallback((id: string, version: number) => {
    setRows((current) =>
      current.flatMap((row) => {
        if (row.variant.id !== id || row.version !== version) return [row];
        return row.phase === 'exit' ? [] : [{ ...row, phase: 'idle' }];
      }),
    );
  }, []);
  return { rows, finish };
}

export function slide(
  element: HTMLElement,
  from: string,
  to: string,
  duration: number,
  complete: () => void,
) {
  return slideElement(element, from, to, duration / 1000, complete);
}
