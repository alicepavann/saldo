import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { goalPlan, monthlySeries } from "@/lib/compute";
import { dateBr, monthShort, percent } from "@/lib/format";
import { Money } from "@/components/privacy";
import { Badge, Card, CardHeader, EmptyState, Meter, PageHeader } from "@/components/ui/primitives";
import { NewGoal } from "./new-goal";

export const metadata: Metadata = { title: "Metas" };

function Ring({ value, size = 64 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth="3" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--rose)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${c * Math.min(1, value)} ${c}`}
      />
    </svg>
  );
}

export default async function Page() {
  const d = await getData();
  const reserve = d.goals.find((g) => g.isEmergencyFund)!;
  const others = d.goals.filter((g) => !g.isEmergencyFund);
  const e = d.emergency;
  const series = monthlySeries(d.transactions, d.months.slice(-7, -1));
  const avgRate = series.reduce((s, m) => s + m.savingsRate, 0) / Math.max(1, series.length);

  return (
    <div>
      <PageHeader
        title="Metas"
        description="Quanto falta e quanto guardar por mês para chegar na data."
        actions={<NewGoal />}
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="animate-in relative overflow-hidden xl:col-span-2">
          <div aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full border border-rose-line opacity-60" />
          <div aria-hidden className="absolute -right-12 -top-36 size-72 rounded-full border border-line" />
          <div className="relative p-6">
            <div className="flex items-center gap-2">
              <p className="label">Reserva de emergência</p>
              <Badge tone="rose">{d.emergencyMonths} meses de custo</Badge>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-x-10 gap-y-4">
              <div>
                <p className="text-[40px] font-medium leading-none tracking-[-0.04em] text-ink">
                  <span className="num">{e.monthsCovered.toFixed(1).replace(".", ",")}</span>
                  <span className="ml-2 text-base font-normal tracking-normal text-ink-3">meses cobertos</span>
                </p>
              </div>
              <div className="grid grid-cols-3 gap-8 text-[13px]">
                <div>
                  <p className="text-ink-3">Tenho</p>
                  <Money value={e.current} className="mt-0.5 block text-ink" />
                </div>
                <div>
                  <p className="text-ink-3">Alvo</p>
                  <Money value={e.target} className="mt-0.5 block text-ink" />
                </div>
                <div>
                  <p className="text-ink-3">Falta</p>
                  <Money value={e.missing} className="mt-0.5 block text-rose" />
                </div>
              </div>
            </div>
            <div className="mt-6">
              <div className="relative">
                <Meter value={e.ratio} tone="rose" className="h-2" />
                {Array.from({ length: d.emergencyMonths - 1 }, (_, k) => (
                  <span
                    key={k}
                    className="absolute top-0 h-2 w-[2px] bg-surface"
                    style={{ left: `${((k + 1) / d.emergencyMonths) * 100}%` }}
                    aria-hidden
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[11px] text-ink-3">
                {Array.from({ length: d.emergencyMonths + 1 }, (_, k) => (
                  <span key={k} className="num">{k}</span>
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs text-ink-3">
              Custo médio mensal dos últimos 6 meses: <Money value={d.avg6} className="text-ink-2" /> · {reserve.note}
            </p>
          </div>
        </Card>

        <Card className="animate-in [animation-delay:60ms]">
          <CardHeader title="Taxa de poupança" hint="Quanto da renda sobra por mês" />
          <div className="px-5 pb-5">
            <p className="num text-[32px] font-medium tracking-[-0.03em] text-ink">{percent(avgRate)}</p>
            <p className="text-xs text-ink-3">média dos últimos 6 meses</p>
            <div className="mt-6 flex items-end gap-2">
              {series.map((m) => (
                <div key={m.ym} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="num text-[10px] text-ink-3">{Math.round(m.savingsRate * 100)}%</span>
                  <div
                    className="w-full rounded-t-[4px] bg-rose/80"
                    style={{ height: `${Math.max(3, Math.min(1, m.savingsRate / 0.4) * 72)}px` }}
                  />
                  <span className="text-[10px] text-ink-3">{monthShort(m.ym)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {others.length === 0 ? (
        <Card className="mt-3">
          <EmptyState
            title="Nenhuma meta criada ainda"
            hint="Metas personalizadas ficam salvas no Supabase, que entra na próxima fase. Por enquanto só a reserva é calculada."
          />
        </Card>
      ) : null}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {others.map((g, idx) => {
          const p = goalPlan(g, d.today);
          return (
            <Card key={g.id} className="animate-in p-5" style={{ animationDelay: `${120 + idx * 40}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-ink">{g.name}</p>
                  <p className="mt-0.5 text-xs text-ink-3">até {dateBr(g.targetDate)}</p>
                </div>
                <div className="relative grid place-items-center">
                  <Ring value={p.ratio} />
                  <span className="num absolute text-xs text-ink">{Math.round(p.ratio * 100)}%</span>
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-1.5">
                <Money value={g.current} className="text-[20px] font-medium tracking-[-0.02em] text-ink" />
                <span className="text-xs text-ink-3">
                  de <Money value={g.target} />
                </span>
              </div>
              <div className="mt-4 rounded-[10px] border border-line bg-surface-2 px-3.5 py-3">
                <p className="text-[11px] text-ink-3">Para chegar na data</p>
                <p className="mt-0.5 text-[13px] text-ink">
                  <Money value={p.perMonth} className="text-rose" /> por mês · {p.monthsLeft} meses
                </p>
              </div>
              <p className="mt-3 text-[11px] text-ink-3">{g.note}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
