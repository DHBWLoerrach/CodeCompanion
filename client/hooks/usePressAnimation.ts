import { useState } from 'react';

import { useReducedMotion } from '@/hooks/useReducedMotion';

const SPRING_TRANSITION = {
  type: 'spring' as const,
  damping: 25,
  stiffness: 150,
};

const REDUCED_MOTION_TRANSITION = {
  type: 'timing' as const,
  duration: 100,
  easing: 'easeOut' as const,
};

export function usePressAnimation(pressedScale = 0.95) {
  const [pressed, setPressed] = useState(false);
  const isReducedMotionEnabled = useReducedMotion();

  const animate = isReducedMotionEnabled
    ? { opacity: pressed ? 0.82 : 1, scale: 1 }
    : { opacity: 1, scale: pressed ? pressedScale : 1 };
  const transition = isReducedMotionEnabled
    ? REDUCED_MOTION_TRANSITION
    : SPRING_TRANSITION;

  const handlePressIn = () => setPressed(true);
  const handlePressOut = () => setPressed(false);

  return { animate, transition, handlePressIn, handlePressOut };
}
