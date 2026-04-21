import { C, F, scoreColor, scoreLabel } from '../lib/tokens';

interface ScoreCardProps {
  label: string;
  value: number;
  interpretation?: string;
  primary?: boolean;
}

export function ScoreCard({ label, value, interpretation, primary = false }: ScoreCardProps) {
  const col = scoreColor(value);

  return (
    <div style={{
      background: primary ? C.ink : C.paper,
      color: primary ? C.sand : C.ink,
      border: `1px solid ${primary ? C.ink : C.hairline}`,
      padding: primary ? 24 : 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      minHeight: primary ? 180 : 140,
    }}>
      <div style={{
        fontFamily: F.mono,
        fontSize: 10,
        letterSpacing: 0.8,
        color: primary ? C.sandDeeper : C.slate60,
        fontWeight: 600,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: F.mono,
          fontSize: primary ? 72 : 44,
          fontWeight: 500,
          color: col,
          letterSpacing: -2,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </span>
        <span style={{
          fontFamily: F.mono,
          fontSize: primary ? 20 : 14,
          color: primary ? C.slate30 : C.slate60,
        }}>
          /100
        </span>
      </div>

      {interpretation && (
        <div style={{
          fontSize: primary ? 13 : 12,
          lineHeight: 1.4,
          color: primary ? C.sandDeeper : C.ink70,
          fontStyle: 'italic',
        }}>
          {interpretation}
        </div>
      )}

      {primary && (
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontFamily: F.mono,
            fontSize: 10,
            letterSpacing: 0.8,
            color: C.sandDeeper,
            fontWeight: 600,
          }}>
            RISK LEVEL
          </span>
          <span style={{
            fontFamily: F.mono,
            fontSize: 10,
            letterSpacing: 0.8,
            fontWeight: 700,
            padding: '3px 8px',
            background: value < 50 ? C.rust : C.sand,
            color: value < 50 ? '#fff' : C.ink,
          }}>
            {scoreLabel(value)}
          </span>
        </div>
      )}
    </div>
  );
}
