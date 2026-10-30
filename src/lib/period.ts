/** Período global: ?m=AAAA-MM na URL, compartilhado entre Início, Transações e Orçamento. */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function pickMonth(raw: string | string[] | undefined, months: string[], fallback: string) {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && /^\d{4}-\d{2}$/.test(v) && months.includes(v) ? v : fallback;
}

export function str(raw: string | string[] | undefined) {
  return (Array.isArray(raw) ? raw[0] : raw) ?? undefined;
}

/** Monta um link preservando o mês selecionado. */
export function withMonth(path: string, m: string, current: string, extra: Record<string, string> = {}) {
  const q = new URLSearchParams(extra);
  if (m !== current) q.set("m", m);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}
