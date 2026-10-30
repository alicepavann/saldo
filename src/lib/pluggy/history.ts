/**
 * Sem banco de dados ainda não existe histórico de saldos. Aqui ele é
 * reconstruído "de trás para frente" a partir do saldo de hoje e das
 * transações. É uma aproximação, trocada pelos snapshots diários do
 * Supabase quando eles existirem.
 */
import type { Account, Investment, NetWorthPoint, Transaction } from "../types";

const r2 = (v: number) => Math.round(v * 100) / 100;

export function rebuildNetWorth(args: {
  months: string[]; // 12 meses, do mais antigo ao atual
  accounts: Account[];
  transactions: Transaction[];
  investments: Investment[];
  cdiMonthly: Map<string, number> | null;
}): { series: NetWorthPoint[]; cdiIsReal: boolean } {
  const { months, accounts, transactions, investments, cdiMonthly } = args;
  const bankIds = new Set(accounts.filter((a) => a.type === "BANK").map((a) => a.id));
  const cardIds = new Set(accounts.filter((a) => a.type === "CREDIT").map((a) => a.id));
  const cashNow = accounts.filter((a) => a.type === "BANK").reduce((s, a) => s + a.balance, 0);
  const debtNow = accounts.filter((a) => a.type === "CREDIT").reduce((s, a) => s + a.balance, 0);
  const invNow = investments.reduce((s, i) => s + i.balance, 0);

  // Rendimento mensal médio da carteira (ponderado pelo saldo) para a curva "Carteira".
  const withRate = investments.filter((i) => Number.isFinite(i.return12m));
  const w = withRate.reduce((s, i) => s + i.balance, 0);
  const r12 = w ? withRate.reduce((s, i) => s + i.return12m * i.balance, 0) / w : 0;
  const rMonth = Math.pow(1 + r12, 1 / 12) - 1;

  let cdiIdx = 1;
  let pfIdx = 1;
  const series = months.map((ym, i) => {
    const after = (t: Transaction) => t.date.slice(0, 7) > ym;
    const cashFlowAfter = transactions
      .filter((t) => bankIds.has(t.accountId) && after(t))
      .reduce((s, t) => s + t.amount, 0);
    const contribAfter = -transactions
      .filter((t) => t.categoryId === "investimento" && bankIds.has(t.accountId) && after(t))
      .reduce((s, t) => s + t.amount, 0);
    const cardMonth = -transactions
      .filter((t) => cardIds.has(t.accountId) && t.date.startsWith(ym))
      .reduce((s, t) => s + t.amount, 0);

    const isLast = i === months.length - 1;
    const cash = isLast ? cashNow : cashNow - cashFlowAfter;
    const inv = Math.max(0, invNow - contribAfter);
    const debt = isLast ? debtNow : Math.max(0, cardMonth);

    if (i > 0) {
      cdiIdx *= cdiMonthly?.get(ym) ?? 1.0105;
      pfIdx *= 1 + rMonth;
    }
    return {
      month: ym,
      cash: r2(cash),
      investments: r2(inv),
      cardDebt: r2(debt),
      netWorth: r2(cash + inv - debt),
      invested: r2(inv),
      cdiIndex: cdiIdx,
      portfolioIndex: pfIdx,
    };
  });
  return { series, cdiIsReal: !!cdiMonthly };
}
