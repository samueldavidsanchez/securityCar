// vivancar brand palette — green #9AB055 accent on near-black #1D1D1B.
export const colors = {
  bgBase: '#141412',
  bgSurface: '#1D1D1B',
  bgElevated: '#2A2A27',
  border: '#3A3A36',
  textPrimary: '#FAFAF7',
  textSecondary: '#A8A8A0',
  textMuted: '#71716A',
  accent: '#9AB055',
  accentHover: '#86A043',
  onAccent: '#1D1D1B',
  success: '#9AB055',
  warning: '#E0A03A',
  danger: '#E5533D',
} as const

export type Colors = typeof colors
