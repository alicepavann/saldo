import "server-only";
import { PluggyClient, type Category as PCategory } from "pluggy-sdk";
import { addMonths, ymOf } from "../format";
import { BUDGETS, CATEGORIES } from "../mock";
import { fetchCdiMonthly } from "../cdi";
import type { Account, CategoryRule, Connection, Goal, Investment, SyncRun, Transaction } from "../types";
import { institutionNameFrom, isMeuPluggy, mapAccount, mapInvestment, mapItem, mapTransaction } from "./map";
import { rebuildNetWorth } from "./history";

export class SetupError extends Error {
  constructor(
    message: string,
    public hint: string,
  ) {
    super(message);
  }
}

function env() {
  const clientId = process.env.PLUGGY_CLIENT_ID?.trim();
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET?.trim();
  const itemIds = (process.env.PLUGGY_ITEM_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!clientId || !clientSecret) {
    throw new SetupError(
      "Faltam as credenciais da Pluggy.",
      "Preencha PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no arquivo .env.local e reinicie o npm run dev.",
    );
  }
  if (!itemIds.length) {
    throw new SetupError(
      "Nenhuma conexão cadastrada.",
      "Conecte seus bancos em meu.pluggy.ai, copie os Item IDs no Dashboard da Pluggy (Aplicação › Ir para Demo › ⋯ › copiar Item ID) e coloque em PLUGGY_ITEM_IDS no .env.local, separados por vírgula.",
    );
  }
  return { clientId, clientSecret, itemIds };
}

function explain(err: unknown, what: string): never {
  // O SDK lança HTTPError (got) com response.statusCode, ou objetos { code, message }.
  const e = err as { code?: number | string; status?: number; message?: string; response?: { statusCode?: number; body?: unknown } };
  const code = e?.response?.statusCode ?? e?.status ?? (typeof e?.code === "number" ? e.code : undefined);
  if (code === 401 || code === 403) {
    throw new SetupError(
      "A Pluggy recusou as credenciais.",
      "Confira PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no .env.local (sem espaços ou aspas). Se você gerou um secret novo, use o novo.",
    );
  }
  if (code === 404) {
    throw new SetupError(
      `Não encontrei ${what}.`,
      "Confira se o Item ID está certo e se pertence à mesma aplicação do Client ID.",
    );
  }
  throw new SetupError(
    `Erro ao falar com a Pluggy (${what}).`,
    e?.message ? String(e.message).slice(0, 300) : "Tente de novo em alguns minutos.",
  );
}

export async function loadFromPluggy(today = new Date()) {
  const { clientId, clientSecret, itemIds } = env();
  const client = new PluggyClient({ clientId, clientSecret });
  const started = Date.now();

  const currentYm = ymOf(today);
  const months = Array.from({ length: 13 }, (_, i) => addMonths(currentYm, i - 12));
  const dateFrom = `${months[0]}-01`;

  // Categorias da Pluggy (para traduzir para as nossas)
  const pCategories = new Map<string, PCategory>();
  try {
    const cats = await client.fetchCategories();
    for (const c of cats.results) pCategories.set(c.id, c);
  } catch (err) {
    explain(err, "as categorias");
  }

  const connections: Connection[] = [];
  const accounts: Account[] = [];
  const transactions: Transaction[] = [];
  const investments: Investment[] = [];
  const warnings: string[] = [];

  for (const itemId of itemIds) {
    let item;
    try {
      item = await client.fetchItem(itemId);
    } catch (err) {
      explain(err, `o Item ${itemId.slice(0, 8)}…`);
    }
    const conn = mapItem(item);
    const accs = await client.fetchAccounts(itemId).catch(() => null);
    const inv = await client.fetchInvestments(itemId, undefined, { pageSize: 500 }).catch(() => null);
    // Conexões feitas pelo Meu Pluggy chegam todas como "MeuPluggy": tenta
    // achar o nome do banco pelas contas ou pelos investimentos.
    if (isMeuPluggy(item.connector?.id, conn.institution)) {
      conn.institution = institutionNameFrom(
        (accs?.results ?? []).map((a) => a.marketingName || a.name),
        (inv?.results ?? []).map((i) => i.institution?.name),
        connections.length + 1,
      );
    }
    connections.push(conn);

    if (!accs) warnings.push(`${conn.institution}: não consegui ler as contas`);
    for (const a of accs?.results ?? []) {
      const acc = mapAccount(a, conn.institution);
      accounts.push(acc);
      try {
        const txs = await client.fetchAllTransactions(a.id, { dateFrom });
        for (const t of txs) transactions.push(mapTransaction(t, acc.type, pCategories));
      } catch {
        warnings.push(`${conn.institution}: não consegui ler as transações de ${acc.name}`);
      }
    }

    // Muitas instituições não compartilham investimentos: ausência não é erro.
    for (const i of inv?.results ?? []) {
      const m = mapInvestment(i, conn.institution);
      if (m) investments.push(m);
    }
  }

  transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const cdi = await fetchCdiMonthly(months[1]);
  const { series: netWorth, cdiIsReal } = rebuildNetWorth({
    months: months.slice(1),
    accounts,
    transactions,
    investments,
    cdiMonthly: cdi,
  });

  // Reserva = saldo em conta + renda fixa/Tesouro (liquidez razoável). Ajustável na Fase 2b.
  const reserveCurrent =
    accounts.filter((a) => a.type === "BANK").reduce((s, a) => s + Math.max(0, a.balance), 0) +
    investments
      .filter((i) => i.type === "Renda fixa" || i.type === "Tesouro Direto")
      .reduce((s, i) => s + i.balance, 0);

  const goals: Goal[] = [
    {
      id: "g-reserva",
      name: "Reserva de emergência",
      target: 0,
      targetDate: `${today.getFullYear() + 1}-12-31`,
      current: Math.round(reserveCurrent * 100) / 100,
      isEmergencyFund: true,
      note: "Saldo em conta + renda fixa e Tesouro",
    },
  ];

  const lastSyncAt = connections
    .map((c) => c.lastUpdatedAt)
    .sort()
    .at(0) ?? new Date().toISOString();

  const syncRuns: SyncRun[] = [
    {
      id: "now",
      startedAt: new Date(started).toISOString(),
      durationMs: Date.now() - started,
      status: warnings.length ? "partial" : "ok",
      records: transactions.length + accounts.length + investments.length,
      note: warnings.join(" · ") || undefined,
    },
  ];

  return {
    today: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
    currentYm,
    months,
    connections,
    accounts,
    transactions,
    categories: CATEGORIES,
    budgets: BUDGETS,
    rules: [] as CategoryRule[],
    investments,
    netWorth,
    goals,
    syncRuns,
    lastSyncAt,
    cdiIsReal,
    warnings,
  };
}
