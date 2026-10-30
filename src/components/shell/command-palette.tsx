"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as D from "@radix-ui/react-dialog";
import { ArrowRight, Eye, LogOut, RefreshCw, Search } from "lucide-react";
import { dayShort } from "@/lib/format";
import { usePrivacy } from "@/components/privacy";
import { Money } from "@/components/privacy";
import { NAV } from "./nav";

type Hit = { id: string; date: string; description: string; amount: number; category: string };

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "/" && !(e.target as HTMLElement).closest("input, textarea, select")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}

export function CommandPalette({
  open,
  onOpenChange,
  onSync,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSync: () => void;
}) {
  const router = useRouter();
  const { toggle, hidden } = usePrivacy();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (r.ok) {
          const results = ((await r.json()) as { results: Hit[] }).results;
          setHits(results);
          setSelected(results[0] ? `tx-${results[0].id}` : "");
        }
      } catch {}
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const run = (fn: () => void) => {
    onOpenChange(false);
    setQ("");
    setHits([]);
    fn();
  };

  const item =
    "flex h-10 cursor-pointer items-center gap-3 rounded-[10px] px-3 text-[13px] text-ink-2 data-[selected=true]:bg-surface-3 data-[selected=true]:text-ink";

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fade-in fixed inset-0 z-50 bg-black/55 backdrop-blur-[3px]" />
        <D.Content
          className="fade-in fixed left-1/2 top-[14vh] z-50 w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-[18px] border border-line-strong bg-surface shadow-2xl shadow-black/60 focus:outline-none"
          aria-describedby={undefined}
        >
          <D.Title className="sr-only">Buscar</D.Title>
          <Command label="Buscar" shouldFilter={q.trim().length < 2} value={selected} onValueChange={setSelected} loop>
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 text-ink-3" strokeWidth={1.6} />
              <Command.Input
                value={q}
                onValueChange={(v) => {
                  setQ(v);
                  if (v.trim().length < 2) setHits([]);
                }}
                placeholder="Buscar transação, ir para uma tela…"
                className="h-14 flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink-3 focus:outline-none focus-visible:outline-none"
              />
              <kbd className="rounded-md border border-line-strong px-1.5 py-0.5 text-[10px] text-ink-3">esc</kbd>
            </div>
            <Command.List className="scrollbar-thin max-h-[52vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-6 text-center text-[13px] text-ink-3">Nada encontrado.</Command.Empty>

              {hits.length ? (
                <Command.Group heading="Transações" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-ink-3">
                  {hits.map((h) => (
                    <Command.Item
                      key={h.id}
                      value={`tx-${h.id}`}
                      className={item}
                      onSelect={() =>
                        run(() =>
                          router.push(`/transacoes?m=${h.date.slice(0, 7)}&q=${encodeURIComponent(h.description)}&tipo=tudo`),
                        )
                      }
                    >
                      <span className="w-12 shrink-0 text-xs text-ink-3">{dayShort(h.date)}</span>
                      <span className="min-w-0 flex-1 truncate">{h.description}</span>
                      <span className="hidden text-xs text-ink-3 sm:inline">{h.category}</span>
                      <Money value={h.amount} signed className={h.amount > 0 ? "text-pos" : "text-ink"} />
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              <Command.Group heading="Ir para" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-ink-3">
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Command.Item key={href} value={`ir ${label}`} className={item} onSelect={() => run(() => router.push(href))}>
                    <Icon className="size-4 text-ink-3" strokeWidth={1.6} />
                    <span className="flex-1">{label}</span>
                    <ArrowRight className="size-3.5 text-ink-4" />
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Ações" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:text-ink-3">
                <Command.Item value="acao ocultar mostrar valores" className={item} onSelect={() => run(toggle)}>
                  <Eye className="size-4 text-ink-3" strokeWidth={1.6} />
                  {hidden ? "Mostrar valores" : "Ocultar valores"}
                </Command.Item>
                <Command.Item value="acao sincronizar" className={item} onSelect={() => run(onSync)}>
                  <RefreshCw className="size-4 text-ink-3" strokeWidth={1.6} />
                  Sincronizar agora
                </Command.Item>
                <Command.Item
                  value="acao sair"
                  className={item}
                  onSelect={() =>
                    run(async () => {
                      await fetch("/api/login", { method: "DELETE" });
                      router.push("/login");
                    })
                  }
                >
                  <LogOut className="size-4 text-ink-3" strokeWidth={1.6} />
                  Sair
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
