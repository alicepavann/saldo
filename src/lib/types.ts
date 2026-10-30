// Tipos de domínio. Espelham as tabelas do Supabase descritas na spec.

export type ConnectionStatus = "UPDATED" | "UPDATING" | "OUTDATED" | "LOGIN_ERROR";

export interface Connection {
  itemId: string;
  institution: string;
  status: ConnectionStatus;
  lastUpdatedAt: string; // ISO
  consentExpiresAt: string; // ISO date
}

export type AccountType = "BANK" | "CREDIT";

export interface Account {
  id: string;
  itemId: string;
  type: AccountType;
  name: string;
  institution: string;
  last4: string;
  balance: number; // conta: saldo; cartão: fatura em aberto (positivo = devo)
  creditLimit?: number;
  closingDay?: number;
  dueDay?: number;
}

export type CategoryKind = "expense" | "income" | "transfer" | "investment";

export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
}

export interface Transaction {
  id: string;
  accountId: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // negativo = saída
  categoryId: string;
  categoryLocked: boolean;
  isInternalTransfer: boolean;
  installment?: { number: number; total: number };
}

export interface Budget {
  categoryId: string;
  amount: number;
}

export type InvestmentType =
  | "Renda fixa"
  | "Tesouro Direto"
  | "FII"
  | "Ações e ETFs"
  | "Fundos"
  | "Previdência"
  | "Outros";

export interface Investment {
  id: string;
  source: "pluggy" | "b3";
  name: string;
  type: InvestmentType;
  institution: string;
  balance: number;
  amountOriginal: number; // aportes líquidos
  dueDate?: string;
  rateLabel?: string;
  return12m: number; // fração, ex.: 0.124
}

export interface NetWorthPoint {
  month: string; // YYYY-MM
  cash: number;
  investments: number;
  cardDebt: number;
  netWorth: number;
  invested: number; // aportes acumulados (para comparar com CDI)
  cdiIndex: number; // valor de 1 real aplicado no CDI desde o início
  portfolioIndex: number;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  targetDate: string; // YYYY-MM-DD
  current: number;
  isEmergencyFund?: boolean;
  note?: string;
}

export interface SyncRun {
  id: string;
  startedAt: string;
  durationMs: number;
  status: "ok" | "partial" | "error";
  records: number;
  note?: string;
}

export interface CategoryRule {
  id: string;
  pattern: string;
  categoryId: string;
}

export interface AiReport {
  id: string;
  period: string; // YYYY-MM
  trigger: "auto" | "manual";
  createdAt: string;
  title: string;
  summary: string;
  highlights: { label: string; value: string; tone?: "pos" | "neg" | "neutral" }[];
  sections: { heading: string; body: string }[];
  suggestions: { title: string; reason: string }[];
}
