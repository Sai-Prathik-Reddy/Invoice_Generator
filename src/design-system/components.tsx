import React from 'react';
import { cn } from '../lib/utils';
import { formatMoney } from '../core/format';

export function IngenLogo({
  size = 32,
  showWordmark = false,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-sm"
      >
        <defs>
          <linearGradient id="ingen_bg" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#121024" />
            <stop offset="55%" stopColor="#271B5C" />
            <stop offset="100%" stopColor="#5B3FD9" />
          </linearGradient>
          <linearGradient id="ingen_gold" x1="24" y1="20" x2="104" y2="108" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F7E3AA" />
            <stop offset="50%" stopColor="#E8C27A" />
            <stop offset="100%" stopColor="#B8892E" />
          </linearGradient>
        </defs>
        <rect width="128" height="128" rx="28" fill="url(#ingen_bg)" />
        <rect
          x="2"
          y="2"
          width="124"
          height="124"
          rx="26"
          stroke="url(#ingen_gold)"
          strokeOpacity="0.4"
          strokeWidth="2.5"
        />
        <path
          d="M36 26H76L94 44V98C94 101.314 91.3137 104 88 104H36C32.6863 104 30 101.314 30 98V32C30 28.6863 32.6863 26 36 26Z"
          stroke="url(#ingen_gold)"
          strokeWidth="6.5"
          strokeLinejoin="round"
        />
        <path
          d="M74 26V42C74 44.2091 75.7909 46 78 46H94"
          stroke="url(#ingen_gold)"
          strokeWidth="6.5"
          strokeLinejoin="round"
        />
        <path
          d="M46 54H76M46 66H76M46 54H58C64.6274 54 70 59.3726 70 66C70 72.6274 64.6274 78 58 78H46L68 94"
          stroke="url(#ingen_gold)"
          strokeWidth="6.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark ? (
        <div className="flex flex-col leading-none">
          <span className="font-display text-base font-bold tracking-wider text-foreground">
            INGEN
          </span>
          <span className="text-[10px] font-medium tracking-widest uppercase text-gold">
            Invoice Studio
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div
        className="absolute -top-32 -right-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: 'var(--aurora-1)' }}
      />
      <div
        className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full blur-3xl"
        style={{ background: 'var(--aurora-2)' }}
      />
    </div>
  );
}

export function GlassCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-2xl before:bg-gradient-to-r before:from-transparent before:via-white/15 before:to-transparent',
        onClick && 'cursor-pointer hover:border-primary/40 hover:shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}

export function MoneyText({
  value,
  className,
  symbol = true,
}: {
  value: string | number | undefined | null;
  className?: string;
  symbol?: boolean;
}) {
  return (
    <span className={cn('tabular-nums font-medium tracking-tight', className)}>
      {formatMoney(value, { symbol })}
    </span>
  );
}

export type PillStatus =
  | 'draft'
  | 'finalized'
  | 'cancelled'
  | 'paid'
  | 'partial'
  | 'unpaid'
  | 'na';

const STATUS_STYLES: Record<PillStatus, { label: string; classes: string }> = {
  paid: {
    label: 'Paid',
    classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  finalized: {
    label: 'Finalized',
    classes: 'bg-primary/15 text-primary border-primary/30',
  },
  partial: {
    label: 'Partial',
    classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  unpaid: {
    label: 'Unpaid',
    classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  draft: {
    label: 'Draft',
    classes: 'bg-muted text-muted-foreground border-border',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
  na: {
    label: 'Issued',
    classes: 'bg-primary/15 text-primary border-primary/30',
  },
};

export function StatusPill({ status, className }: { status: PillStatus; className?: string }) {
  const cfg = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        cfg.classes,
        className
      )}
    >
      {cfg.label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  isMoney = true,
  sublabel,
  icon,
  accentGold = false,
}: {
  label: string;
  value: string | number;
  isMoney?: boolean;
  sublabel?: string;
  icon?: React.ReactNode;
  accentGold?: boolean;
}) {
  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon ? (
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl border',
              accentGold
                ? 'border-gold/30 bg-gold-surface text-gold'
                : 'border-primary/25 bg-primary/10 text-primary'
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
      <div className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
        {isMoney ? <MoneyText value={value} /> : <span className="tabular-nums">{value}</span>}
      </div>
      {sublabel ? (
        <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
      ) : null}
    </GlassCard>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'gold' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}) {
  const variantClasses = {
    primary:
      'bg-gradient-to-r from-[#7C5CFF] to-[#5B3FD9] text-white shadow-sm hover:opacity-95 border border-white/15',
    gold:
      'bg-gradient-to-r from-[#E8C27A] to-[#C69642] text-[#12111A] font-semibold shadow-sm hover:opacity-95',
    secondary: 'bg-secondary text-secondary-foreground hover:opacity-90 border border-border',
    outline: 'border border-border bg-transparent text-foreground hover:bg-muted/60',
    ghost: 'bg-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground',
    danger: 'bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25',
  }[variant];

  const sizeClasses = {
    sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
    md: 'h-10 px-4 text-sm rounded-xl gap-2',
    lg: 'h-11 px-5 text-sm rounded-xl gap-2.5',
  }[size];

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        variantClasses,
        sizeClasses,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-10 w-full rounded-xl border border-input bg-background/60 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'flex min-h-[76px] w-full rounded-xl border border-input bg-background/60 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-xl border border-input bg-popover px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Modal({
  open,
  onClose,
  title,
  actions,
  children,
  maxWidth = 'max-w-5xl',
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        className={cn(
          'relative w-full rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[92vh]',
          maxWidth
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-border bg-muted/20">
          <div className="font-display text-base font-bold text-foreground">{title}</div>
          <div className="flex items-center gap-2">
            {actions}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer text-sm font-bold"
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

export function TruncatedTextWithReadMore({
  text,
  maxChars = 110,
  className,
}: {
  text: string;
  maxChars?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = React.useState(false);

  if (!text) return null;
  if (text.length <= maxChars) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={cn('inline', className)}>
      <span>{expanded ? text : `${text.slice(0, maxChars)}…`}</span>{' '}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded((v) => !v);
        }}
        className="inline font-semibold text-gold hover:underline cursor-pointer text-xs"
      >
        {expanded ? 'Read less' : 'Read more'}
      </button>
    </span>
  );
}

export function CloudTooltip({
  title,
  content,
  children,
  placement = 'top',
  showInfoIcon = true,
  className,
}: {
  title?: string;
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: 'top' | 'bottom';
  showInfoIcon?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      className={cn('relative inline-flex items-center group', className)}
    >
      {children}
      {showInfoIcon && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen((prev) => !prev);
          }}
          aria-label="More information"
          title="Click to view explanation"
          className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold bg-gold/15 text-gold border border-gold/40 hover:bg-gold/30 hover:scale-110 transition-all cursor-pointer shrink-0"
        >
          ℹ
        </button>
      )}

      {/* Cloud Speech Bubble Popover */}
      {isOpen && (
        <div
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'absolute z-50 w-72 max-w-[85vw] p-3.5 rounded-2xl bg-slate-950/95 text-slate-100 border border-gold/50 shadow-2xl backdrop-blur-md text-xs leading-relaxed animate-in fade-in zoom-in-95 duration-150 pointer-events-auto select-none',
            placement === 'top'
              ? 'bottom-full mb-2.5 left-1/2 -translate-x-1/2'
              : 'top-full mt-2.5 left-1/2 -translate-x-1/2'
          )}
        >
          {/* Cloud Bubble Nub Tail */}
          <div
            className={cn(
              'absolute left-1/2 -translate-x-1/2 w-0 h-0 border-solid',
              placement === 'top'
                ? 'top-full border-t-8 border-t-slate-950 border-x-8 border-x-transparent border-b-0'
                : 'bottom-full border-b-8 border-b-slate-950 border-x-8 border-x-transparent border-t-0'
            )}
          />
          {title && (
            <div className="font-display font-bold text-gold flex items-center gap-1.5 mb-1.5 pb-1 border-b border-border/50 text-xs">
              <span className="text-sm">☁️</span>
              <span>{title}</span>
            </div>
          )}
          <div className="text-slate-300 text-[11px] leading-relaxed">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

export { BrandColorCustomizer } from './BrandColorCustomizer';
export { BarcodeScannerModal, playScanFeedback } from './BarcodeScannerModal';
export { CatalogItemPickerModal } from './CatalogItemPickerModal';
export { SoundboxSettingsModal } from './SoundboxSettingsModal';
export { CheckoutPaymentModal } from './CheckoutPaymentModal';




