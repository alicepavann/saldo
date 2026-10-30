import { cn } from "@/lib/cn";

export function Card({
  className,
  children,
  as: As = "section",
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" | "article" }) {
  return (
    <As className={cn("card", className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({
  title,
  hint,
  action,
  className,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-4 px-5 pt-5 pb-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[14px] font-medium tracking-[-0.01em] text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-ink-3">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "rose" | "pos" | "warn" | "neg";
  className?: string;
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-surface-3 text-ink-2 border-line-strong",
    rose: "bg-rose-soft text-rose-ink border-rose-line",
    pos: "bg-[rgba(127,214,168,0.08)] text-pos border-[rgba(127,214,168,0.22)]",
    warn: "bg-[rgba(232,184,106,0.08)] text-warn border-[rgba(232,184,106,0.24)]",
    neg: "bg-[rgba(240,122,122,0.08)] text-neg border-[rgba(240,122,122,0.24)]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Barra de progresso fina. Rosa até 80%, âmbar de 80% a 100%, vermelho acima. */
export function Meter({
  value,
  className,
  tone,
}: {
  value: number; // 0..n (1 = 100%)
  className?: string;
  tone?: "rose" | "auto" | "muted";
}) {
  const v = Math.max(0, value);
  const color =
    tone === "muted"
      ? "bg-ink-3"
      : tone === "rose" || !tone
        ? "bg-rose"
        : v > 1
          ? "bg-neg"
          : v >= 0.8
            ? "bg-warn"
            : "bg-rose";
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}
      role="progressbar"
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500", color)}
        style={{ width: `${Math.min(100, v * 100)}%` }}
      />
    </div>
  );
}

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  const variants = {
    primary:
      "bg-rose text-[#22070f] hover:bg-rose-strong border-transparent font-medium",
    secondary:
      "bg-surface-2 text-ink border-line-strong hover:bg-surface-3 hover:border-ink-4",
    ghost: "bg-transparent text-ink-2 border-transparent hover:bg-surface-2 hover:text-ink",
  } as const;
  const sizes = { sm: "h-8 px-3 text-xs gap-1.5", md: "h-9 px-4 text-[13px] gap-2" } as const;
  return (
    <button
      className={cn(
        "inline-flex select-none items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    />
  );
}

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-[10px] border border-line-strong bg-surface-2 px-3 text-[13px] text-ink placeholder:text-ink-3 transition-colors hover:border-ink-4 focus:border-rose-line focus:outline-none",
        className,
      )}
      {...rest}
    />
  );
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-9 w-full appearance-none rounded-[10px] border border-line-strong bg-surface-2 pl-3 pr-8 text-[13px] text-ink transition-colors hover:border-ink-4 focus:border-rose-line focus:outline-none"
        {...rest}
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3"
      >
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

export function Delta({
  value,
  invert,
  className,
  suffix,
}: {
  value: number; // fração
  invert?: boolean; // para despesas: subir é ruim
  className?: string;
  suffix?: string;
}) {
  const good = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 0.005;
  const s = new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(Math.abs(value));
  return (
    <span
      className={cn(
        "num inline-flex items-center gap-0.5 text-xs",
        flat ? "text-ink-3" : good ? "text-pos" : "text-neg",
        className,
      )}
    >
      {flat ? "±" : value > 0 ? "↑" : "↓"} {s}
      {suffix ? <span className="ml-1 font-sans text-ink-3">{suffix}</span> : null}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 size-8 rounded-full border border-dashed border-line-strong" />
      <p className="text-sm text-ink-2">{title}</p>
      {hint ? <p className="mt-1 max-w-xs text-xs text-ink-3">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="animate-in mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="display text-[40px] text-ink sm:text-[46px]">{title}</h1>
        {description ? <p className="mt-2 max-w-xl text-[13px] leading-6 text-ink-3">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
