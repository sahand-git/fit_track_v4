import React from 'react';
import { StyleProp, ViewStyle, View } from 'react-native';
import {
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react-native';
import { useIsRTL } from '../hooks/useIsRTL';

export type DirectionalIconName =
  | 'ChevronRight'
  | 'ChevronLeft'
  | 'ArrowLeft'
  | 'ArrowRight';

interface DirectionalIconProps {
  name: DirectionalIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * DirectionalIcon: Automatically mirrors direction-based navigation icons
 * (back arrows, disclosure chevrons, date navigators) when the active language
 * is Right-To-Left (Arabic or Kurdish Sorani).
 */
export const DirectionalIcon: React.FC<DirectionalIconProps> = ({
  name,
  size = 20,
  color,
  strokeWidth,
  style,
}) => {
  const isRTL = useIsRTL();

  const renderIcon = () => {
    switch (name) {
      case 'ChevronRight':
        return <ChevronRight size={size} color={color} strokeWidth={strokeWidth} />;
      case 'ChevronLeft':
        return <ChevronLeft size={size} color={color} strokeWidth={strokeWidth} />;
      case 'ArrowLeft':
        return <ArrowLeft size={size} color={color} strokeWidth={strokeWidth} />;
      case 'ArrowRight':
        return <ArrowRight size={size} color={color} strokeWidth={strokeWidth} />;
    }
  };

  return (
    <View style={[{ transform: [{ scaleX: isRTL ? -1 : 1 }] }, style]}>
      {renderIcon()}
    </View>
  );
};
