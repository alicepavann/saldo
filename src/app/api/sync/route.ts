import { NextResponse } from "next/server";
import { clearDataCache } from "@/lib/data";
import { isAuthed } from "@/lib/auth";

/**
 * "Sincronizar agora": descarta o cache do servidor para a próxima tela
 * buscar tudo de novo na Pluggy. (Com o Meu Pluggy não dá para forçar o
 * banco a atualizar; a Pluggy faz isso sozinha a cada 24h.)
 * Na Fase 2 esta rota passa a exigir sessão e a gravar no Supabase.
 */
export async function POST(req: Request) {
  if (!(await isAuthed(req))) return NextResponse.json({ error: "Entre de novo." }, { status: 401 });
  clearDataCache();
  return NextResponse.json({ ok: true });
}
