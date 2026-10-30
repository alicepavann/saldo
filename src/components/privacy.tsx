"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { money, moneyCompact } from "@/lib/format";

const KEY = "saldo:hide-values";
const listeners = new Set<() => void>();

function read() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const Ctx = createContext<{ hidden: boolean; toggle: () => void }>({
  hidden: false,
  toggle: () => {},
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const hidden = useSyncExternalStore(subscribe, read, () => false);
  const toggle = useCallback(() => {
    try {
      localStorage.setItem(KEY, read() ? "0" : "1");
    } catch {}
    listeners.forEach((l) => l());
  }, []);
  return <Ctx.Provider value={{ hidden, toggle }}>{children}</Ctx.Provider>;
}

export const usePrivacy = () => useContext(Ctx);

/** Anima um número até `value` (rolagem curta), respeitando "reduzir movimento". */
function useRolling(value: number, enabled: boolean) {
  const [shown, setShown] = useState(value);
  const from = useRef(value * 0.82);
  useEffect(() => {
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sem animação, só sincroniza
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 700);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(a + (value - a) * e);
      if (k < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, enabled]);
  return shown;
}

/** Valor em BRL que respeita o modo "ocultar valores". */
export function Money({
  value,
  compact,
  signed,
  animate,
  cents = true,
  className,
}: {
  value: number;
  compact?: boolean;
  signed?: boolean;
  animate?: boolean;
  /** false = centavos menores (para números grandes de destaque) */
  cents?: boolean;
  className?: string;
}) {
  const { hidden } = usePrivacy();
  const v = useRolling(value, !!animate && !hidden);
  const abs = Math.abs(v);
  const text = compact ? moneyCompact(abs) : money(abs);
  const sign = value < 0 ? "−" : signed && value > 0 ? "+" : "";
  if (hidden) {
    return (
      <span className={cn("num whitespace-nowrap", className)}>
        <span aria-label="valor oculto" className="tracking-[0.2em] text-ink-3">
          ••••••
        </span>
      </span>
    );
  }
  if (!cents && !compact) {
    const [int, dec] = text.split(",");
    return (
      <span className={cn("num whitespace-nowrap", className)}>
        {sign}
        {int}
        <span className="text-[0.5em] align-[0.7em] opacity-60">,{dec}</span>
      </span>
    );
  }
  return (
    <span className={cn("num whitespace-nowrap", className)}>
      {sign}
      {text}
    </span>
  );
}
