import { describe, expect, it } from "vitest";
import {
  avgExpense,
  budgetProgress,
  detectRecurring,
  emergencyFund,
  goalPlan,
  monthSummary,
  portfolio,
  spendByCategory,
} from "./compute";
import { moneyCompact } from "./format";
import { buildMock, CATEGORIES } from "./mock";
import type { Transaction } from "./types";

const tx = (p: Partial<Transaction>): Transaction => ({
  id: Math.random().toString(36),
  accountId: "a",
  date: "2026-09-10",
  description: "X",
  amount: -10,
  categoryId: "outros",
  categoryLocked: false,
  isInternalTransfer: false,
  ...p,
});

describe("monthSummary", () => {
  it("ignora transferências internas nos totais", () => {
    const txs = [
      tx({ amount: 5000, categoryId: "salario" }),
      tx({ amount: -1200, categoryId: "moradia" }),
      tx({ amount: -2000, isInternalTransfer: true }),
      tx({ amount: 2000, isInternalTransfer: true }),
    ];
    const s = monthSummary(txs, "2026-09");
    expect(s.income).toBe(5000);
    expect(s.expense).toBe(1200);
    expect(s.net).toBe(3800);
    expect(s.savingsRate).toBeCloseTo(0.76);
  });
});

describe("avgExpense", () => {
  it("usa só os meses anteriores ao informado", () => {
    const txs = [
      tx({ date: "2026-07-05", amount: -300 }),
      tx({ date: "2026-08-05", amount: -600 }),
      tx({ date: "2026-09-05", amount: -900 }),
      tx({ date: "2026-10-05", amount: -9999 }),
    ];
    expect(avgExpense(txs, "2026-10", 3)).toBe(600);
  });
});

describe("spendByCategory / budgetProgress", () => {
  it("soma por categoria e calcula a proporção do orçamento", () => {
    const txs = [
      tx({ categoryId: "mercado", amount: -100 }),
      tx({ categoryId: "mercado", amount: -50 }),
      tx({ categoryId: "lazer", amount: -50 }),
    ];
    const cats = spendByCategory(txs, "2026-09", CATEGORIES);
    expect(cats[0]).toMatchObject({ categoryId: "mercado", value: 150, share: 0.75 });
    const b = budgetProgress(txs, "2026-09", [{ categoryId: "mercado", amount: 100 }], CATEGORIES);
    expect(b[0].ratio).toBe(1.5);
    expect(b[0].remaining).toBe(-50);
  });
});

describe("detectRecurring", () => {
  it("encontra cobranças iguais em 3 meses seguidos", () => {
    const txs = ["2026-07", "2026-08", "2026-09"].map((m) =>
      tx({ date: `${m}-02`, description: "SPOTIFY", amount: -21.9, categoryId: "assinaturas" }),
    );
    txs.push(tx({ date: "2026-09-03", description: "CINEMA", amount: -40 }));
    const r = detectRecurring(txs, "2026-10");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ description: "SPOTIFY", amount: 21.9 });
  });
});

describe("reserva e metas", () => {
  it("calcula meses cobertos e quanto falta", () => {
    const e = emergencyFund(4000, 12000, 6);
    expect(e.target).toBe(24000);
    expect(e.monthsCovered).toBe(3);
    expect(e.missing).toBe(12000);
  });
  it("divide o que falta pelos meses até a data", () => {
    const p = goalPlan(
      { id: "g", name: "Viagem", target: 12000, current: 6000, targetDate: "2027-10-01" },
      "2026-10-28",
    );
    expect(p.monthsLeft).toBe(12);
    expect(p.perMonth).toBe(500);
  });
});

describe("portfolio", () => {
  it("agrega saldo, ganho e alocação", () => {
    const d = buildMock(new Date("2026-10-28T12:00:00Z"));
    const pf = portfolio(d.investments);
    expect(pf.total).toBeGreaterThan(0);
    expect(pf.byType.reduce((s, t) => s + t.share, 0)).toBeCloseTo(1);
  });
});

describe("format", () => {
  it("formata compacto do mesmo jeito no servidor e no navegador", () => {
    expect(moneyCompact(4992.58)).toBe("R$ 5 mil");
    expect(moneyCompact(26524)).toBe("R$ 26,5 mil");
    expect(moneyCompact(1_250_000)).toBe("R$ 1,3 mi");
  });
});
