import "server-only";

/**
 * CDI diário (série 12 do SGS do Banco Central), em % ao dia.
 * Devolve o fator acumulado por mês (YYYY-MM → 1,0108 = +1,08% no mês).
 * API pública e gratuita, sem chave.
 */
export async function fetchCdiMonthly(fromYm: string): Promise<Map<string, number> | null> {
  const [y, m] = fromYm.split("-");
  const today = new Date();
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  const url =
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json` +
    `&dataInicial=01/${m}/${y}&dataFinal=${fmt(today)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const rows = (await res.json()) as { data: string; valor: string }[];
    const out = new Map<string, number>();
    for (const r of rows) {
      const [dd, mm, yyyy] = r.data.split("/");
      void dd;
      const ym = `${yyyy}-${mm}`;
      out.set(ym, (out.get(ym) ?? 1) * (1 + Number(r.valor) / 100));
    }
    return out.size ? out : null;
  } catch {
    return null;
  }
}
