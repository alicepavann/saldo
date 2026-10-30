import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { cdiComparison, monthlySeries, portfolio } from "@/lib/compute";
import { getMarket } from "@/lib/market";
import { currentAllocation } from "@/lib/invest/profile";
import { Simulator } from "./simulator";
import { Advisor } from "./advisor";
import { dateBr, percent, signedPercent } from "@/lib/format";
import { Money } from "@/components/privacy";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/primitives";
import { CdiChart } from "@/components/charts/charts";
import { AllocationBar } from "@/components/charts/allocation";
import { ImportB3 } from "./import-b3";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Investimentos" };

export default async function Page() {
  const d = await getData();
  const pf = portfolio(d.investments);
  const cdi = cdiComparison(d.netWorth);
  const base = d.netWorth[0];
  const series = d.netWorth.map((p) => ({
    month: p.month,
    carteira: p.portfolioIndex / base.portfolioIndex - 1,
    cdi: p.cdiIndex / base.cdiIndex - 1,
  }));
  const contributedThisMonth = -d.transactions
    .filter((t) => t.categoryId === "investimento" && t.date.startsWith(d.currentYm))
    .reduce((s, t) => s + t.amount, 0);
  const sorted = [...d.investments].sort((a, b) => b.balance - a.balance);

  const market = await getMarket();
  const n = d.netWorth.length - 1;
  const cdiFallback = n > 0 ? Math.pow(d.netWorth[n].cdiIndex / d.netWorth[0].cdiIndex, 12 / n) - 1 : 0.1;
  const closed = monthlySeries(d.transactions, d.months.slice(-7, -1));
  const avgSaving = Math.max(0, closed.reduce((s, m) => s + m.net, 0) / Math.max(1, closed.length));
  const tools = (
    <>
      <Simulator
        initial={pf.total}
        suggestedMonthly={avgSaving}
        cdi={market.cdi ?? cdiFallback}
        ipca={market.ipca12m ?? 0.045}
        marketIsReal={market.cdi != null && market.ipca12m != null}
      />
      <Advisor
        current={currentAllocation(d.investments).map((a) => ({ cls: a.cls, share: a.share }))}
        suggestedMonthly={avgSaving}
      />
    </>
  );

  if (sorted.length === 0) {
    return (
      <div>
        <PageHeader title="Investimentos" actions={<ImportB3 />} />
        <Card>
          <EmptyState
            title="Nenhum investimento chegou pelo Open Finance"
            hint="Nem toda corretora compartilha investimentos. Conecte a corretora no Meu Pluggy ou importe a posição da B3."
          />
        </Card>
        {tools}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Investimentos"
        description="Tudo o que você tem aplicado, somado. A rentabilidade é aproximada, calculada sobre o que você aportou."
        actions={<ImportB3 />}
      />

      <div className="stagger mb-10 grid grid-cols-2 border-y border-line lg:grid-cols-4 [&>*]:border-line [&>*]:py-5 [&>*:nth-child(odd)]:pr-4 lg:[&>*:not(:first-child)]:border-l lg:[&>*:not(:first-child)]:pl-6 max-lg:[&>*:nth-child(even)]:border-l max-lg:[&>*:nth-child(even)]:pl-4 max-lg:[&>*:nth-child(-n+2)]:border-b">
        <div>
          <p className="label">Total investido</p>
          <Money value={pf.total} className="display mt-1 block text-[32px] text-ink" />
          <p className="mt-1 text-xs text-ink-3">{d.investments.length} ativos</p>
        </div>
        <div>
          <p className="label">Ganho acumulado</p>
          <Money value={pf.profit} signed className="display mt-1 block text-[32px] text-pos" />
          <p className="mt-1 text-xs text-ink-3">{signedPercent(pf.profitPct)} sobre os aportes</p>
        </div>
        <div>
          <p className="label">12 meses</p>
          <p className="num display mt-1 text-[32px] text-ink">{signedPercent(cdi.portfolio12m)}</p>
          <p className="mt-1 text-xs text-ink-3">
            <span className={cn("num", cdi.pctOfCdi >= 1 ? "text-pos" : "text-rose")}>{percent(cdi.pctOfCdi)}</span> do CDI
            ({percent(cdi.cdi12m)})
          </p>
        </div>
        <div>
          <p className="label">Aportado no mês</p>
          <Money value={contributedThisMonth} className="display mt-1 block text-[32px] text-ink" />
          <p className="mt-1 text-xs text-ink-3">Mês passado: {signedPercent(cdi.portfolioMonth)} de rendimento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <Card className="animate-in xl:col-span-2">
          <CardHeader
            title="Carteira × CDI"
            hint="Rentabilidade acumulada nos últimos 12 meses"
            action={
              <div className="flex items-center gap-4 text-[11px] text-ink-3">
                <span className="flex items-center gap-1.5"><span className="h-0.5 w-3 rounded bg-rose" />Carteira</span>
                <span className="flex items-center gap-1.5"><span className="h-0 w-3 border-t border-dashed border-ink-3" />CDI</span>
              </div>
            }
          />
          <div className="px-3 pb-4">
            <CdiChart data={series} height={330} />
          </div>
        </Card>
        <div className="grid gap-3">
          <Card className="animate-in">
            <CardHeader title="Por tipo" />
            <div className="px-5 pb-5">
              <AllocationBar items={pf.byType} />
            </div>
          </Card>
          <Card className="animate-in">
            <CardHeader title="Por instituição" />
            <div className="px-5 pb-5">
              <AllocationBar items={pf.byInstitution} />
            </div>
          </Card>
        </div>
      </div>

      <Card className="animate-in mt-3 overflow-hidden">
        <CardHeader title="Ativos" hint="Ordenados pelo saldo" />
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[760px] text-[13px]">
            <thead>
              <tr className="border-y border-line text-left">
                {["Ativo", "Tipo", "Instituição", "Vencimento", "Saldo", "Ganho", "12 meses", "% carteira"].map((h, i) => (
                  <th key={h} className={cn("label px-5 py-2.5 font-medium", i >= 4 && "text-right")}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((inv) => {
                const gain = inv.balance - inv.amountOriginal;
                return (
                  <tr key={inv.id} className="border-b border-line/60 last:border-b-0 hover:bg-surface-2/60">
                    <td className="px-5 py-3">
                      <p className="text-ink">{inv.name}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-3">
                        {inv.rateLabel}
                        {inv.source === "b3" ? <Badge>B3</Badge> : null}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-ink-2">{inv.type}</td>
                    <td className="px-5 py-3 text-ink-2">{inv.institution}</td>
                    <td className="num px-5 py-3 text-ink-2">{inv.dueDate ? dateBr(inv.dueDate) : "—"}</td>
                    <td className="px-5 py-3 text-right">
                      <Money value={inv.balance} className="text-ink" />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Money value={gain} signed className={gain >= 0 ? "text-pos" : "text-neg"} />
                    </td>
                    <td className="num px-5 py-3 text-right text-ink-2">{signedPercent(inv.return12m)}</td>
                    <td className="px-5 py-3 text-right">
                      <div className="ml-auto flex w-24 items-center justify-end gap-2">
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
                          <div className="h-full rounded-full bg-rose" style={{ width: `${(inv.balance / sorted[0].balance) * 100}%` }} />
                        </div>
                        <span className="num w-10 text-right text-xs text-ink-3">{percent(inv.balance / pf.total)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {tools}

      <p className="mt-4 text-xs text-ink-3">
        {d.cdiIsReal || d.source === "mock" ? "CDI: série 12 do SGS do Banco Central." : "CDI estimado (não consegui acessar o Banco Central agora)."}{" "}
        {d.source === "pluggy" ? "A curva da carteira usa a rentabilidade de 12 meses informada pela instituição, distribuída mês a mês. " : ""}A rentabilidade é uma aproximação (saldo atual ÷ aportes líquidos) e pode
        diferir do app da corretora.
      </p>
    </div>
  );
}
