import { describe, expect, it } from "vitest";
import { fixedIncomeTaxRate, monthlyFromAnnual, monthlyNeeded, project } from "./projection";

describe("project", () => {
  it("sem juros é só a soma dos aportes", () => {
    const p = project({ initial: 1000, monthly: 100, annualRate: 0, years: 1 });
    expect(p.at(-1)).toMatchObject({ balance: 2200, contributed: 2200, interest: 0 });
    expect(p).toHaveLength(13);
  });

  it("bate com a fórmula de valor futuro", () => {
    const rm = monthlyFromAnnual(0.12);
    const n = 120;
    const fv = 10000 * (1 + rm) ** n + 500 * (((1 + rm) ** n - 1) / rm);
    const p = project({ initial: 10000, monthly: 500, annualRate: 0.12, years: 10 });
    expect(p.at(-1)!.balance).toBeCloseTo(fv, 0);
    expect(p.at(-1)!.contributed).toBe(70000);
  });

  it("reajusta o aporte a cada 12 meses e desconta a inflação", () => {
    const p = project({ initial: 0, monthly: 100, annualRate: 0, years: 2, annualRaise: 0.1, inflation: 0.05 });
    expect(p.at(-1)!.contributed).toBeCloseTo(12 * 100 + 12 * 110);
    expect(p.at(-1)!.real).toBeCloseTo(2520 / 1.05 ** 2, 0);
  });
});

describe("monthlyNeeded", () => {
  it("é o inverso da projeção", () => {
    const need = monthlyNeeded(100000, 5000, 0.1, 8);
    const p = project({ initial: 5000, monthly: need, annualRate: 0.1, years: 8 });
    expect(p.at(-1)!.balance).toBeCloseTo(100000, -1);
  });
  it("é zero se o que já tenho basta", () => {
    expect(monthlyNeeded(1000, 5000, 0.1, 1)).toBe(0);
  });
});

describe("IR regressivo", () => {
  it("segue a tabela", () => {
    expect(fixedIncomeTaxRate(5)).toBe(0.225);
    expect(fixedIncomeTaxRate(11)).toBe(0.2);
    expect(fixedIncomeTaxRate(18)).toBe(0.175);
    expect(fixedIncomeTaxRate(36)).toBe(0.15);
  });
});
