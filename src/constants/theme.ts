/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F5F5F5',
    /** Light-orange tint for selected state (chip, active nav pill). */
    backgroundSelected: '#FFE4CC',
    textSecondary: '#60646C',
    /** Primary orange — CTA fills, active nav icon tint, progress. Fill/tint only, never text on a light bg. */
    accent: '#FF7A1A',
    /** Foreground on `accent` fills. Dark on purpose: #1A1A1A on #FF7A1A ≈ 6.7:1 (white would be 2.6:1). */
    onAccent: '#1A1A1A',
    /** Accent-coloured *text* on a light bg (e.g. linkPrimary). Darker than `accent`: #C2410C on white ≈ 5.2:1. */
    accentText: '#C2410C',
    /** Error/validation text on a light bg: #B91C1C on white ≈ 6.5:1. */
    error: '#B91C1C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#3A2412',
    textSecondary: '#B0B4BA',
    accent: '#FF8A3D',
    onAccent: '#000000',
    accentText: '#FDBA74',
    /** Error/validation text on a dark bg: #F87171 on black ≈ 7.6:1. */
    error: '#F87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Corner radii. Cards/large blocks use `card`; menu rows and small pills use `row`. */
export const Radius = {
  card: 20,
  row: 14,
  pill: 999,
} as const;

/** Soft, low-contrast lift for raised surfaces (cards, nav bars). */
export const Elevation = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
