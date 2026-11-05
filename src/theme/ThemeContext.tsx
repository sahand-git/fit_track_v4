import React, { createContext, useContext, useMemo } from 'react';
import { ColorSchemeName, useColorScheme } from 'react-native';
import { theme, darkTheme, ThemeMode, ThemeType } from '../theme';

export type { ThemeMode };

export function getTheme(mode: ThemeMode = 'system', systemScheme?: ColorSchemeName): ThemeType {
  if (mode === 'dark') return darkTheme;
  if (mode === 'light') return theme;
  return systemScheme === 'dark' ? darkTheme : theme;
}

export interface ThemeContextValue {
  theme: ThemeType;
  themeMode: ThemeMode;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme,
  themeMode: 'system',
  isDark: false,
});

export const ThemeProvider: React.FC<{
  themeMode?: ThemeMode;
  children: React.ReactNode;
}> = ({ themeMode = 'system', children }) => {
  const systemScheme = useColorScheme();
  const activeTheme = useMemo(() => getTheme(themeMode, systemScheme), [themeMode, systemScheme]);
  const isDark = activeTheme === darkTheme;

  const value = useMemo(
    () => ({
      theme: activeTheme,
      themeMode,
      isDark,
    }),
    [activeTheme, themeMode, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
