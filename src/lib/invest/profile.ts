/**
 * Perfil de investidor (questionário curto, inspirado no suitability) e
 * alocação de referência por perfil. Funções puras, testadas em profile.test.ts.
 *
 * A alocação de referência é um ponto de partida educativo, não uma
 * recomendação individual (ver aviso na tela).
 */
import { z } from "zod";
import type { Investment } from "../types";

export const ProfileSchema = z.object({
  objetivo: z.enum(["reserva", "curto", "medio", "longo", "aposentadoria"]),
  prazoAnos: z.number().min(0).max(60),
  reacaoQueda: z.enum(["vender", "esperar", "comprar"]),
  tolerancia: z.enum(["baixa", "media", "alta"]),
  experiencia: z.enum(["iniciante", "intermediaria", "avancada"]),
  aporteMensal: z.number().min(0).max(1_000_000),
});
export type Profile = z.infer<typeof ProfileSchema>;

export type RiskProfile = "Conservador" | "Moderado" | "Arrojado";

export const ASSET_CLASSES = [
  "Reserva (liquidez diária)",
  "Renda fixa pós-fixada",
  "Renda fixa IPCA+",
  "Renda fixa prefixada",
  "Fundos imobiliários",
  "Ações e ETFs Brasil",
  "Exterior",
] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export function scoreProfile(p: Profile): { score: number; profile: RiskProfile } {
  let s = 0;
  s += { reserva: 0, curto: 1, medio: 2, longo: 3, aposentadoria: 3 }[p.objetivo];
  s += p.prazoAnos < 2 ? 0 : p.prazoAnos < 5 ? 1 : p.prazoAnos < 10 ? 2 : 3;
  s += { vender: 0, esperar: 2, comprar: 3 }[p.reacaoQueda];
  s += { baixa: 0, media: 2, alta: 3 }[p.tolerancia];
  s += { iniciante: 0, intermediaria: 1, avancada: 2 }[p.experiencia];
  // Prazo curto limita o risco, qualquer que seja a tolerância.
  const capped = p.prazoAnos < 2 ? Math.min(s, 5) : s;
  const profile: RiskProfile = capped <= 5 ? "Conservador" : capped <= 10 ? "Moderado" : "Arrojado";
  return { score: capped, profile };
}

/** Alocação de referência (fora a reserva de emergência), em fração. */
export const TARGETS: Record<RiskProfile, Partial<Record<AssetClass, number>>> = {
  Conservador: {
    "Renda fixa pós-fixada": 0.6,
    "Renda fixa IPCA+": 0.25,
    "Renda fixa prefixada": 0.1,
    "Fundos imobiliários": 0.05,
  },
  Moderado: {
    "Renda fixa pós-fixada": 0.35,
    "Renda fixa IPCA+": 0.25,
    "Renda fixa prefixada": 0.1,
    "Fundos imobiliários": 0.1,
    "Ações e ETFs Brasil": 0.12,
    Exterior: 0.08,
  },
  Arrojado: {
    "Renda fixa pós-fixada": 0.2,
    "Renda fixa IPCA+": 0.2,
    "Renda fixa prefixada": 0.05,
    "Fundos imobiliários": 0.12,
    "Ações e ETFs Brasil": 0.25,
    Exterior: 0.18,
  },
};

/** Em que classe cai cada investimento (heurística pelo tipo e pelo texto da taxa). */
export function classify(i: Investment): AssetClass {
  const t = `${i.name} ${i.rateLabel ?? ""}`.toLowerCase();
  if (i.type === "FII") return "Fundos imobiliários";
  if (i.type === "Ações e ETFs") return /ivvb|nasd|spx|wrld|exterior|bdr/.test(t) ? "Exterior" : "Ações e ETFs Brasil";
  if (i.type === "Previdência" || i.type === "Fundos" || i.type === "Outros") {
    if (/ações|acoes|equity|ibov|small/.test(t)) return "Ações e ETFs Brasil";
    if (/exterior|global|internacional|s&p/.test(t)) return "Exterior";
    return "Renda fixa pós-fixada";
  }
  if (/ipca|inflação|inflacao|ntn-?b/.test(t)) return "Renda fixa IPCA+";
  if (/prefix|pré|pre-?fix|ltn|% a\.a\./.test(t) && !/cdi|selic/.test(t)) return "Renda fixa prefixada";
  return "Renda fixa pós-fixada";
}

export function currentAllocation(investments: Investment[]) {
  const total = investments.reduce((s, i) => s + i.balance, 0);
  const by = new Map<AssetClass, number>();
  for (const i of investments) by.set(classify(i), (by.get(classify(i)) ?? 0) + i.balance);
  return ASSET_CLASSES.map((c) => ({
    cls: c,
    value: Math.round((by.get(c) ?? 0) * 100) / 100,
    share: total ? (by.get(c) ?? 0) / total : 0,
  }));
}

/**
 * Para onde mandar o próximo aporte: primeiro completa a reserva; depois
 * distribui proporcionalmente ao que falta para chegar na alocação alvo
 * (sem vender nada).
 */
export function nextContributionPlan(args: {
  profile: RiskProfile;
  investments: Investment[];
  monthly: number;
  reserveMissing: number;
}) {
  const { profile, investments, monthly, reserveMissing } = args;
  const plan: { cls: AssetClass; amount: number }[] = [];
  let left = monthly;
  if (reserveMissing > 0 && left > 0) {
    const toReserve = Math.min(left, reserveMissing);
    plan.push({ cls: "Reserva (liquidez diária)", amount: Math.round(toReserve * 100) / 100 });
    left -= toReserve;
  }
  if (left <= 0) return plan;

  const target = TARGETS[profile];
  const alloc = currentAllocation(investments);
  const totalAfter = alloc.reduce((s, a) => s + a.value, 0) + left;
  const gaps = (Object.keys(target) as AssetClass[]).map((cls) => {
    const now = alloc.find((a) => a.cls === cls)?.value ?? 0;
    return { cls, gap: Math.max(0, target[cls]! * totalAfter - now) };
  });
  const gapSum = gaps.reduce((s, g) => s + g.gap, 0);
  for (const g of gaps) {
    const amount = gapSum > 0 ? (g.gap / gapSum) * left : target[g.cls]! * left;
    if (amount >= 1) plan.push({ cls: g.cls, amount: Math.round(amount * 100) / 100 });
  }
  return plan;
}

/** Exemplos genéricos de produto por classe (sem indicar emissor ou ativo específico). */
export const PRODUCT_EXAMPLES: Record<AssetClass, string> = {
  "Reserva (liquidez diária)": "Tesouro Selic ou CDB com liquidez diária a 100% do CDI ou mais",
  "Renda fixa pós-fixada": "CDB, LCI/LCA ou fundo DI de taxa baixa, com vencimento compatível com o objetivo",
  "Renda fixa IPCA+": "Tesouro IPCA+ ou títulos IPCA+ com vencimento perto da data do objetivo",
  "Renda fixa prefixada": "Tesouro Prefixado ou CDB prefixado, só para prazos que você leva até o vencimento",
  "Fundos imobiliários": "Cesta de FIIs diversificada (tijolo e papel) ou ETF de FIIs",
  "Ações e ETFs Brasil": "ETF amplo de índice brasileiro, com aportes mensais",
  Exterior: "ETF de índice global/americano negociado na B3",
};
