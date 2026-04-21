export const C = {
  ink: '#1A1C22',
  ink90: '#2A2D35',
  ink70: '#4A4D55',
  slate: '#4A5568',
  slate60: '#6B7380',
  slate30: '#A8AEB8',
  sand: '#F0EAD6',
  sandDeep: '#E6DEC3',
  sandDeeper: '#D9CFAE',
  cloud: '#F8F9FA',
  paper: '#FBFAF5',
  rust: '#B73A2B',
  rustBg: '#F4DAD4',
  orange: '#C4601F',
  orangeBg: '#F4E1CF',
  amber: '#B58400',
  amberBg: '#F2E6BE',
  moss: '#2E7D32',
  mossBg: '#D6E7D3',
  hairline: '#D4CBA8',
  hairlineStrong: '#B8AE85',
} as const;

export const F = {
  body: "'Instrument Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
  serif: "'Instrument Serif', serif",
} as const;

export function scoreColor(n: number): string {
  if (n < 50) return C.rust;
  if (n < 75) return C.orange;
  return C.moss;
}

export function scoreLabel(n: number): string {
  if (n < 40) return 'HIGH RISK';
  if (n < 60) return 'ELEVATED';
  if (n < 75) return 'MODERATE';
  return 'LOW RISK';
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}
