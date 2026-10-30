"use client";

import { useState } from "react";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { PluggyConnectButton } from "@/components/pluggy-connect-button";
import { toast } from "sonner";
import type { Account, Category, CategoryRule, Connection, SyncRun } from "@/lib/types";
import { dateBr, dateTimeBr } from "@/lib/format";
import { Badge, Button, Card, CardHeader, Input, PageHeader, Select } from "@/components/ui/primitives";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

const STATUS: Record<Connection["status"], { label: string; tone: "pos" | "warn" | "neg" | "neutral" }> = {
  UPDATED: { label: "Atualizada", tone: "pos" },
  UPDATING: { label: "Atualizando", tone: "neutral" },
  OUTDATED: { label: "Desatualizada", tone: "warn" },
  LOGIN_ERROR: { label: "Erro de acesso", tone: "neg" },
};

function Section({ id, title, hint, children, action }: { id: string; title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card id={id} className="animate-in scroll-mt-20">
      <CardHeader title={title} hint={hint} action={action} />
      {children}
    </Card>
  );
}

export function ConfigView({
  today,
  connections,
  accounts,
  categories,
  rules: initialRules,
  syncRuns,
  emergencyMonths,
  isMock,
}: {
  today: string;
  connections: Connection[];
  accounts: Account[];
  categories: Category[];
  rules: CategoryRule[];
  syncRuns: SyncRun[];
  emergencyMonths: number;
  isMock: boolean;
}) {
  const [rules, setRules] = useState(initialRules);
  const [months, setMonths] = useState(emergencyMonths);
  const [confirm, setConfirm] = useState("");
  const daysLeft = (iso: string) => Math.round((Date.parse(iso) - Date.parse(today)) / 864e5);
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const toc = [
    ["conexoes", "Conexões"],
    ["categorias", "Categorias"],
    ["regras", "Regras"],
    ["preferencias", "Preferências"],
    ["sync", "Sincronizações"],
    ["dados", "Seus dados"],
  ];

  return (
    <div>
      <PageHeader title="Ajustes" description="Bancos conectados, categorias, regras e preferências." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[180px_1fr]">
        <nav className="hidden lg:block" aria-label="Seções">
          <ul className="sticky top-24 space-y-0.5">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="block rounded-lg px-3 py-1.5 text-[13px] text-ink-3 hover:bg-surface hover:text-ink">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3">
          <Section
            id="conexoes"
            title="Conexões"
            hint="Meu Pluggy · até 5 instituições, todas no seu CPF"
            action={
              isMock ? (
                <Badge>dados de exemplo</Badge>
              ) : (
                <PluggyConnectButton
                  currentItemIds={connections.map((c) => c.itemId)}
                  disabled={connections.length >= 5}
                />
              )
            }
          >
            <ul className="divide-y divide-line/70 border-t border-line">
              {connections.map((c) => {
                const left = daysLeft(c.consentExpiresAt);
                const accs = accounts.filter((a) => a.itemId === c.itemId);
                return (
                  <li key={c.itemId} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                    <div className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-line bg-surface-2 text-[13px] font-medium text-ink-2">
                      {c.institution[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13px] text-ink">{c.institution}</p>
                        <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                        {left <= 30 ? <Badge tone="rose">consentimento vence em {left} dias</Badge> : null}
                      </div>
                      <p className="mono mt-1 truncate text-[11px] text-ink-3">{c.itemId}</p>
                      <p className="mt-0.5 text-[11px] text-ink-3">
                        {accs.length ? accs.map((a) => a.name).join(" · ") : "Investimentos"} · atualizado {dateTimeBr(c.lastUpdatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left sm:text-right">
                        <p className="text-[11px] text-ink-3">Consentimento até</p>
                        <p className="num text-[13px] text-ink-2">{dateBr(c.consentExpiresAt)}</p>
                      </div>
                      {!isMock && (left <= 30 || c.status !== "UPDATED") ? (
                        <PluggyConnectButton itemId={c.itemId} currentItemIds={connections.map((x) => x.itemId)} />
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section id="categorias" title="Categorias" hint="As categorias da Pluggy são traduzidas para estas">
            <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                    c.kind === "expense" ? "border-line-strong text-ink-2" : "border-rose-line bg-rose-soft text-rose-ink",
                  )}
                >
                  {c.name}
                  <span className="text-[10px] text-ink-3">
                    {c.kind === "expense" ? "" : c.kind === "income" ? "entrada" : c.kind === "transfer" ? "interna" : "aporte"}
                  </span>
                </span>
              ))}
              <button
                onClick={() => toast("Em breve: criar categoria")}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-3 py-1 text-xs text-ink-3 hover:text-ink"
              >
                <Plus className="size-3" /> Nova
              </button>
            </div>
          </Section>

          <Section id="regras" title="Regras de categorização" hint="Valem para transações novas. Edições manuais têm prioridade.">
            {rules.length === 0 ? (
              <p className="border-t border-line px-5 py-4 text-[13px] text-ink-3">
                Nenhuma regra ainda. Crie uma ao trocar a categoria de uma transação.
              </p>
            ) : null}
            <ul className="divide-y divide-line/70 border-t border-line">
              {rules.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-[13px]">
                  <span className="text-ink-3">Descrição contém</span>
                  <code className="mono rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs text-ink">{r.pattern}</code>
                  <span className="text-ink-3">→</span>
                  <span className="flex-1 text-ink-2">{catName(r.categoryId)}</span>
                  <button
                    onClick={() => setRules((all) => all.filter((x) => x.id !== r.id))}
                    className="rounded-md p-1.5 text-ink-3 hover:bg-surface-2 hover:text-neg"
                    aria-label={`Remover regra ${r.pattern}`}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="preferencias" title="Preferências">
            <div className="grid gap-4 border-t border-line px-5 py-4 sm:grid-cols-2">
              <label className="block">
                <span className="label">Meses de reserva de emergência</span>
                <Select className="mt-1.5" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                  {[3, 4, 6, 9, 12].map((m) => (
                    <option key={m} value={m}>
                      {m} meses de custo
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="label">Alerta de orçamento</span>
                <Select className="mt-1.5" defaultValue="80">
                  <option value="70">Avisar em 70%</option>
                  <option value="80">Avisar em 80%</option>
                  <option value="90">Avisar em 90%</option>
                </Select>
              </label>
            </div>
          </Section>

          <Section
            id="sync"
            title="Sincronizações"
            hint="Automática todo dia às 06:00"
            action={
              <Button size="sm" onClick={() => toast("Sincronização iniciada")}>
                <RefreshCw /> Rodar agora
              </Button>
            }
          >
            <ul className="divide-y divide-line/70 border-t border-line">
              {syncRuns.map((s) => (
                <li key={s.id} className="flex items-center gap-4 px-5 py-2.5 text-[13px]">
                  <span
                    className={cn("size-1.5 rounded-full", s.status === "ok" ? "bg-pos" : s.status === "partial" ? "bg-warn" : "bg-neg")}
                  />
                  <span className="num w-28 text-ink-2">{dateTimeBr(s.startedAt)}</span>
                  <span className="num w-20 text-ink-3">{(s.durationMs / 1000).toFixed(1)} s</span>
                  <span className="num flex-1 text-ink-3">{s.records} registros</span>
                  {s.note ? <span className="hidden text-xs text-warn md:inline">{s.note}</span> : null}
                </li>
              ))}
            </ul>
          </Section>

          <Section id="dados" title="Seus dados" hint="Você pode apagar tudo a qualquer momento.">
            <div className="flex flex-col gap-3 border-t border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[13px] text-ink-3">
                Apaga transações, contas, investimentos, metas e relatórios. As conexões no Meu Pluggy continuam ativas.
              </p>
              <Dialog onOpenChange={() => setConfirm("")}>
                <DialogTrigger asChild>
                  <Button className="shrink-0 border-[rgba(240,122,122,0.3)] text-neg hover:bg-[rgba(240,122,122,0.08)]">
                    <Trash2 /> Apagar tudo
                  </Button>
                </DialogTrigger>
                <DialogContent title="Apagar todos os dados?" description="Não dá para desfazer. Digite APAGAR para confirmar.">
                  <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="APAGAR" />
                  <div className="mt-5 flex justify-end gap-2">
                    <DialogClose asChild>
                      <Button variant="ghost">Cancelar</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button
                        disabled={confirm !== "APAGAR"}
                        className="border-transparent bg-neg text-[#1a0707] hover:bg-neg/90"
                        onClick={() => toast("Simulação: nenhum dado foi apagado")}
                      >
                        Apagar definitivamente
                      </Button>
                    </DialogClose>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
