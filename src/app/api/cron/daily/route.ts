import { NextResponse } from "next/server";
import { clearDataCache, getData } from "@/lib/data";

/**
 * Chamado pela Vercel Cron 1x/dia (vercel.json), protegido por CRON_SECRET.
 * Hoje: descarta o cache e busca tudo de novo na Pluggy, para a primeira
 * visita do dia já abrir rápido. Na Fase 2: grava no Supabase e, no dia 1,
 * gera o resumo do mês.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  clearDataCache();
  try {
    const d = await getData();
    return NextResponse.json({ ok: true, transacoes: d.transactions.length, avisos: d.warnings });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
