import React, { useEffect, useState, useRef } from 'react';
import { TextStyle, StyleProp } from 'react-native';
import { AppText as Text } from './AppText';
import { isReducedMotion } from '../utils/motion';

interface AnimatedCountProps {
  value: number;
  style?: StyleProp<TextStyle>;
  duration?: number;
  formatter?: (val: number) => string;
}

/**
 * Animated count-up / count-down number with ease-out cubic interpolation.
 * Respects system reduced motion by updating immediately.
 */
export const AnimatedCount: React.FC<AnimatedCountProps> = ({
  value,
  style,
  duration = 320,
  formatter = (v) => Math.round(v).toLocaleString(),
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (isReducedMotion() || duration <= 0) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startVal = prevValueRef.current;
    const diff = value - startVal;
    if (diff === 0) {
      setDisplayValue(value);
      return;
    }

    const startTime = Date.now();
    let animId: number;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic curve: 1 - (1 - t)^3
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + diff * eased;
      setDisplayValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        setDisplayValue(value);
        prevValueRef.current = value;
      }
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      prevValueRef.current = value;
    };
  }, [value, duration]);

  return <Text style={style}>{formatter(displayValue)}</Text>;
};
