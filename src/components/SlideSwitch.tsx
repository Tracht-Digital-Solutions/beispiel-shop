import { useMotionPreference } from './useMotionPreference';
import { useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, useIsPresent } from 'motion/react';
import * as m from 'motion/react-m';
import { MotionRoot } from './Motion';
import { ease, timing } from '../lib/motion';

function Frame({ children, direction }: { children: ReactNode; direction: number }) {
  const present = useIsPresent();
  const reduced = useMotionPreference();
  const [moving, setMoving] = useState(false);
  return (
    <m.div
      style={{ gridArea: '1/1', minWidth: 0, pointerEvents: moving ? 'none' : undefined }}
      onAnimationStart={() => setMoving(!reduced)}
      onAnimationComplete={() => setMoving(false)}
      inert={!present}
      aria-hidden={!present || undefined}
      custom={direction}
      variants={{
        enter: (d: number) => ({ x: reduced ? 0 : `${d * 110}%` }),
        current: { x: 0 },
        exit: (d: number) => ({ x: reduced ? 0 : `${-d * 110}%` }),
      }}
      initial="enter"
      animate="current"
      exit="exit"
      transition={{ duration: reduced ? 0 : timing.content, ease }}
    >
      {children}
    </m.div>
  );
}
export default function SlideSwitch({ step, children }: { step: number; children: ReactNode }) {
  const previous = useRef(step);
  const direction = step < previous.current ? -1 : 1;
  previous.current = step;
  return (
    <MotionRoot>
      <div style={{ display: 'grid', overflow: 'clip', overflowClipMargin: 5 }}>
        <AnimatePresence initial={false} custom={direction}>
          <Frame key={step} direction={direction}>
            {children}
          </Frame>
        </AnimatePresence>
      </div>
    </MotionRoot>
  );
}
