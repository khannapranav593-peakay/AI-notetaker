import { ColorPalette, ThemeName } from '../types';

export const THEMES: Record<ThemeName, ColorPalette> = {
  ocean: {
    name: 'ocean',
    label: 'Ocean',
    primary: '#0A84FF',
    accent: '#FF9500',
    background: '#FFFFFF',
    surface: '#F2F2F7',
    surfaceElevated: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#3C3C43',
    textTertiary: '#8E8E93',
    border: '#E5E5EA',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9500',
    cardGradientStart: '#0A84FF',
    cardGradientEnd: '#0055B3',
  },
  mint: {
    name: 'mint',
    label: 'Mint',
    primary: '#00C896',
    accent: '#FF6B6B',
    background: '#FFFFFF',
    surface: '#F0FAF7',
    surfaceElevated: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#3C3C43',
    textTertiary: '#8E8E93',
    border: '#D1F0E7',
    error: '#FF3B30',
    success: '#00C896',
    warning: '#FF9500',
    cardGradientStart: '#00C896',
    cardGradientEnd: '#008F6B',
  },
  lavender: {
    name: 'lavender',
    label: 'Lavender',
    primary: '#AF52DE',
    accent: '#FF9F0A',
    background: '#FFFFFF',
    surface: '#F8F0FF',
    surfaceElevated: '#FFFFFF',
    text: '#1C1C1E',
    textSecondary: '#3C3C43',
    textTertiary: '#8E8E93',
    border: '#E8D4F8',
    error: '#FF3B30',
    success: '#34C759',
    warning: '#FF9F0A',
    cardGradientStart: '#AF52DE',
    cardGradientEnd: '#7C2FAA',
  },
  graphite: {
    name: 'graphite',
    label: 'Graphite',
    primary: '#8E8E93',
    accent: '#FF9F0A',
    background: '#1C1C1E',
    surface: '#2C2C2E',
    surfaceElevated: '#3A3A3C',
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textTertiary: '#8E8E93',
    border: '#3A3A3C',
    error: '#FF453A',
    success: '#32D74B',
    warning: '#FF9F0A',
    cardGradientStart: '#3A3A3C',
    cardGradientEnd: '#2C2C2E',
  },
};

// Speaker color assignments (distinct enough for up to 6 speakers)
export const SPEAKER_COLORS = [
  '#0A84FF', // blue
  '#FF9500', // orange
  '#34C759', // green
  '#AF52DE', // purple
  '#FF2D55', // pink
  '#5AC8FA', // teal
];

export const getSpeakerColor = (index: number): string =>
  SPEAKER_COLORS[index % SPEAKER_COLORS.length];
