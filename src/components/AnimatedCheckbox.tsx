import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { isReducedMotion } from '../utils/motion';

interface AnimatedCheckboxProps {
  checked: boolean;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
}

export const AnimatedCheckbox: React.FC<AnimatedCheckboxProps> = ({
  checked,
  size = 20,
  activeColor,
  inactiveColor,
}) => {
  const { theme } = useTheme();
  const resolvedActive = activeColor ?? theme.colors.primary;
  const resolvedInactive = inactiveColor ?? theme.colors.textMuted;
  const [scale] = React.useState(() => new Animated.Value(1));
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!isReducedMotion()) {
      scale.setValue(0.85);
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }).start();
    }
  }, [checked, scale]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      {checked ? (
        <CheckCircle2 size={size} color={resolvedActive} />
      ) : (
        <Circle size={size} color={resolvedInactive} />
      )}
    </Animated.View>
  );
};
