import { useState, useEffect } from 'react';
import { Keyboard, Platform, KeyboardEvent } from 'react-native';
import { KEYBOARD_AVOIDING_BEHAVIOR, resolveKeyboardAvoidingBehavior } from '../utils/keyboardAvoidance';

export { KEYBOARD_AVOIDING_BEHAVIOR, resolveKeyboardAvoidingBehavior };

export interface KeyboardState {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
}

/**
 * Shared hook that tracks soft keyboard visibility and pixel height across Android and iOS.
 */
export function useKeyboardHeight(
  onShow?: (height: number) => void,
  onHide?: () => void
): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    isKeyboardVisible: false,
    keyboardHeight: 0,
  });

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (e: KeyboardEvent) => {
      const height = e?.endCoordinates?.height ?? 0;
      setState({
        isKeyboardVisible: true,
        keyboardHeight: height,
      });
      if (onShow) onShow(height);
    };

    const onKeyboardHide = () => {
      setState({
        isKeyboardVisible: false,
        keyboardHeight: 0,
      });
      if (onHide) onHide();
    };

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [onShow, onHide]);

  return state;
}
