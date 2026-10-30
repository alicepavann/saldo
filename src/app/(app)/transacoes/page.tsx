import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { pickMonth, str, type SearchParams } from "@/lib/period";
import { TransactionsView, type Kind } from "./view";

export const metadata: Metadata = { title: "Transações" };

const KINDS: Record<string, Kind> = { saidas: "out", entradas: "in", internas: "internal", tudo: "all" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = await getData();
  const sp = await searchParams;
  const months = d.months.slice().reverse();
  const month = pickMonth(sp.m, d.months, d.currentYm);
  const cat = str(sp.cat);
  const initial = {
    month,
    q: str(sp.q),
    category: cat && d.categories.some((c) => c.id === cat) ? cat : undefined,
    kind: KINDS[str(sp.tipo) ?? ""] ?? (cat ? "all" : undefined),
  };
  return (
    <TransactionsView
      key={JSON.stringify(initial)}
      transactions={d.transactions}
      categories={d.categories}
      accounts={d.accounts.map((a) => ({ id: a.id, name: a.name }))}
      months={months}
      initial={initial}
    />
  );
}
