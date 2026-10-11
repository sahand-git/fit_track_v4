import { Platform } from 'react-native';

/**
 * FitTrack v4 — Editorial Ledger Design System
 * 
 * Inspired by Google Stitch "FitTrack Editorial Ledger":
 * - Warm ivory background (#FAF7F2)
 * - Deep forest green primary (#1E3A2F)
 * - Muted sage secondary (#7A9283)
 * - Restrained terracotta accent (#C1664C)
 * - Charcoal text (#1F2421)
 * - Newsreader serif for display headlines & Inter sans for body and controls
 * - Generous spacing, fine dividers, clear reading order, and fewer repeated cards
 */

const serifFont = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  web: 'Newsreader, Georgia, "Times New Roman", serif',
  default: 'serif',
});

const sansFont = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  web: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  default: 'sans-serif',
});

export const theme = {
  fonts: {
    serif: serifFont,
    sans: sansFont,
  },

  colors: {
    // Canvas & Surfaces — Warm ivory and fine parchment
    background: '#FAF7F2',       // Warm ivory background
    surface: '#FFFFFF',          // Clean white surface
    surfaceSubtle: '#F3EFE6',    // Warm parchment ledger tint
    surfaceElevated: '#FFFFFF',  // Floating sheets & modals
    
    // Dividers & Outlines — Fine ledger rules
    border: '#E5E0D5',           // Delicate ledger rule
    borderStrong: '#CEC7B8',     // Interactive outline
    borderFocus: '#1E3A2F',      // Deep forest green focus
    
    // Typography — Charcoal & Muted Sage
    textPrimary: '#1F2421',      // Charcoal text
    textSecondary: '#555F58',    // Muted charcoal / slate
    textMuted: '#7E8A82',        // Muted sage grey
    textInverted: '#FFFFFF',     // Contrast white
    
    // Primary Brand — Deep Forest Green
    primary: '#1E3A2F',          // Deep forest green
    primaryHover: '#162C23',     // Dark pressed state
    primaryLight: '#EBF2ED',     // Soft forest wash
    primaryBorder: '#BDD2C6',    // Subtle botanical edge
    
    // Secondary — Muted Sage
    secondary: '#7A9283',        // Muted sage
    secondaryLight: '#F0F4F1',   // Soft sage wash
    secondaryBorder: '#C8D5CD',
    
    // Restrained Warm Accent — Terracotta
    accent: '#C1664C',           // Restrained terracotta accent
    accentLight: '#FBF1EE',      // Gentle terracotta wash
    accentBorder: '#E8C8BE',     // Terracotta outline
    
    // Functional States
    danger: '#B83A3A',
    dangerLight: '#FAEDED',
    warning: '#BA7720',
    warningLight: '#FDF7EB',
    success: '#1E3A2F',
    
    // Nutrient Spectrum (Editorial harmony)
    macroProtein: '#1E3A2F',     // Deep forest green
    macroProteinLight: '#EBF2ED',
    macroCarbs: '#C1664C',       // Terracotta
    macroCarbsLight: '#FBF1EE',
    macroFat: '#7A9283',         // Muted sage
    macroFatLight: '#F0F4F1',
    
    // Hydration
    water: '#3B6B78',            // Deep slate-cyan mineral water
    waterLight: '#EDF5F7',
    
    // Overlay backdrop
    backdrop: 'rgba(31, 36, 33, 0.45)',
  },

  typography: {
    // Editorial Newsreader display styles
    display: {
      fontFamily: serifFont,
      fontSize: 32,
      fontWeight: '700' as const,
      letterSpacing: -0.6,
      lineHeight: 38,
    },
    title1: {
      fontFamily: serifFont,
      fontSize: 24,
      fontWeight: '700' as const,
      letterSpacing: -0.4,
      lineHeight: 30,
    },
    title2: {
      fontFamily: serifFont,
      fontSize: 20,
      fontWeight: '600' as const,
      letterSpacing: -0.3,
      lineHeight: 26,
    },
    title3: {
      fontFamily: sansFont,
      fontSize: 16,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
      lineHeight: 22,
    },
    // Inter body and controls
    body: {
      fontFamily: sansFont,
      fontSize: 15,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodyMedium: {
      fontFamily: sansFont,
      fontSize: 15,
      fontWeight: '500' as const,
      lineHeight: 22,
    },
    callout: {
      fontFamily: sansFont,
      fontSize: 13,
      fontWeight: '500' as const,
      lineHeight: 18,
    },
    caption: {
      fontFamily: sansFont,
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    captionMedium: {
      fontFamily: sansFont,
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
    },
  },

  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },

  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },

  shadow: {
    subtle: {
      shadowColor: '#1F2421',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 2,
    },
    floating: {
      shadowColor: '#1F2421',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 5,
    },
  },
};
