import type { ReactNode } from 'react';

interface CampaignEditorSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  summary: string;
  action?: ReactNode;
  children: ReactNode;
}

export const CampaignEditorSection = ({
  eyebrow,
  title,
  description,
  summary,
  action,
  children
}: CampaignEditorSectionProps): JSX.Element => (
  <section className="space-y-4 rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-3">
      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{eyebrow}</p>
        <div>
          <h3 className="font-display text-[1.35rem] text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
          <p className="mt-2 text-xs leading-5 text-gray-500">{summary}</p>
        </div>
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
    {children}
  </section>
);
