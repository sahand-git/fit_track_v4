/**
 * FitTrack v4 — Botanical Warm Minimal Design System
 * 
 * Calm, confident, premium wellness identity.
 * - Soft neutral background (#FAF9F6)
 * - Deep legible text (#1C1D1B)
 * - Botanical forest green primary (#2E5A44)
 * - Restrained warm accent (#D97746, terra cotta)
 * - Crisp, clean surfaces and subtle dividers without aggressive card borders
 */

export const theme = {
  colors: {
    // Canvas & Surfaces
    background: '#FAF9F6',       // Warm alabaster / linen
    surface: '#FFFFFF',          // Clean white surface
    surfaceSubtle: '#F4F2EC',    // Soft sand tint for secondary chips / bars
    surfaceElevated: '#FFFFFF',  // Floating sheets & modals
    
    // Dividers & Outlines
    border: '#E8E5DF',           // Gentle organic divider
    borderStrong: '#D5D1C7',     // Interactive outline
    borderFocus: '#2E5A44',      // Botanical green focus
    
    // Typography
    textPrimary: '#1E201D',      // Deep charcoal / nearly black
    textSecondary: '#545852',    // Balanced slate / sage grey
    textMuted: '#848880',        // Subdued supporting text
    textInverted: '#FFFFFF',     // Contrast white for primary buttons
    
    // Brand Botanical Primary
    primary: '#2E5A44',          // Deep botanical forest green
    primaryHover: '#244736',     // Pressed / hover state
    primaryLight: '#EDF3EE',     // Very soft sage wash
    primaryBorder: '#C8D9CD',    // Delicate botanical accent line
    
    // Restrained Warm Accent
    accent: '#C86D44',           // Warm terracotta / clay (used sparingly)
    accentLight: '#FAF0EB',      // Gentle clay wash
    accentBorder: '#ECCEC0',     // Subtle terracotta border
    
    // Functional States
    danger: '#B93E3E',           // Crimson / deep brick red
    dangerLight: '#FAEDED',      // Red wash
    warning: '#C97D1A',          // Muted ochre amber
    warningLight: '#FDF7EB',     
    success: '#2E5A44',          // Same botanical tone
    
    // Nutrient Spectrum (Subtle, unified & harmonious)
    macroProtein: '#2E5A44',     // Deep green
    macroProteinLight: '#EDF3EE',
    macroCarbs: '#C86D44',       // Terracotta
    macroCarbsLight: '#FAF0EB',
    macroFat: '#56667A',         // Slate blue-grey
    macroFatLight: '#EFF2F6',
    
    // Hydration
    water: '#3A748A',            // Deep slate-cyan mineral water
    waterLight: '#ECF4F7',
    
    // Overlay backdrop
    backdrop: 'rgba(28, 29, 27, 0.45)',
  },

  typography: {
    // Clean, modern scale with comfortable line heights
    display: {
      fontSize: 32,
      fontWeight: '700' as const,
      letterSpacing: -0.6,
      lineHeight: 38,
    },
    title1: {
      fontSize: 24,
      fontWeight: '700' as const,
      letterSpacing: -0.4,
      lineHeight: 30,
    },
    title2: {
      fontSize: 20,
      fontWeight: '600' as const,
      letterSpacing: -0.3,
      lineHeight: 26,
    },
    title3: {
      fontSize: 16,
      fontWeight: '600' as const,
      letterSpacing: -0.2,
      lineHeight: 22,
    },
    body: {
      fontSize: 15,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodyMedium: {
      fontSize: 15,
      fontWeight: '500' as const,
      lineHeight: 22,
    },
    callout: {
      fontSize: 13,
      fontWeight: '500' as const,
      lineHeight: 18,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    captionMedium: {
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
      shadowColor: '#1E201D',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    floating: {
      shadowColor: '#1E201D',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 6,
    },
  },
};
