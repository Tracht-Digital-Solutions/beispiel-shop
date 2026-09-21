import { animate } from 'motion/mini';
import type { AnimationPlaybackControls } from 'motion';
import { ease, timing } from '../lib/motion';
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import './swipe-accordion.css';

interface SwipeAccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export default function SwipeAccordion({
  title,
  children,
  defaultOpen = false,
}: SwipeAccordionProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const expandedRef = useRef(defaultOpen);
  const animationsRef = useRef<AnimationPlaybackControls[]>([]);

  function cancelAnimations() {
    for (const animation of animationsRef.current) animation.cancel();
    animationsRef.current = [];
  }

  function finish() {
    cancelAnimations();
    if (detailsRef.current) detailsRef.current.open = expandedRef.current;
    if (viewportRef.current) {
      viewportRef.current.inert = false;
      viewportRef.current.style.height = '';
    }
    if (contentRef.current) contentRef.current.style.transform = '';
  }

  useEffect(() => {
    // Preserve native interactions that happened before this island hydrated.
    const details = detailsRef.current;
    if (details) {
      expandedRef.current = details.open;
      summaryRef.current?.setAttribute('aria-expanded', String(details.open));
    }
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotionChange = () => {
      if (media.matches) finish();
    };
    media.addEventListener('change', onMotionChange);
    return () => {
      media.removeEventListener('change', onMotionChange);
      cancelAnimations();
    };
  }, []);

  function toggle(event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    const details = detailsRef.current;
    const summary = summaryRef.current;
    const viewport = viewportRef.current;
    const content = contentRef.current;
    if (!details || !summary || !viewport || !content) return;

    const expanded = !expandedRef.current;
    expandedRef.current = expanded;
    summary.setAttribute('aria-expanded', String(expanded));
    if (!expanded && viewport.contains(document.activeElement)) summary.focus();
    viewport.inert = !expanded;

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      typeof viewport.animate !== 'function'
    ) {
      finish();
      return;
    }

    // Capture the current frame before cancelling so repeated toggles reverse
    // the current movement without jumping back to either endpoint.
    const fromHeight = details.open ? viewport.getBoundingClientRect().height : 0;
    const fromTransform = details.open ? getComputedStyle(content).transform : 'translateY(-100%)';
    cancelAnimations();
    details.open = true;
    const toHeight = expanded ? content.getBoundingClientRect().height : 0;
    const options = { duration: timing.content, ease };
    const height = animate(viewport, { height: [fromHeight, toHeight] }, options);
    const slide = animate(
      content,
      { transform: [fromTransform, expanded ? 'none' : 'translateY(-100%)'] },
      options,
    );
    animationsRef.current = [height, slide];
    height.then(() => {
      if (animationsRef.current[0] === height) {
        finish();
        viewport.style.height = '';
        content.style.transform = '';
      }
    });
  }

  return (
    <details ref={detailsRef} open={defaultOpen} className="swipe-accordion">
      <summary ref={summaryRef} aria-expanded={defaultOpen} onClick={toggle}>
        {title}
        <span aria-hidden="true">+</span>
      </summary>
      <div ref={viewportRef} className="swipe-accordion-viewport">
        <div ref={contentRef} className="swipe-accordion-content">
          {children}
        </div>
      </div>
    </details>
  );
}
