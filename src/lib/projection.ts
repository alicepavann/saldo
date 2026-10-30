/**
 * Simulação de patrimônio com aportes mensais (juros compostos mensais).
 * Funções puras, testadas em projection.test.ts.
 */

export interface ProjectionInput {
  initial: number; // quanto já tenho investido
  monthly: number; // aporte mensal
  annualRate: number; // fração, ex.: 0.12 = 12% a.a. (bruto)
  years: number;
  annualRaise?: number; // reajuste anual do aporte (fração), ex.: 0.05
  inflation?: number; // inflação anual (fração) para o valor "de hoje"
}

export interface ProjectionPoint {
  month: number; // 0..n
  year: number; // 0, 1, 2…
  balance: number;
  contributed: number; // inicial + aportes
  interest: number; // balance - contributed
  real: number; // balance em reais de hoje
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export const monthlyFromAnnual = (a: number) => Math.pow(1 + a, 1 / 12) - 1;

export function project(input: ProjectionInput): ProjectionPoint[] {
  const months = Math.max(1, Math.round(input.years * 12));
  const rm = monthlyFromAnnual(input.annualRate);
  const im = monthlyFromAnnual(input.inflation ?? 0);
  let balance = input.initial;
  let contributed = input.initial;
  let aporte = input.monthly;
  const out: ProjectionPoint[] = [
    { month: 0, year: 0, balance: r2(balance), contributed: r2(contributed), interest: 0, real: r2(balance) },
  ];
  for (let m = 1; m <= months; m++) {
    if (m > 1 && (m - 1) % 12 === 0) aporte *= 1 + (input.annualRaise ?? 0);
    balance = balance * (1 + rm) + aporte; // aporte no fim do mês
    contributed += aporte;
    out.push({
      month: m,
      year: m / 12,
      balance: r2(balance),
      contributed: r2(contributed),
      interest: r2(balance - contributed),
      real: r2(balance / Math.pow(1 + im, m)),
    });
  }
  return out;
}

/**
 * IR regressivo de renda fixa sobre o ganho, pelo prazo total.
 * Aproximação: considera que todo o ganho fica pelo prazo inteiro.
 */
export function fixedIncomeTaxRate(months: number) {
  const days = months * 30;
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.2;
  if (days <= 720) return 0.175;
  return 0.15;
}

/** Quanto preciso aportar por mês para chegar em `target` em `years`. */
export function monthlyNeeded(target: number, initial: number, annualRate: number, years: number) {
  const n = Math.max(1, Math.round(years * 12));
  const rm = monthlyFromAnnual(annualRate);
  const fvInitial = initial * Math.pow(1 + rm, n);
  if (fvInitial >= target) return 0;
  const factor = rm === 0 ? n : (Math.pow(1 + rm, n) - 1) / rm;
  return r2((target - fvInitial) / factor);
}
