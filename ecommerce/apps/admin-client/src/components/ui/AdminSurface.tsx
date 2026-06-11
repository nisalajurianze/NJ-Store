import { useRef, type ReactNode, type Ref, type WheelEvent as ReactWheelEvent } from 'react';
import { cn } from '@njstore/utils';

type AdminSurfaceTone = 'gold' | 'blue' | 'emerald' | 'rose' | 'slate';

export interface AdminPageHeaderMetaItem {
  label: string;
  value: ReactNode;
  support?: ReactNode;
  tone?: AdminSurfaceTone;
}

export interface AdminPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  meta?: AdminPageHeaderMetaItem[];
}

export interface AdminStatCardProps {
  label: string;
  value: ReactNode;
  support?: ReactNode;
  tone?: AdminSurfaceTone;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface AdminStatGridProps {
  items: AdminStatCardProps[];
  className?: string;
}

interface AdminSurfacePanelProps {
  children: ReactNode;
  className?: string;
  contentRef?: Ref<HTMLDivElement>;
  onContentWheel?: (event: ReactWheelEvent<HTMLDivElement>) => void;
}

const toneClasses: Record<AdminSurfaceTone, { eyebrow: string; accent: string; value: string; glow: string }> = {
  gold: {
    eyebrow: 'text-gold',
    accent: 'border-gold/20 bg-gold/[0.11]',
    value: 'text-white',
    glow: 'from-gold/18 via-gold/0 to-transparent'
  },
  blue: {
    eyebrow: 'text-blue-300',
    accent: 'border-blue-400/20 bg-blue-400/10',
    value: 'text-white',
    glow: 'from-blue-400/18 via-blue-400/0 to-transparent'
  },
  emerald: {
    eyebrow: 'text-emerald-300',
    accent: 'border-emerald-400/20 bg-emerald-400/10',
    value: 'text-white',
    glow: 'from-emerald-400/18 via-emerald-400/0 to-transparent'
  },
  rose: {
    eyebrow: 'text-red-300',
    accent: 'border-red-400/20 bg-red-400/10',
    value: 'text-white',
    glow: 'from-red-400/18 via-red-400/0 to-transparent'
  },
  slate: {
    eyebrow: 'text-gray-400',
    accent: 'border-white/10 bg-white/[0.04]',
    value: 'text-white',
    glow: 'from-white/10 via-white/0 to-transparent'
  }
};

const panelClassName =
  'admin-surface-panel relative overflow-visible border-0 bg-transparent p-0 shadow-none before:hidden after:hidden';

const adminFormFieldBaseClassName =
  'admin-form-field w-full border border-white/10 bg-[#111d33]/85 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-[border-color,background-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-gray-600 focus:border-gold/20 focus:bg-[#152442] focus:outline-none focus:ring-2 focus:ring-gold/5';

export const adminFormFieldClassName = cn(adminFormFieldBaseClassName, 'h-12 rounded-2xl px-4');

export const adminSelectFieldClassName = cn(adminFormFieldBaseClassName, 'h-12 rounded-xl px-4');

export const adminCompactFieldClassName = cn(adminFormFieldBaseClassName, 'h-11 rounded-xl px-3.5');

export const adminFilterSelectClassName = cn(adminSelectFieldClassName, 'mt-3');

export const adminTextareaFieldClassName = cn(adminFormFieldBaseClassName, 'min-h-[88px] rounded-xl px-3.5 py-3 leading-6');

export const AdminSurfacePanel = ({ children, className, contentRef, onContentWheel }: AdminSurfacePanelProps): JSX.Element => (
  <div className={cn(panelClassName, className)}>
    <div ref={contentRef} onWheel={onContentWheel} className="relative z-[1]">
      {children}
    </div>
  </div>
);

const AdminHeaderMetaCard = ({ label, value, support, tone = 'slate' }: AdminPageHeaderMetaItem): JSX.Element => {
  const styles = toneClasses[tone];

  return (
    <div className={cn('admin-header-meta-card relative min-w-0 overflow-hidden rounded-xl border px-2.5 py-2 shadow-[0_8px_18px_rgba(0,0,0,0.1)]', styles.accent)}>
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-r opacity-70', styles.glow)} />
      <div className="relative min-w-0">
        <div className="inline-flex max-w-full truncate rounded-full border border-white/10 bg-black/10 px-2 py-0.5 text-[8px] uppercase tracking-[0.18em] text-gray-200">
          {label}
        </div>
        <div className={cn('mt-1 min-w-0 break-words font-display text-[0.98rem] leading-tight sm:text-[1.05rem]', styles.value)}>{value}</div>
        {support ? <p className="mt-1 line-clamp-2 max-w-[20rem] text-[10px] leading-3.5 text-gray-300">{support}</p> : null}
      </div>
    </div>
  );
};

export const AdminPageHeader = ({
  eyebrow,
  title,
  description,
  action,
  meta = []
}: AdminPageHeaderProps): JSX.Element => (
  <div className="grid gap-2">
    <AdminSurfacePanel className="px-2 py-1 sm:px-2.5 sm:py-1.5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 max-w-4xl">
          <div className="inline-flex rounded-full border border-gold/20 bg-gold/10 px-2.5 py-0.5 text-[8px] uppercase tracking-[0.22em] text-gold">
            {eyebrow ?? 'Workspace'}
          </div>
          <div className="mt-2">
            <h1 className="break-words font-display text-[1.48rem] leading-tight text-white sm:text-[1.72rem]">{title}</h1>
            {description ? <p className="mt-1.5 max-w-3xl text-[13px] leading-5 text-gray-400">{description}</p> : null}
          </div>
        </div>
        {action || meta.length ? (
          <div className="grid min-w-0 gap-2 xl:w-[min(44rem,42vw)] xl:justify-items-end">
            {action ? <div className="flex min-w-0 max-w-full flex-wrap justify-start gap-2 xl:justify-end">{action}</div> : null}
            {meta.length ? (
              <div className={cn('grid w-full min-w-0 gap-2 sm:grid-cols-2', meta.length === 1 ? 'xl:max-w-[18rem]' : 'xl:max-w-[32rem]')}>
                {meta.map((item) => (
                  <AdminHeaderMetaCard key={item.label} {...item} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </AdminSurfacePanel>
  </div>
);

export const AdminStatCard = ({
  label,
  value,
  support,
  tone = 'slate',
  active = false,
  onClick,
  className
}: AdminStatCardProps): JSX.Element => {
  const styles = toneClasses[tone];
  const sharedClassName = cn(
    'relative min-w-0 overflow-hidden rounded-xl border p-2.5 text-left shadow-[0_8px_18px_rgba(0,0,0,0.1)] transition-[border-color,background-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
    active
      ? 'border-gold/30 bg-gold/[0.12] shadow-[0_12px_22px_rgba(212,175,55,0.12)]'
      : cn(styles.accent, 'hover:-translate-y-0.5 hover:border-white/15 hover:bg-white/[0.07]'),
    className
  );

  const content = (
    <>
      <div className={cn('pointer-events-none absolute inset-x-0 top-0 h-9 bg-gradient-to-r opacity-70', active ? 'from-gold/16 via-gold/0 to-transparent' : styles.glow)} />
      <div className="relative min-w-0">
        <p className={cn('truncate text-[8px] uppercase tracking-[0.18em]', active ? 'text-gold' : styles.eyebrow)}>{label}</p>
        <div className={cn('mt-1 min-w-0 break-words font-display text-[1rem] leading-tight sm:text-[1.12rem]', styles.value)}>{value}</div>
        {support ? <p className="mt-1 line-clamp-2 text-[10px] leading-3.5 text-gray-300">{support}</p> : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" aria-pressed={active} onClick={onClick} className={sharedClassName}>
        {content}
      </button>
    );
  }

  return <div className={sharedClassName}>{content}</div>;
};

export const AdminStatGrid = ({ items, className }: AdminStatGridProps): JSX.Element => (
  <div className={cn('grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4', className)}>
    {items.map((item) => (
      <AdminStatCard key={item.label} {...item} />
    ))}
  </div>
);

export const AdminControlPanel = ({ children, className }: AdminSurfacePanelProps): JSX.Element => {
  const controlPanelRef = useRef<HTMLDivElement | null>(null);

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>): void => {
    if (event.ctrlKey) {
      return;
    }

    const panelElement = controlPanelRef.current;
    if (!panelElement) {
      return;
    }

    let sibling = panelElement.parentElement?.nextElementSibling ?? null;
    let scrollArea: HTMLDivElement | null = null;

    while (sibling) {
      scrollArea = sibling.querySelector('[data-admin-grid-scroll="true"]') as HTMLDivElement | null;
      if (scrollArea) {
        break;
      }
      sibling = sibling.nextElementSibling;
    }

    if (!scrollArea) {
      return;
    }

    const deltaY =
      event.deltaMode === 1
        ? event.deltaY * 16
        : event.deltaMode === 2
          ? event.deltaY * scrollArea.clientHeight
          : event.deltaY;

    if (deltaY === 0) {
      return;
    }

    const maxScrollTop = scrollArea.scrollHeight - scrollArea.clientHeight;
    if (maxScrollTop <= 0) {
      return;
    }

    const nextScrollTop = Math.max(0, Math.min(maxScrollTop, scrollArea.scrollTop + deltaY));
    if (nextScrollTop === scrollArea.scrollTop) {
      return;
    }

    scrollArea.scrollTop = nextScrollTop;
    event.preventDefault();
  };

  return (
    <AdminSurfacePanel className={cn('p-2.5 sm:p-3', className)} contentRef={controlPanelRef} onContentWheel={handleWheel}>
      <div className="grid gap-2.5">{children}</div>
    </AdminSurfacePanel>
  );
};

export const AdminInlineNotice = ({ children, className }: AdminSurfacePanelProps): JSX.Element => (
  <div
    className={cn(
      'admin-inline-notice flex flex-wrap items-center gap-2 rounded-[18px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] px-3.5 py-2.5 text-[13px] text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]',
      className
    )}
  >
    {children}
  </div>
);
