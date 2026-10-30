/**
 * Dados de exemplo para o protótipo (DATA_SOURCE=mock).
 * São gerados de forma determinística (mesma semente = mesmos números),
 * relativos ao mês atual, para o painel parecer "vivo" no localhost.
 * Quando a integração com a Pluggy/Supabase entrar, este arquivo deixa de ser usado.
 */
import { addMonths, ymOf } from "./format";
import type {
  Account,
  AiReport,
  Budget,
  Category,
  CategoryRule,
  Connection,
  Goal,
  Investment,
  NetWorthPoint,
  SyncRun,
  Transaction,
} from "./types";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export const CATEGORIES: Category[] = [
  { id: "moradia", name: "Moradia", kind: "expense" },
  { id: "mercado", name: "Mercado", kind: "expense" },
  { id: "alimentacao", name: "Alimentação fora", kind: "expense" },
  { id: "transporte", name: "Transporte", kind: "expense" },
  { id: "saude", name: "Saúde", kind: "expense" },
  { id: "educacao", name: "Educação", kind: "expense" },
  { id: "lazer", name: "Lazer", kind: "expense" },
  { id: "assinaturas", name: "Assinaturas", kind: "expense" },
  { id: "compras", name: "Compras", kind: "expense" },
  { id: "pessoal", name: "Pessoal", kind: "expense" },
  { id: "outros", name: "Outros", kind: "expense" },
  { id: "salario", name: "Salário", kind: "income" },
  { id: "renda-extra", name: "Renda extra", kind: "income" },
  { id: "transferencia", name: "Transferência interna", kind: "transfer" },
  { id: "investimento", name: "Aporte em investimento", kind: "investment" },
];

export const BUDGETS: Budget[] = [
  { categoryId: "moradia", amount: 1950 },
  { categoryId: "mercado", amount: 900 },
  { categoryId: "alimentacao", amount: 450 },
  { categoryId: "transporte", amount: 380 },
  { categoryId: "saude", amount: 250 },
  { categoryId: "educacao", amount: 200 },
  { categoryId: "lazer", amount: 350 },
  { categoryId: "assinaturas", amount: 230 },
  { categoryId: "compras", amount: 400 },
  { categoryId: "pessoal", amount: 200 },
];

export const RULES: CategoryRule[] = [
  { id: "r1", pattern: "IFOOD", categoryId: "alimentacao" },
  { id: "r2", pattern: "UBER", categoryId: "transporte" },
  { id: "r3", pattern: "SMART FIT", categoryId: "saude" },
  { id: "r4", pattern: "PAG FATURA", categoryId: "transferencia" },
];

export function buildMock(today = new Date()) {
  const rnd = mulberry32(20261028);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
  const between = (a: number, b: number) => a + rnd() * (b - a);

  const currentYm = ymOf(today);
  const todayDay = today.getDate();
  const months = Array.from({ length: 13 }, (_, i) => addMonths(currentYm, i - 12));

  const iso = (d: Date) => d.toISOString();
  const daysFromNow = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const lastSync = new Date(today);
  lastSync.setHours(6, 4, 0, 0);
  if (lastSync > today) lastSync.setDate(lastSync.getDate() - 1);

  const connections: Connection[] = [
    { itemId: "a3f1c2e8-…-nubank", institution: "Nubank", status: "UPDATED", lastUpdatedAt: iso(lastSync), consentExpiresAt: daysFromNow(286) },
    { itemId: "7bd09e41-…-itau", institution: "Itaú", status: "UPDATED", lastUpdatedAt: iso(lastSync), consentExpiresAt: daysFromNow(21) },
    { itemId: "c55e2a90-…-inter", institution: "Inter", status: "UPDATED", lastUpdatedAt: iso(lastSync), consentExpiresAt: daysFromNow(198) },
    { itemId: "e81f6b37-…-xp", institution: "XP Investimentos", status: "UPDATED", lastUpdatedAt: iso(lastSync), consentExpiresAt: daysFromNow(331) },
  ];

  const accounts: Account[] = [
    { id: "acc-nu", itemId: connections[0].itemId, type: "BANK", name: "Conta Nubank", institution: "Nubank", last4: "4821", balance: 0 },
    { id: "acc-itau", itemId: connections[1].itemId, type: "BANK", name: "Conta Itaú", institution: "Itaú", last4: "0937", balance: 0 },
    { id: "card-nu", itemId: connections[0].itemId, type: "CREDIT", name: "Nubank Ultravioleta", institution: "Nubank", last4: "7710", balance: 0, creditLimit: 6500, closingDay: 3, dueDay: 10 },
    { id: "card-inter", itemId: connections[2].itemId, type: "CREDIT", name: "Inter Gold", institution: "Inter", last4: "2295", balance: 0, creditLimit: 6000, closingDay: 20, dueDay: 27 },
  ];

  const txs: Transaction[] = [];
  let seq = 0;
  const add = (
    ym: string,
    day: number,
    accountId: string,
    description: string,
    amount: number,
    categoryId: string,
    extra: Partial<Transaction> = {},
  ) => {
    if (ym === currentYm && day > todayDay) return;
    const [y, m] = ym.split("-").map(Number);
    const maxDay = new Date(y, m, 0).getDate();
    const d = Math.min(day, maxDay);
    txs.push({
      id: `tx-${++seq}`,
      accountId,
      date: `${ym}-${String(d).padStart(2, "0")}`,
      description,
      amount: r2(amount),
      categoryId,
      categoryLocked: false,
      isInternalTransfer: categoryId === "transferencia" || categoryId === "investimento",
      ...extra,
    });
  };

  const markets = ["ZAFFARI", "CARREFOUR HIPER", "PAO DE ACUCAR", "ASSAI ATACADISTA", "HORTIFRUTI BOM DIA", "OXXO"];
  const food = ["IFOOD *RESTAURANTE", "IFOOD *SUSHI", "BURGER KING", "CAFE CAMPESINO", "STARBUCKS", "PADARIA REAL"];
  const fun = ["CINEMARK", "SYMPLA *SHOW", "BAR DO ZE", "STEAM PURCHASE", "LIVRARIA CULTURA"];
  const shop = ["AMAZON MARKETPLACE", "MERCADOLIVRE", "SHEIN", "RENNER", "KABUM"];
  const personal = ["SALAO BELEZA", "SEPHORA", "BOTICARIO"];

  months.forEach((ym, idx) => {
    const season = 1 + 0.08 * Math.sin(idx / 2);
    // Receitas
    add(ym, 5, "acc-itau", "SALARIO SOLARISTECH", 5850, "salario");
    if (idx % 4 === 1) add(ym, 18, "acc-nu", "PIX RECEBIDO FREELA", r2(between(450, 900)), "renda-extra");
    // Fixos
    add(ym, 10, "acc-itau", "ALUGUEL APTO", -1650, "moradia");
    add(ym, 12, "acc-itau", "ENEL ENERGIA", -r2(between(95, 160)), "moradia");
    add(ym, 14, "acc-itau", "VIVO FIBRA", -99.9, "moradia");
    add(ym, 2, "card-nu", "SPOTIFY", -21.9, "assinaturas");
    add(ym, 7, "card-nu", "NETFLIX.COM", -44.9, "assinaturas");
    add(ym, 9, "card-nu", "APPLE.COM/BILL ICLOUD", -4.9, "assinaturas");
    add(ym, 15, "card-inter", "SMART FIT", -119.9, "saude");
    add(ym, 16, "card-nu", "AMAZON PRIME", -19.9, "assinaturas");
    add(ym, 21, "card-inter", "ALURA CURSOS", -89.9, "educacao");
    if (idx >= 9) add(ym, 22, "card-nu", "MAX STREAMING", -34.9, "assinaturas");
    // Transferências internas e aportes
    add(ym, 6, "acc-itau", "TED MESMA TITULARIDADE NUBANK", -2200, "transferencia");
    add(ym, 6, "acc-nu", "TED RECEBIDA ITAU", 2200, "transferencia");
    add(ym, 7, "acc-nu", "APLICACAO XP INVESTIMENTOS", -900, "investimento");
    add(ym, 10, "acc-nu", "PAG FATURA NUBANK", -r2(between(1100, 1500)), "transferencia");
    // Variáveis
    const nMarket = 5 + Math.floor(rnd() * 4);
    for (let i = 0; i < nMarket; i++)
      add(ym, 1 + Math.floor(rnd() * 28), pick(["card-nu", "card-inter"]), pick(markets), -between(38, 230) * season, "mercado");
    const nFood = 7 + Math.floor(rnd() * 7);
    for (let i = 0; i < nFood; i++)
      add(ym, 1 + Math.floor(rnd() * 28), "card-nu", pick(food), -between(19, 78) * season, "alimentacao");
    const nUber = 8 + Math.floor(rnd() * 7);
    for (let i = 0; i < nUber; i++)
      add(ym, 1 + Math.floor(rnd() * 28), "card-nu", "UBER *TRIP", -between(11, 36), "transporte");
    if (rnd() > 0.3) add(ym, 1 + Math.floor(rnd() * 28), "card-inter", "DROGASIL", -between(28, 140), "saude");
    const nFun = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < nFun; i++)
      add(ym, 1 + Math.floor(rnd() * 28), pick(["card-nu", "card-inter"]), pick(fun), -between(35, 160), "lazer");
    const nShop = Math.floor(rnd() * 3);
    for (let i = 0; i < nShop; i++)
      add(ym, 1 + Math.floor(rnd() * 28), "card-inter", pick(shop), -between(60, 320), "compras");
    if (rnd() > 0.4) add(ym, 1 + Math.floor(rnd() * 28), "card-nu", pick(personal), -between(45, 190), "pessoal");
  });

  // Compra parcelada recente (para a tela de cartões)
  const notebookStart = addMonths(currentYm, -2);
  for (let i = 0; i < 3; i++) {
    add(addMonths(notebookStart, i), 4, "card-inter", `KABUM NOTEBOOK ${i + 1}/10`, -389.9, "compras", {
      installment: { number: i + 1, total: 10 },
    });
  }

  txs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // Saldos
  const cashFlowNu = txs.filter((t) => t.accountId === "acc-nu").reduce((s, t) => s + t.amount, 0);
  const cashFlowItau = txs.filter((t) => t.accountId === "acc-itau").reduce((s, t) => s + t.amount, 0);
  accounts[0].balance = r2(3120 + cashFlowNu * 0.04 + 1840);
  accounts[1].balance = r2(2380 + cashFlowItau * 0.02 + 960);
  const openCard = (id: string) =>
    -txs.filter((t) => t.accountId === id && t.date.startsWith(currentYm)).reduce((s, t) => s + t.amount, 0);
  accounts[2].balance = r2(openCard("card-nu"));
  accounts[3].balance = r2(openCard("card-inter") + 7 * 389.9);

  const investments: Investment[] = [
    { id: "inv-1", source: "pluggy", name: "CDB Nubank 102% CDI", type: "Renda fixa", institution: "Nubank", balance: 10642.18, amountOriginal: 9300, dueDate: `${today.getFullYear() + 1}-08-15`, rateLabel: "102% CDI", return12m: 0.1392 },
    { id: "inv-2", source: "pluggy", name: "Tesouro Selic 2029", type: "Tesouro Direto", institution: "XP Investimentos", balance: 8915.4, amountOriginal: 7900, dueDate: "2029-03-01", rateLabel: "Selic + 0,05%", return12m: 0.1364 },
    { id: "inv-3", source: "pluggy", name: "Tesouro IPCA+ 2035", type: "Tesouro Direto", institution: "XP Investimentos", balance: 4210.77, amountOriginal: 4000, dueDate: "2035-05-15", rateLabel: "IPCA + 7,12%", return12m: 0.0811 },
    { id: "inv-4", source: "pluggy", name: "LCI Inter 94% CDI", type: "Renda fixa", institution: "Inter", balance: 3504.6, amountOriginal: 3200, dueDate: `${today.getFullYear() + 1}-02-10`, rateLabel: "94% CDI · isento", return12m: 0.1271 },
    { id: "inv-5", source: "pluggy", name: "HGLG11", type: "FII", institution: "XP Investimentos", balance: 2398.8, amountOriginal: 2250, rateLabel: "15 cotas", return12m: 0.1048 },
    { id: "inv-6", source: "pluggy", name: "MXRF11", type: "FII", institution: "XP Investimentos", balance: 1471.5, amountOriginal: 1500, rateLabel: "150 cotas", return12m: 0.0612 },
    { id: "inv-7", source: "b3", name: "BOVA11", type: "Ações e ETFs", institution: "XP Investimentos", balance: 2794.2, amountOriginal: 2600, rateLabel: "20 cotas", return12m: 0.0934 },
    { id: "inv-8", source: "pluggy", name: "Trend DI Simples", type: "Fundos", institution: "XP Investimentos", balance: 1286.33, amountOriginal: 1150, rateLabel: "Fundo DI", return12m: 0.1318 },
  ];

  // Série de patrimônio (12 meses) e índices carteira × CDI
  const investedNow = investments.reduce((s, i) => s + i.balance, 0);
  const cashNow = accounts.filter((a) => a.type === "BANK").reduce((s, a) => s + a.balance, 0);
  const debtNow = accounts.filter((a) => a.type === "CREDIT").reduce((s, a) => s + a.balance, 0);
  const cdiMonthly = 0.0108;
  const netWorth: NetWorthPoint[] = months.slice(1).map((ym, i, arr) => {
    const back = arr.length - 1 - i;
    const inv = investedNow / Math.pow(1.0125, back) - 900 * back * 0.92;
    const cash = cashNow - back * 38 + Math.sin(i) * 240;
    const debt = debtNow * (0.85 + 0.25 * Math.abs(Math.sin(i * 1.7)));
    const cdiIndex = Math.pow(1 + cdiMonthly, i);
    const portfolioIndex = Math.pow(1 + cdiMonthly * 0.97, i) * (1 + 0.006 * Math.sin(i * 1.3));
    return {
      month: ym,
      cash: r2(cash),
      investments: r2(inv),
      cardDebt: r2(debt),
      netWorth: r2(cash + inv - debt),
      invested: r2(investedNow - 900 * back),
      cdiIndex,
      portfolioIndex,
    };
  });

  const goals: Goal[] = [
    { id: "g-reserva", name: "Reserva de emergência", target: 0, targetDate: `${today.getFullYear() + 1}-06-30`, current: r2(investments[1].balance + investments[0].balance), isEmergencyFund: true, note: "Tesouro Selic + CDB Nubank" },
    { id: "g-japao", name: "Viagem para o Japão", target: 18000, targetDate: `${today.getFullYear() + 1}-09-01`, current: r2(investments[3].balance + 2650), note: "LCI Inter + caixinha" },
    { id: "g-notebook", name: "Notebook novo", target: 7000, targetDate: `${today.getFullYear() + 1}-03-01`, current: 2380, note: "Valor atualizado à mão" },
    { id: "g-curso", name: "Pós em Engenharia de Software", target: 9600, targetDate: `${today.getFullYear() + 2}-02-01`, current: 1286.33, note: "Fundo DI" },
  ];

  const syncRuns: SyncRun[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lastSync);
    d.setDate(d.getDate() - i);
    return {
      id: `sync-${i}`,
      startedAt: iso(d),
      durationMs: Math.round(between(9000, 24000)),
      status: i === 3 ? "partial" : "ok",
      records: Math.round(between(8, 46)),
      note: i === 3 ? "Inter: OUTDATED — tentou de novo no dia seguinte" : undefined,
    };
  });

  return {
    today: today.toISOString().slice(0, 10),
    currentYm,
    months,
    connections,
    accounts,
    transactions: txs,
    categories: CATEGORIES,
    budgets: BUDGETS,
    rules: RULES,
    investments,
    netWorth,
    goals,
    syncRuns,
    lastSyncAt: iso(lastSync),
  };
}

export type MockData = ReturnType<typeof buildMock>;

export type { AiReport };
