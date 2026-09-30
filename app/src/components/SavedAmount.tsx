import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { money } from '@/lib/format';
import { useUI } from '@/store/ui';

import { Text } from './Text';

const DURATION = 900;

/**
 * The money-saved number. It ticks up only when the value grows after the user
 * has already seen it, i.e. right after they log a cancellation. It never
 * animates on first load.
 */
export function SavedAmount({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const lastSeen = useUI((s) => s.lastSeenSaved);
  const [tick, setTick] = useState<number | null>(null);

  const willAnimate = lastSeen !== null && value > lastSeen && !reduceMotion;
  const shown = tick ?? (willAnimate ? lastSeen : value);

  useEffect(() => {
    const { lastSeenSaved: from, setLastSeenSaved } = useUI.getState();
    if (from === null || value <= from || reduceMotion) {
      setLastSeenSaved(value);
      return;
    }

    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / DURATION);
      if (p < 1) {
        setTick(from + (value - from) * (1 - Math.pow(1 - p, 3)));
        frame = requestAnimationFrame(step);
      } else {
        setTick(null);
        setLastSeenSaved(value);
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, reduceMotion]);

  return (
    <Text variant="heroSecondary" tone="saved" accessibilityLabel={`${money(value)} saved`}>
      {money(shown)}
    </Text>
  );
}
