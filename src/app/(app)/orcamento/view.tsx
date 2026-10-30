"use client";

import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import type { Budget, Category, Transaction } from "@/lib/types";
import { budgetProgress, detectRecurring, monthSummary } from "@/lib/compute";
import { dayShort, percent } from "@/lib/format";
import { Money } from "@/components/privacy";
import { Badge, Button, Card, CardHeader, Meter, PageHeader } from "@/components/ui/primitives";
import { CategoryIcon } from "@/components/category-icon";
import { cn } from "@/lib/cn";

export function BudgetView({
  transactions,
  categories,
  budgets: initial,
  months,
  today,
  initialMonth,
}: {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  months: string[]; // mais recente primeiro
  today: string;
  initialMonth?: string;
}) {
  // O mês vem do seletor global do topo (?m=).
  const i = Math.max(0, initialMonth ? months.indexOf(initialMonth) : 0);
  const [budgets, setBudgets] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const ym = months[i];
  const isCurrent = i === 0;

  const rows = useMemo(
    () => budgetProgress(transactions, ym, budgets, categories),
    [transactions, ym, budgets, categories],
  );
  const recurring = useMemo(() => detectRecurring(transactions, months[0]), [transactions, months]);
  const sum = monthSummary(transactions, ym);
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const unbudgeted = sum.expense - totalSpent;
  const over = rows.filter((r) => r.ratio > 1).length;

  const dayOfMonth = Number(today.slice(8, 10));
  const daysInMonth = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0).getDate();
  const elapsed = isCurrent ? dayOfMonth / daysInMonth : 1;

  return (
    <div>
      <PageHeader
        title="Orçamento"
        description="Quanto você se permitiu gastar em cada coisa. O tracinho na barra marca quanto do mês já passou."
        actions={
          <>
            <Button onClick={() => toast("Orçamento copiado do mês anterior")}>
              <Copy /> Copiar do mês anterior
            </Button>
          </>
        }
      />

      <div className="stagger mb-10 grid grid-cols-2 border-y border-line lg:grid-cols-4">
        {[
          { label: "Orçado", node: <Money value={totalBudget} /> },
          { label: "Gasto nas categorias", node: <Money value={totalSpent} /> },
          {
            label: totalBudget - totalSpent >= 0 ? "Disponível" : "Acima do orçado",
            node: <Money value={Math.abs(totalBudget - totalSpent)} className={totalBudget - totalSpent < 0 ? "text-neg" : ""} />,
          },
          {
            label: "Fora do orçamento",
            node: <Money value={unbudgeted} />,
          },
        ].map((k, idx) => (
          <div
            key={k.label}
            className={cn(
              "border-line py-5",
              idx % 2 === 1 && "border-l pl-4 lg:pl-6",
              idx === 2 && "lg:border-l lg:pl-6",
              idx < 2 && "max-lg:border-b",
            )}
          >
            <p className="label">{k.label}</p>
            <p className="display mt-1 text-[32px] text-ink">{k.node}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="animate-in xl:col-span-2">
          <CardHeader
            title="Categorias"
            hint={
              over
                ? `${over} ${over === 1 ? "categoria passou" : "categorias passaram"} do limite`
                : "Tudo dentro do limite até agora"
            }
            action={isCurrent ? <Badge tone="rose">{percent(elapsed)} do mês</Badge> : <Badge>Mês fechado</Badge>}
          />
          <ul className="divide-y divide-line/70">
            {rows.map((r) => (
              <li key={r.categoryId} className="flex items-center gap-4 px-5 py-3.5">
                <CategoryIcon id={r.categoryId} accent={r.ratio > 1} />
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <p className="truncate text-[13px] text-ink">{r.name}</p>
                    <p className="text-xs text-ink-3">
                      <Money value={r.spent} className="text-[13px] text-ink" />
                      <span className="mx-1">de</span>
                      {editing === r.categoryId ? (
                        <input
                          autoFocus
                          type="number"
                          defaultValue={r.budget}
                          className="num h-6 w-20 rounded-md border border-rose-line bg-surface-2 px-1.5 text-right text-xs text-ink focus:outline-none"
                          onBlur={(e) => {
                            const v = Number(e.target.value);
                            if (v > 0) setBudgets((all) => all.map((b) => (b.categoryId === r.categoryId ? { ...b, amount: v } : b)));
                            setEditing(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            if (e.key === "Escape") setEditing(null);
                          }}
                        />
                      ) : (
                        <button
                          onClick={() => setEditing(r.categoryId)}
                          className="underline decoration-dotted decoration-ink-4 underline-offset-4 hover:text-ink hover:decoration-rose"
                          title="Editar limite"
                        >
                          <Money value={r.budget} />
                        </button>
                      )}
                    </p>
                  </div>
                  <div className="relative">
                    <Meter value={r.ratio} tone="auto" />
                    {isCurrent ? (
                      <span
                        className="absolute -top-1 h-3.5 w-px bg-ink-3/70"
                        style={{ left: `${elapsed * 100}%` }}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  <p className={cn("mt-1.5 text-[11px]", r.remaining < 0 ? "text-neg" : "text-ink-3")}>
                    {r.remaining < 0 ? (
                      <>Passou <Money value={-r.remaining} /> · {percent(r.ratio)}</>
                    ) : (
                      <>Restam <Money value={r.remaining} /> · {percent(r.ratio)}</>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="animate-in self-start">
          <CardHeader
            title="Assinaturas detectadas"
            hint="Mesma cobrança nos últimos 3 meses"
          />
          <ul className="px-2 pb-2">
            {recurring.map((r) => (
              <li key={r.description} className="flex items-center gap-3 rounded-[10px] px-3 py-2.5 hover:bg-surface-2">
                <CategoryIcon id={r.categoryId} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-ink">{r.description}</p>
                  <p className="text-[11px] text-ink-3">Última em {dayShort(r.lastDate)}</p>
                </div>
                <Money value={r.amount} className="text-[13px] text-ink" />
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-line px-5 py-3.5 text-[13px]">
            <span className="text-ink-3">Por mês</span>
            <Money value={recurring.reduce((s, r) => s + r.amount, 0)} className="font-medium text-rose" />
          </div>
          <div className="flex items-center justify-between border-t border-line px-5 pb-4 pt-3 text-[13px]">
            <span className="text-ink-3">Por ano</span>
            <Money value={recurring.reduce((s, r) => s + r.amount, 0) * 12} className="text-ink" />
          </div>
        </Card>
      </div>
    </div>
  );
}
