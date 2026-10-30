import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { buildAiInput, mockAiReport } from "@/lib/compute";
import { AnalysisView } from "./view";

export const metadata: Metadata = { title: "Análise" };

export default async function Page() {
  const d = await getData();
  const input = buildAiInput({
    ym: d.currentYm,
    txs: d.transactions,
    categories: d.categories,
    budgets: d.budgets,
    investments: d.investments,
    netWorth: d.netWorth,
  });
  const live = mockAiReport(d.currentYm, input, "manual", new Date().toISOString());
  // Exatamente o que seria enviado à Claude API: só agregados, sem descrições nem contas.
  const payload = {
    periodo: d.currentYm,
    receitas: input.summary.income,
    despesas: input.summary.expense,
    sobra: input.summary.net,
    media_despesas_3m: input.avg3,
    por_categoria: input.byCat.map((c) => ({ categoria: c.name, valor: c.value })),
    orcamento: input.budget.map((b) => ({ categoria: b.name, orcado: b.budget, gasto: b.spent })),
    assinaturas_total_mes: Math.round(input.recurring.reduce((s, r) => s + r.amount, 0) * 100) / 100,
    carteira: {
      total: input.pf.total,
      por_tipo: input.pf.byType.map((t) => ({ tipo: t.name, pct: Math.round(t.share * 1000) / 10 })),
      rent_12m_pct: Math.round(input.cdi.portfolio12m * 1000) / 10,
      cdi_12m_pct: Math.round(input.cdi.cdi12m * 1000) / 10,
    },
  };
  return <AnalysisView reports={d.reports} live={live} payload={payload} />;
}
