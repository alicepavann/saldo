/**
 * Conversão dos objetos da Pluggy para os tipos do painel.
 * Funções puras (sem rede), testadas em map.test.ts.
 */
import type {
  Account as PAccount,
  Category as PCategory,
  Investment as PInvestment,
  Item as PItem,
  Transaction as PTransaction,
} from "pluggy-sdk";
import type {
  Account,
  Connection,
  ConnectionStatus,
  Investment,
  InvestmentType,
  Transaction,
} from "../types";

const r2 = (v: number) => Math.round(v * 100) / 100;
const isoDate = (d: Date | string | null | undefined) =>
  d ? new Date(d).toISOString().slice(0, 10) : null;

export function mapItem(item: PItem): Connection {
  const s = item.status;
  const status: ConnectionStatus =
    s === "UPDATED" || s === "LOGIN_ERROR"
      ? s
      : s === "UPDATING" || s === "MERGING"
        ? "UPDATING"
        : "OUTDATED";
  return {
    itemId: item.id,
    institution: item.connector?.name ?? "Instituição",
    status,
    lastUpdatedAt: new Date(item.lastUpdatedAt ?? item.updatedAt).toISOString(),
    consentExpiresAt: isoDate(item.consentExpiresAt) ?? "2999-12-31",
  };
}

export const MEU_PLUGGY_CONNECTOR_ID = 200;

export function isMeuPluggy(connectorId: number | undefined, name: string) {
  return connectorId === MEU_PLUGGY_CONNECTOR_ID || /^meu ?pluggy$/i.test(name.trim());
}

/** Escolhe um nome legível para a conexão a partir dos nomes de contas/instituições. */
export function institutionNameFrom(
  accountNames: (string | null | undefined)[],
  investmentInstitutions: (string | null | undefined)[],
  index: number,
) {
  const clean = (v: string | null | undefined) => (v ?? "").trim();
  const inst = investmentInstitutions.map(clean).find(Boolean);
  if (inst) return inst;
  const acc = accountNames.map(clean).find(Boolean);
  if (acc) return acc.length > 32 ? `${acc.slice(0, 30)}…` : acc;
  return `Meu Pluggy ${index}`;
}

export function mapAccount(a: PAccount, institution: string): Account {
  const isCredit = a.type === "CREDIT";
  const day = (d: Date | null | undefined) => (d ? new Date(d).getUTCDate() : undefined);
  return {
    id: a.id,
    itemId: a.itemId,
    type: isCredit ? "CREDIT" : "BANK",
    name: a.marketingName || a.name,
    institution,
    last4: (a.number ?? "").replace(/\D/g, "").slice(-4),
    balance: r2(a.balance ?? 0),
    creditLimit: isCredit ? (a.creditData?.creditLimit ?? undefined) : undefined,
    closingDay: isCredit ? day(a.creditData?.balanceCloseDate) : undefined,
    dueDay: isCredit ? day(a.creditData?.balanceDueDate) : undefined,
  };
}

/**
 * Regras para traduzir a categoria da Pluggy (descrição + categoria-pai, em inglês)
 * para as categorias do painel. A primeira regra que casar vence.
 */
const CATEGORY_RULES: [RegExp, string][] = [
  [/same person|same ownership|credit card payment|mesma titularidade|pagamento de fatura/i, "transferencia"],
  [/investment|fixed income|automatic investment|aplica[çc][ãa]o/i, "investimento"],
  [/salary|sal[áa]rio|payroll/i, "salario"],
  [/income|retirement|government aid|non-recurring|entrepreneurial|proceeds|interests? earned/i, "renda-extra"],
  [/rent|housing|utilities|electricity|water|^gas$|urban land|condo|aluguel|telecom|internet|mobile|^tv$/i, "moradia"],
  [/groceries|supermarket|mercado/i, "mercado"],
  [/eating out|food delivery|restaurant|food and drinks|bars?\b|coffee/i, "alimentacao"],
  [/transport|taxi|ride|uber|public transport|parking|tolls?|gas station|fuel|automotive|vehicle|car rental|bicycle|airport|airline|bus tickets/i, "transporte"],
  [/health|pharmacy|dentist|hospital|clinic|optometry|gym|fitness|wellness|sports/i, "saude"],
  [/education|courses?|university|school|bookstore/i, "educacao"],
  [/streaming|digital services|gaming|software|subscription|assinatura/i, "assinaturas"],
  [/cinema|theater|concert|tickets|leisure|travel|accommodation|museum|stadium|lottery|bet|gambling/i, "lazer"],
  [/shopping|clothing|electronics|kids|toys|pet|office supplies|arts|department/i, "compras"],
  [/personal care|beauty|cosmetic/i, "pessoal"],
];

export function categoryFor(text: string): string | null {
  for (const [re, id] of CATEGORY_RULES) if (re.test(text)) return id;
  return null;
}

export function mapTransaction(
  t: PTransaction,
  accountType: "BANK" | "CREDIT",
  categories: Map<string, PCategory>,
): Transaction {
  // Pluggy: em conta corrente o valor já vem com sinal (negativo = saída).
  // Em cartão de crédito, compra vem positiva → invertemos para manter
  // a convenção do painel (negativo = saída).
  const amount = r2(accountType === "CREDIT" ? -t.amount : t.amount);
  const cat = t.categoryId ? categories.get(t.categoryId) : undefined;
  const text = [t.category, cat?.description, cat?.parentDescription].filter(Boolean).join(" | ");
  let categoryId = categoryFor(text);
  if (!categoryId) categoryId = amount > 0 ? "renda-extra" : "outros";
  const meta = t.creditCardMetadata;
  return {
    id: t.id,
    accountId: t.accountId,
    date: new Date(t.date).toISOString().slice(0, 10),
    description: (t.description || t.descriptionRaw || "Sem descrição").trim(),
    amount,
    categoryId,
    categoryLocked: false,
    isInternalTransfer: categoryId === "transferencia" || categoryId === "investimento",
    installment:
      meta?.installmentNumber && meta?.totalInstallments && meta.totalInstallments > 1
        ? { number: meta.installmentNumber, total: meta.totalInstallments }
        : undefined,
  };
}

function investmentType(i: PInvestment): InvestmentType {
  const sub = i.subtype ?? "";
  if (i.type === "FIXED_INCOME") return sub === "TREASURY" ? "Tesouro Direto" : "Renda fixa";
  if (i.type === "EQUITY") return sub === "REAL_ESTATE_FUND" ? "FII" : "Ações e ETFs";
  if (i.type === "ETF") return "Ações e ETFs";
  if (i.type === "MUTUAL_FUND") return "Fundos";
  if (i.type === "SECURITY") return "Previdência";
  return "Outros";
}

/** A Pluggy às vezes manda taxa em % (12,4) e às vezes em fração (0,124). */
export function asFraction(v: number | null | undefined) {
  if (v == null || !Number.isFinite(v)) return null;
  return Math.abs(v) > 1.5 ? v / 100 : v;
}

export function mapInvestment(i: PInvestment, institutionFallback: string): Investment | null {
  if (i.status === "TOTAL_WITHDRAWAL" || !(i.balance > 0)) return null;
  const original = i.amountOriginal ?? (i.amountProfit != null ? i.balance - i.amountProfit : i.balance);
  const rate = asFraction(i.lastTwelveMonthsRate) ?? asFraction(i.annualRate);
  const rateLabel =
    i.rateType && i.rate != null
      ? `${i.rate}% ${i.rateType}`
      : i.fixedAnnualRate != null
        ? `${i.fixedAnnualRate}% a.a.`
        : i.quantity && i.quantity > 1
          ? `${i.quantity} cotas`
          : undefined;
  return {
    id: i.id,
    source: "pluggy",
    name: i.name,
    type: investmentType(i),
    institution: i.institution?.name || institutionFallback,
    balance: r2(i.balance),
    amountOriginal: r2(original),
    dueDate: isoDate(i.dueDate) ?? undefined,
    rateLabel,
    return12m: rate ?? (original > 0 ? i.balance / original - 1 : 0),
  };
}
