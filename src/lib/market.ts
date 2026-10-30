import "server-only";

/**
 * Indicadores públicos do Banco Central (SGS), sem chave:
 *  - 4389: CDI anualizado (base 252), % a.a.
 *  - 432:  meta da Selic, % a.a.
 *  - 13522: IPCA acumulado em 12 meses, %
 * Em caso de falha, o campo vem null e a tela avisa.
 */
export interface Market {
  cdi: number | null; // fração a.a.
  selic: number | null;
  ipca12m: number | null;
  asOf: string | null; // dd/mm/aaaa do dado mais recente
}

async function last(series: number) {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${series}/dados/ultimos/1?formato=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(String(res.status));
  const [row] = (await res.json()) as { data: string; valor: string }[];
  return { value: Number(row.valor.replace(",", ".")) / 100, date: row.data };
}

const g = globalThis as unknown as { __market?: { at: number; data: Promise<Market> } };

export function getMarket(): Promise<Market> {
  if (g.__market && Date.now() - g.__market.at < 6 * 3600 * 1000) return g.__market.data;
  const data = Promise.allSettled([last(4389), last(432), last(13522)]).then(([c, s, i]) => {
    const v = (r: PromiseSettledResult<{ value: number; date: string }>) =>
      r.status === "fulfilled" && Number.isFinite(r.value.value) ? r.value.value : null;
    const asOf = [c, s].find((r) => r.status === "fulfilled") as
      | PromiseFulfilledResult<{ value: number; date: string }>
      | undefined;
    return { cdi: v(c), selic: v(s), ipca12m: v(i), asOf: asOf?.value.date ?? null };
  });
  g.__market = { at: Date.now(), data };
  return data;
}
