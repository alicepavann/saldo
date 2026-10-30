const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});


const pct = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
export const MONTHS_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
];

export function money(v: number) {
  return brl.format(v);
}

/**
 * Formato compacto feito à mão: Intl com notation "compact" varia entre
 * Node e navegador (ICU diferente) e quebra a hidratação.
 */
export function moneyCompact(v: number) {
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  const one = (n: number) => n.toFixed(n >= 100 ? 0 : 1).replace(".", ",").replace(/,0$/, "");
  if (a >= 1e6) return `${sign}R$ ${one(a / 1e6)} mi`;
  if (a >= 1e3) return `${sign}R$ ${one(a / 1e3)} mil`;
  return `${sign}R$ ${Math.round(a)}`;
}

export function percent(v: number) {
  return pct.format(v);
}

export function signedPercent(v: number) {
  const s = pct.format(Math.abs(v));
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s;
}

/** "2026-10" → "outubro de 2026" */
export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} de ${y}`;
}

/** "2026-10" → "out" */
export function monthShort(ym: string) {
  const m = Number(ym.slice(5, 7));
  return MONTHS_SHORT[m - 1];
}

/** "2026-10-28" → "28 out" */
export function dayShort(d: string) {
  const m = Number(d.slice(5, 7));
  return `${Number(d.slice(8, 10))} ${MONTHS_SHORT[m - 1]}`;
}

/** "2026-10-28" → "28/10/2026" */
export function dateBr(d: string) {
  return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
}

export function dateTimeBr(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function ymOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function addMonths(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return ymOf(d);
}
