import { useState } from 'react';

const SPRING_TRANSITION = {
  type: 'spring' as const,
  damping: 15,
  stiffness: 150,
};

export function usePressAnimation(pressedScale = 0.95) {
  const [pressed, setPressed] = useState(false);

  const animate = { scale: pressed ? pressedScale : 1 };
  const transition = SPRING_TRANSITION;

  const handlePressIn = () => setPressed(true);
  const handlePressOut = () => setPressed(false);

  return { animate, transition, handlePressIn, handlePressOut };
}
