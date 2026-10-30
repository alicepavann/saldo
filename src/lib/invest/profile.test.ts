import { describe, expect, it } from "vitest";
import type { Investment } from "../types";
import { TARGETS, classify, currentAllocation, nextContributionPlan, scoreProfile, type Profile } from "./profile";

const base: Profile = {
  objetivo: "longo",
  prazoAnos: 12,
  reacaoQueda: "esperar",
  tolerancia: "media",
  experiencia: "iniciante",
  aporteMensal: 1000,
};

const inv = (p: Partial<Investment>): Investment => ({
  id: Math.random().toString(36),
  source: "pluggy",
  name: "X",
  type: "Renda fixa",
  institution: "B",
  balance: 1000,
  amountOriginal: 900,
  return12m: 0.1,
  ...p,
});

describe("scoreProfile", () => {
  it("classifica nos três perfis", () => {
    expect(scoreProfile({ ...base, objetivo: "reserva", prazoAnos: 1, reacaoQueda: "vender", tolerancia: "baixa" }).profile).toBe("Conservador");
    expect(scoreProfile(base).profile).toBe("Moderado");
    expect(scoreProfile({ ...base, reacaoQueda: "comprar", tolerancia: "alta", experiencia: "avancada" }).profile).toBe("Arrojado");
  });
  it("prazo curto limita o risco", () => {
    expect(scoreProfile({ ...base, prazoAnos: 1, reacaoQueda: "comprar", tolerancia: "alta", experiencia: "avancada" }).profile).toBe("Conservador");
  });
});

describe("alocações", () => {
  it("cada perfil soma 100%", () => {
    for (const t of Object.values(TARGETS)) expect(Object.values(t).reduce((s, v) => s + v!, 0)).toBeCloseTo(1);
  });
  it("classifica pelo tipo e pela taxa", () => {
    expect(classify(inv({ type: "Tesouro Direto", name: "Tesouro IPCA+ 2035", rateLabel: "IPCA + 7%" }))).toBe("Renda fixa IPCA+");
    expect(classify(inv({ type: "Tesouro Direto", name: "Tesouro Selic 2029" }))).toBe("Renda fixa pós-fixada");
    expect(classify(inv({ type: "FII" }))).toBe("Fundos imobiliários");
    expect(classify(inv({ type: "Ações e ETFs", name: "IVVB11" }))).toBe("Exterior");
    expect(currentAllocation([inv({}), inv({ type: "FII" })]).find((a) => a.cls === "Fundos imobiliários")!.share).toBe(0.5);
  });
});

describe("nextContributionPlan", () => {
  it("completa a reserva antes de tudo", () => {
    const plan = nextContributionPlan({ profile: "Moderado", investments: [], monthly: 1000, reserveMissing: 600 });
    expect(plan[0]).toEqual({ cls: "Reserva (liquidez diária)", amount: 600 });
    expect(plan.reduce((s, p) => s + p.amount, 0)).toBeCloseTo(1000, 0);
  });
  it("manda mais para a classe mais abaixo do alvo", () => {
    const plan = nextContributionPlan({
      profile: "Moderado",
      investments: [inv({ balance: 10000 })], // tudo em pós-fixado
      monthly: 1000,
      reserveMissing: 0,
    });
    expect(plan.find((p) => p.cls === "Renda fixa pós-fixada")).toBeUndefined();
    expect(plan.reduce((s, p) => s + p.amount, 0)).toBeCloseTo(1000, 0);
  });
});
