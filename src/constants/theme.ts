export const colors = {
  greenDark: '#14532D',
  greenMain: '#2E7D32',
  blueMain: '#1D4ED8',
  amberMain: '#D97706',
  redMain: '#DC2626',
  ink: '#1F2937',
  muted: '#5B6B5F',
  bg: '#F9FBF8',
  card: '#FFFFFF',
  border: '#D6E5D4',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
} as const;

export type StatusColorKey = 'green' | 'yellow' | 'red';

export const statusColorHex: Record<StatusColorKey, string> = {
  green: colors.greenMain,
  yellow: colors.amberMain,
  red: colors.redMain,
};

export const roleAccent = {
  grower: colors.greenMain,
  retailer: colors.blueMain,
} as const;
