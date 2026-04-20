import type { PropsWithChildren, ReactNode } from 'react';

interface PanelProps extends PropsWithChildren {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}

export function Panel({ title, eyebrow, action, className = '', children }: PanelProps) {
  return (
    <section className={`panel shadow-panel rounded-xl border border-black/10 ${className}`}>
      {(title || eyebrow || action) && (
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
          <div>
            {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rust">{eyebrow}</p> : null}
            {title ? <h2 className="mt-1 text-xl font-semibold text-ink">{title}</h2> : null}
          </div>
          {action}
        </div>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}
