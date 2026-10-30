import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { getData } from "@/lib/data";

/** Busca de transações para a paleta (Ctrl+K). */
export async function GET(req: Request) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "Entre de novo." }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });
  const d = await getData();
  const cat = new Map(d.categories.map((c) => [c.id, c.name]));
  const results = d.transactions
    .filter((t) => t.description.toLowerCase().includes(q) || cat.get(t.categoryId)?.toLowerCase().includes(q))
    .slice(0, 8)
    .map((t) => ({
      id: t.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      category: cat.get(t.categoryId) ?? "",
    }));
  return NextResponse.json({ results });
}
