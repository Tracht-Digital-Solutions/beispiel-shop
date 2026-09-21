import { useEffect, type RefObject } from 'react';
import { slideElement, timing } from '../lib/motion';

let locks = 0;
let previousOverflow = '';
export function useSlideDialog(
  ref: RefObject<HTMLDialogElement | null>,
  edge: 'right' | 'bottom' | 'center' = 'right',
) {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const nativeShow = dialog.showModal.bind(dialog);
    const nativeClose = dialog.close.bind(dialog);
    let cancel: (() => void) | undefined;
    let locked = false;
    let closing = false;
    const offscreen =
      edge === 'right'
        ? 'translateX(100%)'
        : edge === 'bottom'
          ? 'translateY(100%)'
          : 'translateY(calc(50dvh + 50%))';
    function unlock() {
      if (locked) {
        locked = false;
        if (--locks === 0) document.body.style.overflow = previousOverflow;
      }
    }
    dialog.showModal = () => {
      const wasOpen = dialog.open;
      const from = wasOpen ? getComputedStyle(dialog).transform : offscreen;
      cancel?.();
      closing = false;
      if (!wasOpen) nativeShow();
      if (!locked) {
        if (locks++ === 0) previousOverflow = document.body.style.overflow;
        locked = true;
        document.body.style.overflow = 'hidden';
      }
      dialog.dataset.state = 'open';
      cancel = slideElement(dialog, from, 'none', timing.panel);
    };
    dialog.close = (value?: string) => {
      if (!dialog.open || closing) return;
      closing = true;
      const from = getComputedStyle(dialog).transform;
      cancel?.();
      dialog.dataset.state = 'closing';
      cancel = slideElement(dialog, from, offscreen, timing.panel, () => {
        nativeClose(value);
        unlock();
        closing = false;
        dialog.style.transform = '';
        dialog.dataset.state = 'closed';
      });
    };
    const escape = (event: Event) => {
      event.preventDefault();
      dialog.close();
    };
    dialog.addEventListener('cancel', escape);
    dialog.addEventListener('close', unlock);
    return () => {
      cancel?.();
      unlock();
      dialog.showModal = nativeShow;
      dialog.close = nativeClose;
      dialog.removeEventListener('cancel', escape);
      dialog.removeEventListener('close', unlock);
    };
  }, [ref, edge]);
}
