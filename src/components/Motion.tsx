import { useMotionPreference } from './useMotionPreference';
import { LazyMotion, domMax, MotionConfig, usePresence, usePresenceData } from 'motion/react';
import * as m from 'motion/react-m';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ease, timing, slideElement } from '../lib/motion';

export function MotionRoot({ children }: { children: ReactNode }) {
  const reduced = useMotionPreference();
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig
        reducedMotion={reduced ? 'always' : 'never'}
        transition={{ duration: reduced ? 0 : timing.content, ease }}
      >
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

export function SlideItem({
  children,
  className,
  direction = 1,
  ...props
}: {
  children: ReactNode;
  className?: string;
  direction?: number;
  'data-product-id'?: string;
  'data-filter'?: string;
}) {
  const [present, safeToRemove] = usePresence();
  const exitDirection = usePresenceData() ?? direction;
  const reduced = useMotionPreference();
  const content = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [moving, setMoving] = useState(false);
  useLayoutEffect(() => {
    const node = content.current;
    if (!node) return;
    const from = initialized.current
      ? getComputedStyle(node).transform
      : `translateX(${direction * 110}%)`;
    initialized.current = true;
    setMoving(present && !reduced && from !== 'none');
    return slideElement(
      node,
      from,
      present ? 'none' : `translateX(${-exitDirection * 110}%)`,
      reduced ? 0 : timing.content,
      () => {
        setMoving(false);
        if (!present) safeToRemove?.();
      },
    );
  }, [present, reduced, safeToRemove]);
  return (
    <m.div
      layout="position"
      className={className}
      {...props}
      data-state={present ? 'idle' : 'exit'}
      inert={!present}
      aria-hidden={!present || undefined}
      style={{ position: 'relative', pointerEvents: moving ? 'none' : undefined }}
    >
      <div ref={content}>{children}</div>
    </m.div>
  );
}
