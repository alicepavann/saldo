import "server-only";
import { cache } from "react";
import { addMonths } from "./format";
import { buildMock } from "./mock";
import { loadFromPluggy } from "./pluggy/fetch";
import { avgExpense, buildAiInput, emergencyFund, mockAiReport } from "./compute";

type Raw = Awaited<ReturnType<typeof loadFromPluggy>>;

/**
 * Cache em memória do servidor: a Pluggy atualiza no máximo 1x/dia (Meu Pluggy),
 * então não faz sentido buscar tudo a cada clique. "Sincronizar" limpa o cache.
 */
const TTL_MS = 15 * 60 * 1000;
const g = globalThis as unknown as { __pluggyCache?: { at: number; data: Promise<Raw> } };

export function clearDataCache() {
  g.__pluggyCache = undefined;
}

async function loadRaw(): Promise<Raw & { source: "mock" | "pluggy" }> {
  const source = (process.env.DATA_SOURCE ?? "mock") === "pluggy" ? "pluggy" : "mock";
  if (source === "mock") {
    return { ...buildMock(new Date()), cdiIsReal: false, warnings: [], source };
  }
  const hit = g.__pluggyCache;
  if (!hit || Date.now() - hit.at > TTL_MS) {
    const data = loadFromPluggy();
    g.__pluggyCache = { at: Date.now(), data };
    data.catch(() => clearDataCache());
  }
  return { ...(await g.__pluggyCache!.data), source };
}

/** Ponto único de acesso a dados para todas as telas. */
export const getData = cache(async () => {
  const d = await loadRaw();
  const goals = d.goals.map((x) => ({ ...x }));

  const emergencyMonths = 6;
  const avg6 = avgExpense(d.transactions, d.currentYm, 6);
  const reserveGoal = goals.find((x) => x.isEmergencyFund)!;
  const emergency = emergencyFund(avg6, reserveGoal.current, emergencyMonths);
  reserveGoal.target = emergency.target;

  const reports = [1, 2, 3].map((i) => {
    const ym = addMonths(d.currentYm, -i);
    const input = buildAiInput({
      ym,
      txs: d.transactions,
      categories: d.categories,
      budgets: d.budgets,
      investments: d.investments,
      netWorth: d.netWorth,
    });
    return mockAiReport(ym, input, "auto", `${addMonths(ym, 1)}-01T09:02:00.000Z`);
  });

  return { ...d, goals, emergency, emergencyMonths, avg6, reports };
});

export type AppData = Awaited<ReturnType<typeof getData>>;
