import { createContext, useCallback, useContext, useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, Search, X, XCircle } from 'lucide-react';
import { cx, initials } from '../lib/format';

// ---------------- Button ----------------
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'brand';
export function Button({ variant = 'secondary', size = 'md', loading, icon, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean; icon?: ReactNode }) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-[10px] font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]';
  const sizes = { sm: 'h-8 px-3 text-[13px]', md: 'h-[38px] px-3.5 text-sm' };
  const variants: Record<Variant, string> = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white',
    brand: 'bg-brand-500 text-zinc-900 hover:bg-brand-400',
    secondary: 'border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)]',
    ghost: 'text-[var(--text-2)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button className={cx(base, sizes[size], variants[variant], className)} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
export function IconButton({ label, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={cx('inline-flex size-9 items-center justify-center rounded-[10px] text-[var(--text-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)] disabled:opacity-40', className)} {...rest}>{children}</button>;
}

// ---------------- Form fields ----------------
export function Field({ label, hint, error, children, className }: { label?: string; hint?: ReactNode; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="label">{label}</span>}
      {children}
      {error ? <span className="mt-1.5 block text-xs text-red-600">{error}</span> : hint ? <span className="mt-1.5 block text-xs faint">{hint}</span> : null}
    </label>
  );
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={cx('input', props.className)} />; }
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea rows={3} {...props} className={cx('input', props.className)} />; }
export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx('input appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-9', props.className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", ...props.style }}>{children}</select>;
}
export function SearchInput({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 faint" />
      <input className="input pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type="search" />
    </div>
  );
}
export function Segmented<T extends string>({ value, options, onChange, size = 'md' }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cx('rounded-[8px] px-3 font-medium transition-colors', size === 'sm' ? 'h-7 text-[12.5px]' : 'h-8 text-[13px]', value === o.value ? 'bg-[var(--surface)] text-[var(--text)] shadow-sm' : 'text-[var(--text-2)] hover:text-[var(--text)]')}>{o.label}</button>
      ))}
    </div>
  );
}
export function Tabs<T extends string>({ value, tabs, onChange }: { value: T; tabs: { value: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <div className="no-print -mb-px flex gap-1 overflow-x-auto border-b border-[var(--border)]" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} onClick={() => onChange(t.value)} className={cx('relative h-10 shrink-0 px-3 text-[13.5px] font-medium transition-colors', value === t.value ? 'text-[var(--text)]' : 'text-[var(--text-2)] hover:text-[var(--text)]')}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 text-[11px] faint">{t.count}</span>}
          {value === t.value && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--text)]" />}
        </button>
      ))}
    </div>
  );
}

// ---------------- Display ----------------
type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'violet';
export function Badge({ tone = 'neutral', children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  const t: Record<Tone, string> = {
    neutral: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    red: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400',
    blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400',
  };
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium', t[tone])}>{dot && <span className="size-1.5 rounded-full bg-current" />}{children}</span>;
}
export function Card({ children, className, title, action, padded = true }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode; padded?: boolean }) {
  return (
    <section className={cx('card', className)}>
      {(title || action) && <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-1"><h2 className="text-[14px] font-semibold">{title}</h2>{action}</header>}
      <div className={padded ? 'p-5 pt-3' : ''}>{children}</div>
    </section>
  );
}
export function StatCard({ label, value, sub, icon, tone = 'neutral', onClick }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode; tone?: Tone; onClick?: () => void }) {
  const ic: Record<Tone, string> = { neutral: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300', green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400', amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400', red: 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400', blue: 'bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400', violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400' };
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick} className={cx('card flex w-full items-start gap-3 bg-[var(--surface)] p-4 text-left text-[var(--text)]', onClick && 'transition-colors hover:border-[var(--border-strong)]')}>
      {icon && <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-[10px] [&>svg]:size-[18px]', ic[tone])}>{icon}</span>}
      <span className="min-w-0">
        <span className="block text-[12.5px] muted">{label}</span>
        <span className="num mt-0.5 block truncate text-[21px] font-semibold tracking-tight">{value}</span>
        {sub && <span className="mt-0.5 block truncate text-[12px] faint">{sub}</span>}
      </span>
    </Comp>
  );
}
export function Avatar({ name, src, size = 36 }: { name: string; src?: string; size?: number }) {
  return src
    ? <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
    : <span className="flex shrink-0 items-center justify-center rounded-full bg-zinc-100 font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" style={{ width: size, height: size, fontSize: size * 0.36 }}>{initials(name)}</span>;
}
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>{description && <p className="mt-0.5 text-[13.5px] muted">{description}</p>}</div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-[var(--surface-2)] faint [&>svg]:size-5">{icon}</span>}
      <p className="font-medium">{title}</p>
      {text && <p className="mt-1 max-w-sm text-[13px] muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return <EmptyState icon={<AlertTriangle />} title="Something went wrong" text={text} action={onRetry && <Button onClick={onRetry}>Try again</Button>} />;
}
export function Spinner({ label }: { label?: string }) { return <div className="flex items-center justify-center gap-2 py-10 text-sm muted"><Loader2 className="size-4 animate-spin" />{label}</div>; }
export function TableWrap({ children }: { children: ReactNode }) { return <div className="overflow-x-auto">{children}</div>; }
export function Progress({ value, tone = 'neutral' }: { value: number; tone?: 'neutral' | 'green' | 'amber' | 'red' }) {
  const c = { neutral: 'bg-zinc-800 dark:bg-zinc-200', green: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' }[tone];
  return <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]"><div className={cx('h-full rounded-full', c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

// ---------------- Modal ----------------
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input:not([type=hidden]),select,textarea')?.focus(), 30);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl' }[size];
  return (
    <div className="anim-fade fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" className={cx('anim-rise anim-rise-sheet flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:rounded-2xl', w)}>
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0"><h2 className="text-[15px] font-semibold">{title}</h2>{description && <p className="mt-0.5 text-[13px] muted">{description}</p>}</div>
          <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1"><X className="size-4" /></IconButton>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border)] px-5 py-3.5 pb-[max(14px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

// ---------------- Toasts & confirm ----------------
type ToastTone = 'success' | 'error' | 'info';
interface ToastItem { id: number; tone: ToastTone; text: string }
interface ConfirmOpts { title: string; text?: ReactNode; confirmLabel?: string; danger?: boolean; requireText?: string }
const UiCtx = createContext<{ toast: (text: string, tone?: ToastTone) => void; confirm: (o: ConfirmOpts) => Promise<boolean> } | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [conf, setConf] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const [typed, setTyped] = useState('');
  const toast = useCallback((text: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(window.innerWidth < 640 ? -1 : -3), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => { setTyped(''); setConf({ ...o, resolve }); }), []);
  const close = (v: boolean) => { conf?.resolve(v); setConf(null); };
  const icons = { success: <CheckCircle2 className="size-4 text-emerald-500" />, error: <XCircle className="size-4 text-red-500" />, info: <Info className="size-4 text-sky-500" /> };
  return (
    <UiCtx.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className="anim-rise pointer-events-auto flex max-w-sm items-start gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[13.5px] shadow-lg">
            <span className="mt-0.5">{icons[t.tone]}</span><span className="toast-text">{t.text}</span>
          </div>
        ))}
      </div>
      <Modal open={!!conf} onClose={() => close(false)} title={conf?.title} size="sm"
        footer={<><Button onClick={() => close(false)}>Cancel</Button><Button variant={conf?.danger ? 'danger' : 'primary'} disabled={!!conf?.requireText && typed !== conf.requireText} onClick={() => close(true)} data-testid="confirm-yes">{conf?.confirmLabel || 'Confirm'}</Button></>}>
        <div className="text-[13.5px] muted">{conf?.text}</div>
        {conf?.requireText && <Field className="mt-4" label={`Type "${conf.requireText}" to confirm`}><Input value={typed} onChange={(e) => setTyped(e.target.value)} /></Field>}
      </Modal>
    </UiCtx.Provider>
  );
}
export function useUi() { const c = useContext(UiCtx); if (!c) throw new Error('useUi outside provider'); return c; }
