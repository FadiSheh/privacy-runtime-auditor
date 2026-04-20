const styles = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  info: 'bg-slate-100 text-slate-700 border-slate-200',
} as const;

export function SeverityBadge({ severity }: { severity: keyof typeof styles }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${styles[severity]}`}>{severity}</span>;
}
