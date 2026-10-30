"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { toast } from "sonner";
import type { Category, Transaction } from "@/lib/types";
import { monthLabel } from "@/lib/format";
import { Money } from "@/components/privacy";
import { Badge, Button, Card, EmptyState, Input, PageHeader, Select } from "@/components/ui/primitives";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/cn";

export type Kind = "all" | "out" | "in" | "internal";

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function dayHeading(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${wd}, ${d} de ${monthLabel(date.slice(0, 7)).split(" de ")[0]}`;
}

export function TransactionsView({
  transactions,
  categories,
  accounts,
  months,
  initial,
}: {
  transactions: Transaction[];
  categories: Category[];
  accounts: { id: string; name: string }[];
  months: string[];
  initial?: { month?: string; q?: string; category?: string; kind?: Kind };
}) {
  const router = useRouter();
  const [txs, setTxs] = useState(transactions);
  const [month, setMonthState] = useState(initial?.month ?? months[0]);
  const [q, setQ] = useState(initial?.q ?? "");
  const [account, setAccount] = useState("all");
  const [category, setCategory] = useState(initial?.category ?? "all");
  const [kind, setKind] = useState<Kind>(initial?.kind ?? "out");
  // Trocar o mês aqui também atualiza o período global (?m=).
  const setMonth = (m: string) => {
    setMonthState(m);
    if (m !== "all") router.replace(m === months[0] ? "/transacoes" : `/transacoes?m=${m}`, { scroll: false });
  };
  const [rule, setRule] = useState<{ pattern: string; categoryId: string } | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return txs.filter((t) => {
      if (month !== "all" && !t.date.startsWith(month)) return false;
      if (account !== "all" && t.accountId !== account) return false;
      if (category !== "all" && t.categoryId !== category) return false;
      if (kind === "out" && (t.isInternalTransfer || t.amount >= 0)) return false;
      if (kind === "in" && (t.isInternalTransfer || t.amount <= 0)) return false;
      if (kind === "internal" && !t.isInternalTransfer) return false;
      if (needle && !t.description.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [txs, month, q, account, category, kind]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) map.set(t.date, [...(map.get(t.date) ?? []), t]);
    return [...map.entries()];
  }, [filtered]);

  const total = filtered.reduce((s, t) => s + t.amount, 0);
  const accName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "";

  const recategorize = (t: Transaction, categoryId: string) => {
    setTxs((all) => all.map((x) => (x.id === t.id ? { ...x, categoryId, categoryLocked: true } : x)));
    const pattern = t.description.split(/[*\s]+/).filter(Boolean)[0] ?? t.description;
    toast("Categoria atualizada", {
      description: `${t.description} → ${categories.find((c) => c.id === categoryId)?.name}`,
      action: { label: "Criar regra", onClick: () => setRule({ pattern, categoryId }) },
    });
  };

  const kinds: { id: Kind; label: string }[] = [
    { id: "out", label: "Saídas" },
    { id: "in", label: "Entradas" },
    { id: "internal", label: "Internas" },
    { id: "all", label: "Tudo" },
  ];

  return (
    <div>
      <PageHeader
        title="Transações"
        description="Tudo o que entrou e saiu, de todas as contas e cartões. Transferências entre contas suas não entram nos totais."
      />

      <Card className="animate-in mb-4 p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.6} />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por descrição"
              className="pl-9"
              aria-label="Buscar"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex">
            <Select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Mês" className="lg:w-44">
              <option value="all">Todos os meses</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </Select>
            <Select value={account} onChange={(e) => setAccount(e.target.value)} aria-label="Conta" className="lg:w-48">
              <option value="all">Todas as contas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
            <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria" className="col-span-2 sm:col-span-1 lg:w-44">
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex rounded-[10px] border border-line bg-bg p-0.5" role="tablist">
            {kinds.map((k) => (
              <button
                key={k.id}
                role="tab"
                aria-selected={kind === k.id}
                onClick={() => setKind(k.id)}
                className={cn(
                  "h-7 rounded-[8px] px-3 text-xs transition-colors",
                  kind === k.id ? "bg-surface-3 text-ink" : "text-ink-3 hover:text-ink-2",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-3">
            <span className="num text-ink-2">{filtered.length}</span> transações · total{" "}
            <Money value={total} signed className="text-ink" />
          </p>
        </div>
      </Card>

      <Card className="animate-in">
        {groups.length === 0 ? (
          <EmptyState title="Nenhuma transação encontrada" hint="Tente outro mês ou limpe a busca." />
        ) : (
          groups.map(([date, list], gi) => {
            const dayTotal = list.reduce((s, t) => s + t.amount, 0);
            return (
              <div key={date}>
                <div className={`sticky top-14 z-10 flex items-center justify-between border-b border-line bg-surface/95 px-5 py-2 backdrop-blur ${gi === 0 ? "rounded-t-[14px]" : ""}`}>
                  <p className="text-xs text-ink-3 first-letter:uppercase">{dayHeading(date)}</p>
                  <Money value={dayTotal} signed className="text-xs text-ink-3" />
                </div>
                <ul>
                  {list.map((t) => (
                    <li
                      key={t.id}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2 border-b border-line/60 px-5 py-3 last:border-b-0 hover:bg-surface-2/60 sm:grid-cols-[auto_1fr_200px_140px]"
                    >
                      <CategoryIcon id={t.categoryId} accent={t.amount > 0 && !t.isInternalTransfer} />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-ink">{t.description}</p>
                        <p className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-ink-3">
                          {accName(t.accountId)}
                          {t.installment ? (
                            <Badge>
                              {t.installment.number}/{t.installment.total}
                            </Badge>
                          ) : null}
                          {t.isInternalTransfer ? <Badge>interna</Badge> : null}
                          {t.categoryLocked ? <Badge tone="rose">editada</Badge> : null}
                        </p>
                      </div>
                      <div className="col-span-3 col-start-2 row-start-2 sm:col-span-1 sm:col-start-3 sm:row-start-1">
                        <Select
                          value={t.categoryId}
                          onChange={(e) => recategorize(t, e.target.value)}
                          aria-label={`Categoria de ${t.description}`}
                          className="[&_select]:h-8 [&_select]:border-transparent [&_select]:bg-transparent [&_select]:text-xs [&_select]:text-ink-2 [&_select:hover]:border-line-strong"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="col-start-3 row-start-1 text-right sm:col-start-4">
                        <Money
                          value={t.amount}
                          signed
                          className={cn("text-[13px]", t.amount > 0 && !t.isInternalTransfer ? "text-pos" : "text-ink")}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })
        )}
      </Card>

      <Dialog open={!!rule} onOpenChange={(o) => !o && setRule(null)}>
        {rule ? (
          <DialogContent
            title="Criar regra de categoria"
            description="Toda transação nova cuja descrição contém o texto abaixo recebe esta categoria."
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                toast("Regra criada", {
                  description: `“${rule.pattern}” → ${categories.find((c) => c.id === rule.categoryId)?.name}`,
                });
                setRule(null);
              }}
            >
              <label className="block">
                <span className="label">Descrição contém</span>
                <Input
                  className="mt-1.5"
                  value={rule.pattern}
                  onChange={(e) => setRule({ ...rule, pattern: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="label">Categoria</span>
                <Select
                  className="mt-1.5"
                  value={rule.categoryId}
                  onChange={(e) => setRule({ ...rule, categoryId: e.target.value })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">
                    Cancelar
                  </Button>
                </DialogClose>
                <Button type="submit" variant="primary">
                  Criar regra
                </Button>
              </div>
            </form>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}
