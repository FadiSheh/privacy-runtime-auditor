interface ScoreCardProps {
  label: string;
  value: number;
}

export function ScoreCard({ label, value }: ScoreCardProps) {
  return (
    <div className="rounded-xl border border-black/10 bg-white/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ink/50">{label}</p>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-3xl font-semibold text-ink">{value}</span>
        <span className="pb-1 text-sm text-ink/50">/ 100</span>
      </div>
    </div>
  );
}
