export const T = {
  bg0: '#0D0F14',
  bg1: '#161B24',
  bg2: '#1C2230',
  bg3: '#232B3C',
  bg4: '#2F3950',
  border1: '#252D3D',
  borderStrong: '#3A4660',
  fg0: '#FFFFFF',
  fg1: '#C9D1DE',
  fg2: '#8B96A8',
  fg3: '#5C667A',
  accent: '#4A90E2',
  accentSoft: 'rgba(74,144,226,0.16)',
  ok: '#34C98A',
  warn: '#F5A623',
  err: '#E8524A',
  okBg: 'rgba(52,201,138,0.15)',
  accBg: 'rgba(74,144,226,0.15)',
  pauseBg: 'rgba(92,102,122,0.20)',
  warnBg: 'rgba(245,166,35,0.15)',
  errBg: 'rgba(232,82,74,0.15)',
} as const;

export const FONT = {
  sans: undefined as unknown as string, // resolved at runtime via System font
  mono: 'monospace' as const,
} as const;

export const AGENT_PALETTE = [
  '#4A90E2', '#7AB7E8', '#A06CD5', '#34C98A', '#E8856A',
  '#3A6BB5', '#F5A623', '#C078E0', '#2BA774', '#5BA0E8',
  '#E8524A', '#D08F3F',
] as const;
