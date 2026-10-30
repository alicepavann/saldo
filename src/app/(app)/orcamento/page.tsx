import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { pickMonth, type SearchParams } from "@/lib/period";
import { BudgetView } from "./view";

export const metadata: Metadata = { title: "Orçamento" };

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const d = await getData();
  const m = pickMonth((await searchParams).m, d.months.slice(-6), d.currentYm);
  return (
    <BudgetView
      transactions={d.transactions}
      categories={d.categories}
      budgets={d.budgets}
      months={d.months.slice(-6).reverse()}
      today={d.today}
      initialMonth={m}
      key={m}
    />
  );
}
