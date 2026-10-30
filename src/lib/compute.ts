/**
 * Cálculos puros sobre os dados (sem I/O). São os mesmos na versão mock e na
 * versão real com Supabase, e são o alvo principal dos testes unitários.
 */
import { addMonths, money, monthLabel, percent } from "./format";
import type {
  AiReport,
  Budget,
  Category,
  Goal,
  Investment,
  NetWorthPoint,
  Transaction,
} from "./types";

const r2 = (v: number) => Math.round(v * 100) / 100;

export const isSpending = (t: Transaction) => !t.isInternalTransfer && t.amount < 0;
export const isIncome = (t: Transaction) => !t.isInternalTransfer && t.amount > 0;

export function inMonth(txs: Transaction[], ym: string) {
  return txs.filter((t) => t.date.startsWith(ym));
}

export function monthSummary(txs: Transaction[], ym: string) {
  const list = inMonth(txs, ym);
  const income = r2(list.filter(isIncome).reduce((s, t) => s + t.amount, 0));
  const expense = r2(-list.filter(isSpending).reduce((s, t) => s + t.amount, 0));
  const net = r2(income - expense);
  const savingsRate = income > 0 ? net / income : 0;
  return { ym, income, expense, net, savingsRate, count: list.length };
}

export function monthlySeries(txs: Transaction[], months: string[]) {
  return months.map((ym) => monthSummary(txs, ym));
}

/** Média de despesas dos `n` meses fechados anteriores a `ym`. */
export function avgExpense(txs: Transaction[], ym: string, n: number) {
  const prev = Array.from({ length: n }, (_, i) => addMonths(ym, -(i + 1)));
  const total = prev.reduce((s, m) => s + monthSummary(txs, m).expense, 0);
  return r2(total / n);
}

export function spendByCategory(txs: Transaction[], ym: string, categories: Category[]) {
  const map = new Map<string, number>();
  for (const t of inMonth(txs, ym)) {
    if (!isSpending(t)) continue;
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) - t.amount);
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0);
  return [...map.entries()]
    .map(([categoryId, value]) => ({
      categoryId,
      name: categories.find((c) => c.id === categoryId)?.name ?? categoryId,
      value: r2(value),
      share: total ? value / total : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

export function budgetProgress(
  txs: Transaction[],
  ym: string,
  budgets: Budget[],
  categories: Category[],
) {
  const spend = spendByCategory(txs, ym, categories);
  return budgets
    .map((b) => {
      const spent = spend.find((s) => s.categoryId === b.categoryId)?.value ?? 0;
      return {
        categoryId: b.categoryId,
        name: categories.find((c) => c.id === b.categoryId)?.name ?? b.categoryId,
        budget: b.amount,
        spent,
        ratio: b.amount ? spent / b.amount : 0,
        remaining: r2(b.amount - spent),
      };
    })
    .sort((a, b) => b.ratio - a.ratio);
}

/** Assinaturas: mesma descrição, valor parecido (±10%), nos 3 últimos meses fechados. */
export function detectRecurring(txs: Transaction[], ym: string) {
  const months = [1, 2, 3].map((i) => addMonths(ym, -i));
  const byDesc = new Map<string, Transaction[]>();
  for (const t of txs) {
    if (!isSpending(t) || t.installment) continue;
    if (!months.some((m) => t.date.startsWith(m))) continue;
    const key = t.description.trim().toUpperCase();
    byDesc.set(key, [...(byDesc.get(key) ?? []), t]);
  }
  const out: { description: string; amount: number; categoryId: string; lastDate: string }[] = [];
  for (const [desc, list] of byDesc) {
    const hit = months.every((m) => list.some((t) => t.date.startsWith(m)));
    if (!hit) continue;
    const vals = list.map((t) => -t.amount);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    if (vals.every((v) => Math.abs(v - avg) / avg <= 0.1) && avg < 500) {
      out.push({
        description: desc,
        amount: r2(avg),
        categoryId: list[0].categoryId,
        lastDate: list.map((t) => t.date).sort().at(-1)!,
      });
    }
  }
  return out.sort((a, b) => b.amount - a.amount);
}

export function portfolio(investments: Investment[]) {
  const total = r2(investments.reduce((s, i) => s + i.balance, 0));
  const invested = r2(investments.reduce((s, i) => s + i.amountOriginal, 0));
  const profit = r2(total - invested);
  const group = (key: "type" | "institution") => {
    const m = new Map<string, number>();
    for (const i of investments) m.set(i[key], (m.get(i[key]) ?? 0) + i.balance);
    return [...m.entries()]
      .map(([name, value]) => ({ name, value: r2(value), share: total ? value / total : 0 }))
      .sort((a, b) => b.value - a.value);
  };
  const return12m = total
    ? investments.reduce((s, i) => s + i.return12m * i.balance, 0) / total
    : 0;
  return {
    total,
    invested,
    profit,
    profitPct: invested ? profit / invested : 0,
    return12m,
    byType: group("type"),
    byInstitution: group("institution"),
  };
}

export function cdiComparison(series: NetWorthPoint[]) {
  const first = series[0];
  const last = series.at(-1)!;
  const portfolio12m = last.portfolioIndex / first.portfolioIndex - 1;
  const cdi12m = last.cdiIndex / first.cdiIndex - 1;
  const prev = series.at(-2)!;
  return {
    portfolio12m,
    cdi12m,
    pctOfCdi: cdi12m ? portfolio12m / cdi12m : 0,
    portfolioMonth: last.portfolioIndex / prev.portfolioIndex - 1,
    cdiMonth: last.cdiIndex / prev.cdiIndex - 1,
  };
}

export function emergencyFund(avgMonthlyExpense: number, current: number, months = 6) {
  const target = r2(avgMonthlyExpense * months);
  return {
    target,
    current,
    ratio: target ? current / target : 0,
    monthsCovered: avgMonthlyExpense ? current / avgMonthlyExpense : 0,
    missing: r2(Math.max(0, target - current)),
  };
}

/** Quanto guardar por mês para chegar no alvo na data. */
export function goalPlan(goal: Goal, today: string) {
  const [ty, tm] = today.split("-").map(Number);
  const [gy, gm] = goal.targetDate.split("-").map(Number);
  const monthsLeft = Math.max(1, (gy - ty) * 12 + (gm - tm));
  const missing = Math.max(0, goal.target - goal.current);
  return {
    ratio: goal.target ? Math.min(1, goal.current / goal.target) : 0,
    missing: r2(missing),
    monthsLeft,
    perMonth: r2(missing / monthsLeft),
  };
}

/**
 * No protótipo, o "relatório da IA" é montado com um template a partir dos
 * agregados. Na Fase 6, os mesmos agregados (e só eles) vão para a Claude API.
 */
export function buildAiInput(args: {
  ym: string;
  txs: Transaction[];
  categories: Category[];
  budgets: Budget[];
  investments: Investment[];
  netWorth: NetWorthPoint[];
}) {
  const { ym, txs, categories, budgets, investments, netWorth } = args;
  const summary = monthSummary(txs, ym);
  const avg3 = avgExpense(txs, ym, 3);
  const byCat = spendByCategory(txs, ym, categories);
  const prevByCat = spendByCategory(txs, addMonths(ym, -1), categories);
  const budget = budgetProgress(txs, ym, budgets, categories);
  const recurring = detectRecurring(txs, addMonths(ym, 1));
  const pf = portfolio(investments);
  const cdi = cdiComparison(netWorth);
  return { summary, avg3, byCat, prevByCat, budget, recurring, pf, cdi };
}

export function mockAiReport(ym: string, input: ReturnType<typeof buildAiInput>, trigger: "auto" | "manual", createdAt: string): AiReport {
  const { summary, avg3, byCat, prevByCat, budget, recurring, pf, cdi } = input;
  const diff = avg3 ? summary.expense / avg3 - 1 : 0;
  const top = byCat[0];
  const movers = byCat
    .map((c) => ({ ...c, prev: prevByCat.find((p) => p.categoryId === c.categoryId)?.value ?? 0 }))
    .map((c) => ({ ...c, delta: c.value - c.prev }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 2);
  const over = budget.filter((b) => b.ratio > 1);
  const subsTotal = recurring.reduce((s, r) => s + r.amount, 0);
  const topType = pf.byType[0];

  return {
    id: `rep-${ym}-${trigger}`,
    period: ym,
    trigger,
    createdAt,
    title: `Resumo de ${monthLabel(ym)}`,
    summary:
      `Você gastou ${money(summary.expense)} em ${monthLabel(ym)}, ` +
      `${diff >= 0 ? `${percent(diff)} acima` : `${percent(-diff)} abaixo`} da média dos 3 meses anteriores. ` +
      `Sobraram ${money(summary.net)}, uma taxa de poupança de ${percent(summary.savingsRate)}.`,
    highlights: [
      { label: "Gastos", value: money(summary.expense), tone: diff > 0.05 ? "neg" : "neutral" },
      { label: "Sobrou", value: money(summary.net), tone: summary.net > 0 ? "pos" : "neg" },
      { label: "Carteira 12m", value: `${percent(cdi.pctOfCdi)} do CDI`, tone: cdi.pctOfCdi >= 1 ? "pos" : "neutral" },
    ],
    sections: [
      {
        heading: "Para onde foi o dinheiro",
        body:
          `${top ? `${top.name} foi a maior categoria (${money(top.value)}, ${percent(top.share)} do total). ` : ""}` +
          movers
            .map((m) => `${m.name} ${m.delta >= 0 ? "subiu" : "caiu"} ${money(Math.abs(m.delta))} em relação ao mês anterior.`)
            .join(" "),
      },
      {
        heading: "Orçamento",
        body: over.length
          ? `${over.length} ${over.length === 1 ? "categoria passou" : "categorias passaram"} do limite: ` +
            over.map((o) => `${o.name} (${percent(o.ratio)} do orçado)`).join(", ") + "."
          : "Todas as categorias ficaram dentro do orçamento.",
      },
      {
        heading: "Investimentos",
        body:
          `A carteira soma ${money(pf.total)}, com ${percent(topType?.share ?? 0)} em ${topType?.name.toLowerCase()}. ` +
          `Nos últimos 12 meses rendeu ${percent(cdi.portfolio12m)}, contra ${percent(cdi.cdi12m)} do CDI.`,
      },
    ],
    suggestions: [
      {
        title: "Revisar assinaturas",
        reason: `Você tem ${recurring.length} cobranças recorrentes somando ${money(subsTotal)} por mês. Cancelar uma que você usa pouco libera esse valor todo mês.`,
      },
      ...(over[0]
        ? [{
            title: `Ajustar ${over[0].name.toLowerCase()}`,
            reason: `Ficou ${money(-over[0].remaining)} acima do orçado. Ou o limite está baixo para a sua rotina, ou vale definir um teto semanal.`,
          }]
        : []),
      {
        title: "Diversificar a renda fixa",
        reason: `${percent(topType?.share ?? 0)} da carteira está em ${topType?.name.toLowerCase()}. Isso não é um problema em si, mas vale checar se os vencimentos combinam com as suas metas.`,
      },
    ],
  };
}
