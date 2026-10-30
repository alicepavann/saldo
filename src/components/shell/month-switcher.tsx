"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTHS } from "@/lib/format";
import { cn } from "@/lib/cn";

/** Seletor de mês do topo. Grava ?m= na URL; ← e → do teclado também trocam. */
export function MonthSwitcher({ months, current }: { months: string[]; current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const raw = params.get("m");
  const m = raw && months.includes(raw) ? raw : current;
  const i = months.indexOf(m);

  const go = (idx: number) => {
    const next = months[idx];
    if (!next) return;
    const q = new URLSearchParams(params.toString());
    if (next === current) q.delete("m");
    else q.set("m", next);
    start(() => router.push(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false }));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable], [role=dialog]")) return;
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowLeft") go(i - 1);
      if (e.key === "ArrowRight") go(i + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const [y, mm] = m.split("-").map(Number);
  return (
    <div className={cn("flex items-center gap-0.5 transition-opacity", pending && "opacity-60")}>
      <button
        onClick={() => go(i - 1)}
        disabled={i <= 0}
        className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30"
        aria-label="Mês anterior"
        title="Mês anterior (←)"
      >
        <ChevronLeft className="size-4" />
      </button>
      <span className="min-w-28 text-center text-[13px]">
        <span className="display text-[19px] italic text-ink">{MONTHS[mm - 1]}</span>
        <span className="ml-1.5 text-xs text-ink-3">{y}</span>
      </span>
      <button
        onClick={() => go(i + 1)}
        disabled={i >= months.length - 1}
        className="grid size-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-30"
        aria-label="Próximo mês"
        title="Próximo mês (→)"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
