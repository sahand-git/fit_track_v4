import React from 'react';
import { Text, TextProps } from 'react-native';
import { useLanguage } from '../i18n/I18nContext';
import { translate } from '../i18n/strings';

/** Text wrapper translates static interface labels and sets correct script direction. */
export function AppText({ children, style, ...props }: TextProps) {
  const language = useLanguage();
  const translated = typeof children === 'string' ? translate(language, children) : children;
  return (
    <Text
      {...props}
      style={[{ writingDirection: language === 'en' ? 'ltr' : 'rtl' }, style]}
    >
      {translated}
    </Text>
  );
}
