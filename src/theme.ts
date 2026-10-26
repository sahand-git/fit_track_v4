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

// Cross-platform font family resolution that works seamlessly in React Native, Expo Web, and Node test runners
const isWeb = typeof window !== 'undefined' && typeof (window as any).document !== 'undefined';
const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

const serifFont = isWeb
  ? 'Newsreader, Georgia, "Times New Roman", serif'
  : isIOS
  ? 'Georgia'
  : 'serif';

const sansFont = isWeb
  ? 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  : isIOS
  ? 'System'
  : 'sans-serif';

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
    textMuted: '#54635B',        // Muted sage grey (passes WCAG AA 4.5:1 against warm ivory)
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

    // Pure Neutrals
    white: '#FFFFFF',
    black: '#000000',
    shadow: '#000000',

    // Amber / Warm Gold / Warning
    amber: '#D97706',
    amberLight: '#FEF3C7',
    amberBorder: '#FDE68A',
    amberDark: '#92400E',
    amberDeep: '#78350F',
    amberText: '#B45309',
    gold: '#D4AF37',
    goldLight: '#F5E6C8',
    goldDark: '#E8B86D',

    // Orange / Terracotta variations
    orange: '#EA580C',
    orangeLight: '#FFF7ED',
    orangeWarmLight: '#FFEDD5',
    orangeBorder: '#FDBA74',
    orangeDeep: '#C2410C',
    terracottaWarm: '#D45D3B',
    terracottaWarmLight: '#FDF3EE',
    terracottaWarmBorder: '#F8DFD4',
    terracottaDark: '#D95338',
    terracottaLightWash: '#FDF2EE',
    terracottaWashBorder: '#F5C6B9',
    terracottaBadge: '#C85A32',

    // Emerald / Green / Success
    emerald: '#10B981',
    emeraldDark: '#059669',
    emeraldLight: '#ECFDF5',
    emeraldBorder: '#A7F3D0',
    green: '#16A34A',
    greenLight: '#F0FDF4',
    greenDark: '#166534',
    greenDeep: '#14532D',
    greenMint: '#34D399',
    forestDeep: '#285C4D',
    forestAlt: '#2D6A4F',
    forestWash: '#EBF5F0',
    forestBorder: '#B8DFCB',
    forestKeyLight: '#EEF6F2',
    forestKeyBorder: '#C7E4D4',
    forestKeyPill: '#D1EBDC',
    forestKeyText: '#2C5A48',

    // Crimson / Red / Danger
    crimson: '#EF4444',
    crimsonDark: '#DC2626',
    crimsonLight: '#FDECEC',
    crimsonBorder: '#FACDCD',
    roseLight: '#FFF1F2',
    rose: '#E11D48',
    redLight: '#FEF2F2',
    redBorder: '#FECACA',
    dangerMuted: '#7A221F',
    dangerDeep: '#9C3A36',
    dangerWashBorder: '#FACBC8',
    dangerSubtleBorder: '#F5D3D1',
    dangerSoftLight: '#FDE2E0',
    dangerLightWash: '#FDF3F2',
    dangerOutline: '#F8B4B4',
    dangerBannerBg: '#FDEDED',

    // Blue / Sky / Indigo / Purple
    sky: '#0EA5E9',
    skyLight: '#E0F2FE',
    skyDark: '#0369A1',
    blue: '#2563EB',
    blueLight: '#EFF6FF',
    cyan: '#0891B2',
    cyanLight: '#ECFEFF',
    purple: '#7C3AED',
    purpleLight: '#F5F3FF',
    indigo: '#6366F1',
    indigoDark: '#4338CA',

    // Slate / Neutral Grays
    slateNavy: '#0F172A',
    slateBorder: '#E2E8F0',
    slateMuted: '#94A3B8',
    slateDark: '#475569',
    slateBody: '#4B5563',
    grayLight: '#F1F5F9',
    grayBorder: '#CBD5E1',
    graySubtle: '#F3F4F6',
    grayOutline: '#E5E7EB',
    grayMutedBorder: '#D1D5DB',
    parchmentSkeleton: '#EBE5D8',
    creamMuted: '#FFFBEB',

    // Micronutrient RDA Specific
    nutrientVitaminA: '#F59E0B',
    nutrientVitaminC: '#F97316',
    nutrientVitaminD: '#EAB308',
    nutrientVitaminB12: '#F43F5E',
    nutrientCalcium: '#0EA5E9',
    nutrientIron: '#EF4444',
    nutrientPotassium: '#10B981',
    nutrientMagnesium: '#6366F1',
    nutrientZinc: '#14B8A6',
    nutrientSugar: '#EC4899',
    nutrientSodium: '#6B7280',
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

export const darkTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    // Canvas & Surfaces — Editorial deep charcoal slate
    background: '#121514',
    surface: '#1B211E',
    surfaceSubtle: '#242C28',
    surfaceElevated: '#212925',

    // Dividers & Outlines
    border: '#2E3933',
    borderStrong: '#3D4C44',
    borderFocus: '#82B29A',

    // Typography
    textPrimary: '#F3EFE6',      // Warm ivory contrast > 12:1
    textSecondary: '#A9B7AE',    // Contrast > 5.5:1
    textMuted: '#7D8E84',        // Contrast > 4.5:1
    textInverted: '#121514',

    // Primary Brand
    primary: '#6B9E83',          // Soft forest sage (high contrast on dark)
    primaryHover: '#82B29A',
    primaryLight: '#1C2922',
    primaryBorder: '#365142',

    // Secondary
    secondary: '#92A89A',
    secondaryLight: '#1F2923',
    secondaryBorder: '#384B40',

    // Accent Terracotta
    accent: '#E0856B',
    accentLight: '#2C1E1B',
    accentBorder: '#54342C',

    // Functional
    danger: '#EF6666',
    dangerLight: '#2F1A1A',
    warning: '#E8A84C',
    warningLight: '#2F2312',
    success: '#6B9E83',

    macroProtein: '#6B9E83',
    macroProteinLight: '#1C2922',
    macroCarbs: '#E0856B',
    macroCarbsLight: '#2C1E1B',
    macroFat: '#92A89A',
    macroFatLight: '#1F2923',

    water: '#5A94A3',
    waterLight: '#18272C',

    white: '#FFFFFF',
    black: '#000000',
    shadow: '#000000',
    backdrop: 'rgba(0, 0, 0, 0.75)',

    // Amber / Warm Gold
    amber: '#E8A84C',
    amberLight: '#2C2210',
    amberBorder: '#523F1C',
    amberDark: '#F5BE6B',
    amberDeep: '#FDE68A',
    amberText: '#F3BE6D',
    gold: '#E5C058',
    goldLight: '#2E2714',
    goldDark: '#D4AF37',

    // Orange / Terracotta
    orange: '#F97316',
    orangeLight: '#2C1C12',
    orangeWarmLight: '#2D1E16',
    orangeBorder: '#5A321E',
    orangeDeep: '#FB923C',
    terracottaWarm: '#E07558',
    terracottaWarmLight: '#2D1B16',
    terracottaWarmBorder: '#552C22',
    terracottaDark: '#E07558',
    terracottaLightWash: '#2D1B16',
    terracottaWashBorder: '#552C22',
    terracottaBadge: '#E0856B',

    // Emerald / Green
    emerald: '#34D399',
    emeraldDark: '#10B981',
    emeraldLight: '#132A20',
    emeraldBorder: '#234C39',
    green: '#4ADE80',
    greenLight: '#142B1D',
    greenDark: '#86EFAC',
    greenDeep: '#BBF7D0',
    greenMint: '#6EE7B7',
    forestDeep: '#82B29A',
    forestAlt: '#4E876B',
    forestWash: '#1B2C23',
    forestBorder: '#2E4C3D',
    forestKeyLight: '#1A2921',
    forestKeyBorder: '#2B4638',
    forestKeyPill: '#22382D',
    forestKeyText: '#A3C7B3',

    // Red / Crimson / Rose
    crimson: '#F87171',
    crimsonDark: '#EF4444',
    crimsonLight: '#2E1717',
    crimsonBorder: '#542626',
    roseLight: '#2E1418',
    rose: '#FB7185',
    redLight: '#2F1818',
    redBorder: '#572727',
    dangerMuted: '#FCA5A5',
    dangerDeep: '#F87171',
    dangerWashBorder: '#542828',
    dangerSubtleBorder: '#451F1F',
    dangerSoftLight: '#2C1717',
    dangerLightWash: '#2C1717',
    dangerOutline: '#5A2B2B',
    dangerBannerBg: '#2D1717',

    // Blue / Sky / Indigo / Purple
    sky: '#38BDF8',
    skyLight: '#132836',
    skyDark: '#7DD3FC',
    blue: '#60A5FA',
    blueLight: '#16233B',
    cyan: '#22D3EE',
    cyanLight: '#102A33',
    purple: '#A78BFA',
    purpleLight: '#211B38',
    indigo: '#818CF8',
    indigoDark: '#6366F1',

    // Slate / Grays
    slateNavy: '#0F172A',
    slateBorder: '#334155',
    slateMuted: '#64748B',
    slateDark: '#94A3B8',
    slateBody: '#CBD5E1',
    grayLight: '#1E293B',
    grayBorder: '#334155',
    graySubtle: '#1E2522',
    grayOutline: '#313C36',
    grayMutedBorder: '#3D4C44',
    parchmentSkeleton: '#26312B',
    creamMuted: '#242018',

    // Micronutrient RDA Specific
    nutrientVitaminA: '#FBBF24',
    nutrientVitaminC: '#FB923C',
    nutrientVitaminD: '#FACC15',
    nutrientVitaminB12: '#FB7185',
    nutrientCalcium: '#38BDF8',
    nutrientIron: '#F87171',
    nutrientPotassium: '#34D399',
    nutrientMagnesium: '#818CF8',
    nutrientZinc: '#2DD4BF',
    nutrientSugar: '#F472B6',
    nutrientSodium: '#9CA3AF',
  },
};

export type ThemeType = typeof theme;
export type ThemeMode = 'system' | 'light' | 'dark';

export function getTheme(mode: ThemeMode = 'light', systemScheme?: 'light' | 'dark' | null): ThemeType {
  if (mode === 'dark') return darkTheme;
  if (mode === 'light') return theme;
  return systemScheme === 'dark' ? darkTheme : theme;
}
